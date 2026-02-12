import { log } from "@clack/prompts";
import { unlink } from "dotllm/core";
import { defaultTheme as t } from "dotllm/cli/theme";
import type { CommandDef } from "dotllm/cli/yargs";

export const command: CommandDef = {
  description: "Remove a reference symlink from .llm/reference/",
  summary: "Unlink a reference",
  positionals: {
    name: {
      type: "string",
      description: "Name of the reference to unlink",
      required: true,
    },
  },
  handler: (argv) => {
    const name = String(argv.name);

    const result = unlink(name);
    if (!result.ok) {
      log.error(t.error(result.error));
      process.exit(1);
      return;
    }

    log.step(`unlinked ${t.primary(name)} -> ${t.link(`.llm/reference/${name}`)}`);
  },
};
