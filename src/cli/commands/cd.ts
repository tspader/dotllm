import path from "path";
import fs from "fs";
import { Config } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import type { Command } from "@spader/dotllm/cli/yargs";

export const command: Command = {
  description: "Open a subshell in a repo's store directory",
  summary: "cd into a repo",
  positionals: {
    name: {
      type: "string",
      description: "Name of the repo",
      required: true,
    },
  },
  handler: async (argv) => {
    const name = String(argv.name);
    const global = Config.Global.read();
    const repo = Config.Global.find(global, name);

    if (!repo) {
      console.error(t.error(`No repo named "${name}" in registry`));
      process.exit(1);
      return;
    }

    const dir = path.join(Config.storeDir(), name);
    if (!fs.existsSync(dir)) {
      console.error(t.error(`Store path does not exist: ${dir}`));
      process.exit(1);
      return;
    }

    const shell = process.env.SHELL ?? "/bin/sh";
    const proc = Bun.spawn([shell], {
      cwd: dir,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const code = await proc.exited;
    process.exit(code);
  },
};
