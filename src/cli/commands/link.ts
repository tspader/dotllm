import * as prompts from "@clack/prompts";
import { Config, link, unlink, sync, type SyncResult } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import type { CommandDef } from "@spader/dotllm/cli/yargs";

function printResult(result: SyncResult): void {
  const parts: string[] = [];
  if (result.linked.length > 0) parts.push(`${result.linked.length} added`);
  if (result.removed.length > 0) parts.push(`${result.removed.length} removed`);
  if (result.unchanged.length > 0) parts.push(`${result.unchanged.length} unchanged`);
  if (parts.length === 0) return;
  prompts.log.step(parts.join(", "));
}

export const command: CommandDef = {
  description: "Interactively pick repos to link into .llm/reference/, or add/remove one by name",
  summary: "Link references",
  positionals: {
    name: {
      type: "string",
      description: "Name of the repo to link, or omit for interactive",
    },
  },
  options: {
    remove: {
      alias: "r",
      type: "boolean",
      description: "Remove the link instead of adding it",
    },
  },
  handler: async (argv) => {
    prompts.intro("dotllm link");
    const name = typeof argv.name === "string" && argv.name.length > 0 ? argv.name : undefined;
    const shouldRemove = argv.remove === true;

    if (name) {
      if (shouldRemove) {
        const result = unlink(name);
        if (!result.ok) {
          prompts.log.error(t.error(result.error));
          process.exit(1);
          return;
        }
        prompts.log.step(`unlinked ${t.primary(name)}`);
        return;
      }

      const global = Config.Global.read();
      const repo = Config.Global.find(global, name);
      if (!repo) {
        prompts.log.error(t.error(`No repo named "${name}" in registry`));
        process.exit(1);
        return;
      }

      const local = Config.Local.read();
      Config.Local.write(Config.Local.add(local, repo));
      printResult(sync());
      return;
    }

    const global = Config.Global.read();

    if (global.repos.length === 0) {
      console.log(t.dim("(no repos registered)"));
      console.log(t.dim("use `dotllm add <path>` to register one"));
      return;
    }

    const local = Config.Local.read();
    const current = new Set(Object.keys(local.refs));

    const selected = await prompts.multiselect({
      message: "Select repos to link into .llm/reference/",
      options: global.repos.map((r) => ({
        value: r.name,
        label: r.name,
        hint: r.uri,
      })),
      initialValues: global.repos
        .filter((r) => current.has(r.name))
        .map((r) => r.name),
      required: false,
    });

    if (prompts.isCancel(selected)) {
      prompts.cancel("cancelled");
      return;
    }

    const names = Array.isArray(selected)
      ? selected.filter((value): value is string => typeof value === "string")
      : [];

    printResult(link(names));
  },
};
