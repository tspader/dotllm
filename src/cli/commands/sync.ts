import * as prompts from "@clack/prompts";
import { pull, sync } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import type { CommandDef } from "@spader/dotllm/cli/yargs";

export const command: CommandDef = {
  description: "Re-create symlinks from .llm/dotllm.json",
  summary: "Sync symlinks from local config",
  handler: async () => {
    prompts.intro("dotllm sync");
    const result = sync();

    if (result.linked.length === 0 && result.removed.length === 0 && result.missing.length === 0 && result.unchanged.length === 0) {
      console.log(t.dim("(no refs in local config)"));
      console.log(t.dim("use `dotllm link` to select repos"));
      return;
    }

    const parts: string[] = [];
    if (result.linked.length > 0) parts.push(`${result.linked.length} added`);
    if (result.removed.length > 0) parts.push(`${result.removed.length} removed`);
    if (result.unchanged.length > 0) parts.push(`${result.unchanged.length} unchanged`);
    if (result.missing.length > 0) parts.push(`${result.missing.length} missing`);
    if (parts.length > 0) prompts.log.step(parts.join(", "));

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
