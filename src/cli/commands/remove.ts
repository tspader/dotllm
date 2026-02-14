import * as prompts from "@clack/prompts";
import { remove } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import type { Command } from "@spader/dotllm/cli/yargs";

export const command: Command = {
  description: "Remove a repo from the registry",
  summary: "Remove a registered repo",
  positionals: {
    name: {
      type: "string",
      description: "Name of the reference to remove",
      required: true,
    },
  },
  handler: (argv) => {
    prompts.intro("dotllm remove");
    const name = String(argv.name);

    const result = remove(name);
    if (!result.ok) {
      prompts.log.error(t.error(result.error));
      process.exit(1);
      return;
    }

    prompts.log.step(`removed ${t.primary(name)}`);
  },
};
