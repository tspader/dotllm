import fs from "fs";
import os from "os";
import path from "path";
import { Config } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import type { Command } from "@spader/dotllm/cli/yargs";

const BASH = `_dotllm() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "add remove list link sync which completions" -- "\${cur}") )
    return
  fi

  case "\${COMP_WORDS[1]}" in
    which|link)
      local repos
      repos=$(dotllm completions --names 2>/dev/null)
      COMPREPLY=( $(compgen -W "\${repos}" -- "\${cur}") )
      ;;
  esac
}

complete -F _dotllm dotllm`;

const ZSH = `#compdef dotllm

_dotllm() {
  local -a commands
  commands=(
    'add:Register a new repo'
    'remove:Remove a repo from the registry'
    'list:Show the registry'
    'link:Link references'
    'sync:Sync linked repos'
    'which:Show repo store path'
    'completions:Output shell completions'
  )

  _arguments -C '1:command:->cmd' '*::arg:->args'

  case "$state" in
    cmd)
      _describe 'command' commands
      ;;
    args)
      case "\${words[1]}" in
        which|link)
          local -a repos
          repos=(\${(f)"$(dotllm completions --names 2>/dev/null)"})
          _describe 'repo' repos
          ;;
      esac
      ;;
  esac
}

_dotllm`;

const FISH = `complete -c dotllm -f
complete -c dotllm -n "__fish_use_subcommand" -a add -d "Register a new repo"
complete -c dotllm -n "__fish_use_subcommand" -a remove -d "Remove a repo from the registry"
complete -c dotllm -n "__fish_use_subcommand" -a list -d "Show the registry"
complete -c dotllm -n "__fish_use_subcommand" -a link -d "Link references"
complete -c dotllm -n "__fish_use_subcommand" -a sync -d "Sync linked repos"
complete -c dotllm -n "__fish_use_subcommand" -a which -d "Show repo store path"
complete -c dotllm -n "__fish_use_subcommand" -a completions -d "Output shell completions"
complete -c dotllm -n "__fish_seen_subcommand_from which link" -a "(dotllm completions --names 2>/dev/null)"`;

const CANARY = "@dotllm_completions";

function completionFile(shell: string): string {
  return path.join(path.dirname(Config.storeDir()), `completions.${shell}`);
}

function hookSnippet(shell: string): string {
  const file = completionFile(shell);
  switch (shell) {
    case "bash":
      return `\n# ${CANARY}\n# Installed by the dotllm CLI\n[ -f "${file}" ] && source "${file}"\n`;
    case "zsh":
      return `\n# ${CANARY}\n# Installed by the dotllm CLI\n[ -f "${file}" ] && source "${file}"\n`;
    case "fish":
      return `\n# ${CANARY}\n# Installed by the dotllm CLI\ntest -f "${file}"; and source "${file}"\n`;
    default:
      return "";
  }
}

function rcPath(shell: string): string | undefined {
  const home = os.homedir();
  switch (shell) {
    case "bash": {
      const bashrc = path.join(home, ".bashrc");
      if (fs.existsSync(bashrc)) return bashrc;
      return path.join(home, ".bash_profile");
    }
    case "zsh":
      return path.join(home, ".zshrc");
    case "fish":
      return path.join(home, ".config", "fish", "config.fish");
  }
}

const install: Command = {
  description: "Add completions to your shell rc file",
  summary: "Install completions",
  handler: async (argv) => {
    if (process.platform === "win32") {
      console.log(t.dim("Shell completions are not supported on Windows."));
      return;
    }

    const shell = detectShell();
    const rc = rcPath(shell);

    if (!rc) {
      console.error(t.error(`Could not determine rc file for shell: "${shell}"`));
      process.exit(1);
      return;
    }

    const script = shellScript(shell);
    if (!script) {
      console.error(t.error(`Unknown shell: "${shell}"`));
      process.exit(1);
      return;
    }

    const cached = completionFile(shell);
    fs.mkdirSync(path.dirname(cached), { recursive: true });
    fs.writeFileSync(cached, script + "\n");

    const existing = fs.existsSync(rc) ? fs.readFileSync(rc, "utf-8") : "";

    if (existing.includes(CANARY)) {
      console.log(t.dim(`Updated ${cached}`));
      console.log(t.dim(`Already sourced from ${rc}`));
      return;
    }

    fs.appendFileSync(rc, hookSnippet(shell));
    console.log(`Installed completions in ${t.link(rc)}`);
    console.log(t.dim(`Restart your shell or run: source ${rc}`));
  },
};

export const command: Command = {
  description: "Output shell completion script for bash, zsh, or fish",
  summary: "Shell completions",
  options: {
    shell: {
      alias: "s",
      type: "string",
      description: "Shell type: bash, zsh, or fish",
    },
    names: {
      type: "boolean",
      description: "Print repo names (used internally by completions)",
    },
  },
  commands: {
    install,
  },
  handler: async (argv) => {
    if (process.platform === "win32") {
      console.log(t.dim("Shell completions are not supported on Windows."));
      return;
    }

    if (argv.names) {
      const { Config } = await import("@spader/dotllm/core");
      const global = Config.Global.read();
      for (const r of global.repos) console.log(r.name);
      return;
    }

    const shell = typeof argv.shell === "string" && argv.shell.length > 0
      ? argv.shell
      : detectShell();

    switch (shell) {
      case "bash":
        console.log(BASH);
        break;
      case "zsh":
        console.log(ZSH);
        break;
      case "fish":
        console.log(FISH);
        break;
      default:
        console.error(t.error(`Unknown shell: "${shell}". Use bash, zsh, or fish.`));
        process.exit(1);
    }
  },
};

function shellScript(shell: string): string | undefined {
  switch (shell) {
    case "bash": return BASH;
    case "zsh": return ZSH;
    case "fish": return FISH;
  }
}

function detectShell(): string {
  const login = process.env.SHELL ?? "";
  if (login.endsWith("/fish")) return "fish";
  if (login.endsWith("/zsh")) return "zsh";
  return "bash";
}
