import fs from "fs";
import path from "path";
import * as prompts from "@clack/prompts";
import { Config } from "../../config.ts";
import { defaultTheme } from "../../shared/theme.ts";
import type { CommandDef } from "../../shared/yargs.ts";

export namespace LinkCommand {
  export async function run(): Promise<void> {
    const global = Config.readGlobal();

    if (global.repos.length === 0) {
      console.log(defaultTheme.dim("(no repos registered)"));
      console.log(defaultTheme.dim("use `dotllm add <path>` to register one"));
      return;
    }

    const local = Config.readLocal();
    const current = new Set(local.refs);

    const selected = await prompts.multiselect({
      message: "Select repos to link into .llm/reference/",
      options: global.repos.map((r) => ({
        value: r.name,
        label: r.name,
        hint: r.path,
      })),
      initialValues: global.repos
        .filter((r) => current.has(r.name))
        .map((r) => r.name),
      required: false,
    });

    if (prompts.isCancel(selected)) {
      console.log(defaultTheme.dim("cancelled"));
      return;
    }

    const names = selected as string[];
    const refDir = Config.refDir();
    fs.mkdirSync(refDir, { recursive: true });

    // Remove symlinks no longer selected
    for (const prev of current) {
      if (!names.includes(prev)) {
        const target = path.join(refDir, prev);
        if (fs.existsSync(target)) {
          fs.unlinkSync(target);
          console.log(`${defaultTheme.dim("unlinked")} ${defaultTheme.primary(prev)}`);
        }
      }
    }

    // Create new symlinks
    for (const name of names) {
      const repo = Config.findRepo(global, name);
      if (!repo) continue;

      const target = path.join(refDir, name);
      if (fs.existsSync(target)) continue;

      fs.symlinkSync(repo.path, target, "dir");
      console.log(`${defaultTheme.success("linked")} ${defaultTheme.primary(name)} ${defaultTheme.dim(repo.path)}`);
    }

    Config.writeLocal({ refs: names });
  }
}

export const link: CommandDef = {
  description: "Interactively select repos to symlink into .llm/reference/",
  summary: "Select and link references",
  handler: async () => {
    await LinkCommand.run();
  },
};
