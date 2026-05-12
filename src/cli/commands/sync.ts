import * as prompts from "@clack/prompts";
import { pull, sync } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import { Prompt } from "@spader/dotllm/cli/prompt";
import type { Command } from "@spader/dotllm/cli/yargs";

export const command: Command = {
  description: "Re-create symlinks from .llm/dotllm.json",
  summary: "Sync symlinks from local config",
  options: {
    force: {
      alias: "f",
      type: "boolean",
      description: "Pull all repos regardless of recent access",
    },
  },
  handler: async (argv) => {
    prompts.intro("dotllm sync");
    const result = sync();

    if (result.linked.length === 0 && result.removed.length === 0 && result.missing.length === 0 && result.unchanged.length === 0) {
      console.log(t.dim("(no refs in local config)"));
      console.log(t.dim("use `dotllm link` to select repos"));
      return;
    }

    Prompt.sync(result);

    const refs = [...new Set([...result.unchanged, ...result.linked])];
    if (refs.length === 0) {
      return;
    }

    const force = argv.force === true;
    const spinner = prompts.spinner();
    spinner.start(`Checking ${refs.length} linked repo${refs.length === 1 ? "" : "s"}`);

    const pulled = await pull(refs, { force });
    if (pulled.failed.length > 0) {
      spinner.stop(t.error(`pull failed for ${pulled.failed.length} repo${pulled.failed.length === 1 ? "" : "s"}`));
      process.exit(1);
      return;
    }

    const parts: string[] = [];
    if (pulled.pulled.length > 0) parts.push(`${t.success("pulled")} ${pulled.pulled.length}`);
    if (pulled.skipped.length > 0) parts.push(t.dim(`${pulled.skipped.length} skipped`));
    spinner.stop(parts.length > 0 ? parts.join(" ") : t.dim("nothing to pull"));
  },
};
