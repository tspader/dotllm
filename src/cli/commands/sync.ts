import * as prompts from "@clack/prompts";
import { pull, sync } from "dotllm/core";
import { defaultTheme as t } from "dotllm/cli/theme";
import type { CommandDef } from "dotllm/cli/yargs";

export const command: CommandDef = {
  description: "Re-create symlinks from .llm/dotllm.json",
  summary: "Sync symlinks from local config",
  handler: async () => {
    const result = sync();

    if (result.linked.length === 0 && result.removed.length === 0 && result.missing.length === 0 && result.unchanged.length === 0) {
      console.log(t.dim("(no refs in local config)"));
      console.log(t.dim("use `dotllm link` to select repos"));
      return;
    }

    for (const name of result.removed) {
      prompts.log.step(`removed stale ${t.primary(name)}`);
    }
    for (const name of result.missing) {
      prompts.log.warn(`${t.primary(name)} missing cache entry`);
    }
    for (const name of result.linked) {
      prompts.log.step(`linked ${t.primary(name)} -> ${t.link(`.llm/reference/${name}`)}`);
    }

    const refs = [...new Set([...result.unchanged, ...result.linked])];
    if (refs.length === 0) {
      return;
    }

    const spinner = prompts.spinner();
    spinner.start(`Pulling ${refs.length} linked repo${refs.length === 1 ? "" : "s"}`);

    const pulled = await pull(refs);
    if (pulled.failed.length > 0) {
      spinner.stop(t.error(`pull failed for ${pulled.failed.length} repo${pulled.failed.length === 1 ? "" : "s"}`), 1);
      process.exit(1);
      return;
    }

    spinner.stop(`${t.success("pulled")} ${pulled.count} repo${pulled.count === 1 ? "" : "s"}`);
  },
};
