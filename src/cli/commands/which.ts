import path from "path";
import { Config } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import type { Command } from "@spader/dotllm/cli/yargs";

export const command: Command = {
  description: "Print the absolute path to a repo in the store (prefix match, shortest wins)",
  summary: "Show repo store path",
  positionals: {
    name: {
      type: "string",
      description: "Name (or prefix) of the repo",
      required: true,
    },
  },
  handler: (argv) => {
    const name = String(argv.name);
    const global = Config.Global.read();

    const exact = Config.Global.find(global, name);
    if (exact) {
      console.log(path.join(Config.storeDir(), exact.name));
      return;
    }

    const lower = name.toLowerCase();
    const matches = global.repos
      .filter((r) => r.name.toLowerCase().startsWith(lower))
      .sort((a, b) => a.name.length - b.name.length);

    if (matches.length === 0) {
      console.error(t.error(`No repo matching "${name}" in registry`));
      process.exit(1);
      return;
    }

    if (matches.length > 1 && matches[0]!.name.length === matches[1]!.name.length) {
      const names = matches.filter((m) => m.name.length === matches[0]!.name.length).map((m) => m.name);
      console.error(t.error(`Ambiguous prefix "${name}": ${names.join(", ")}`));
      process.exit(1);
      return;
    }

    console.log(path.join(Config.storeDir(), matches[0]!.name));
  },
};
