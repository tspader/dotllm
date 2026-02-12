import { log } from "@clack/prompts";
import { sync } from "dotllm/core";
import { defaultTheme as t } from "dotllm/cli/theme";
import type { CommandDef } from "dotllm/cli/yargs";

export const command: CommandDef = {
  description: "Re-create symlinks from .llm/llm.json",
  summary: "Sync symlinks from local config",
  handler: () => {
    const result = sync();

    if (result.linked.length === 0 && result.removed.length === 0 && result.missing.length === 0 && result.unchanged.length === 0) {
      console.log(t.dim("(no refs in local config)"));
      console.log(t.dim("use `dotllm link` to select repos"));
      return;
    }

    for (const name of result.removed) {
      log.step(`removed stale ${t.primary(name)}`);
    }
    for (const name of result.missing) {
      log.warn(`${t.primary(name)} not in registry`);
    }
    for (const name of result.unchanged) {
      log.message(`exists ${t.primary(name)} -> ${t.link(`.llm/reference/${name}`)}`);
    }
    for (const name of result.linked) {
      log.step(`linked ${t.primary(name)} -> ${t.link(`.llm/reference/${name}`)}`);
    }
  },
};
