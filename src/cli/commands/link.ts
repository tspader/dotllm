import * as prompts from "@clack/prompts";
import { Config, link, type SyncResult } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import type { CommandDef } from "@spader/dotllm/cli/yargs";

function printResult(result: SyncResult): void {
  for (const name of result.removed) {
    prompts.log.step(`unlinked ${t.primary(name)} -> ${t.link(`.llm/reference/${name}`)}`);
  }
  for (const name of result.linked) {
    prompts.log.step(`linked ${t.primary(name)} -> ${t.link(`.llm/reference/${name}`)}`);
  }
}

export const command: CommandDef = {
  description: "Interactively select repos to symlink into .llm/reference/",
  summary: "Select and link references",
  handler: async () => {
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
