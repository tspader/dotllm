import { log } from "@clack/prompts";
import { remove } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import type { CommandDef } from "@spader/dotllm/cli/yargs";

export const command: CommandDef = {
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
    const name = String(argv.name);

    const result = remove(name);
    if (!result.ok) {
      log.error(t.error(result.error));
      process.exit(1);
      return;
    }

    log.step(`removed ${t.primary(name)}`);
  },
};
