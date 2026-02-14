import path from "path";
import { Config } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import type { Command } from "@spader/dotllm/cli/yargs";

export const command: Command = {
  description: "Print the absolute path to a repo in the store",
  summary: "Show repo store path",
  positionals: {
    name: {
      type: "string",
      description: "Name of the repo",
      required: true,
    },
  },
  handler: (argv) => {
    const name = String(argv.name);
    const global = Config.Global.read();
    const repo = Config.Global.find(global, name);

    if (!repo) {
      console.error(t.error(`No repo named "${name}" in registry`));
      process.exit(1);
      return;
    }

    console.log(path.join(Config.storeDir(), name));
  },
};
