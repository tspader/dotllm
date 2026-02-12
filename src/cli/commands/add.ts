import fs from "fs";
import path from "path";
import { Config } from "../../config.ts";
import { defaultTheme } from "../../shared/theme.ts";
import type { CommandDef } from "../../shared/yargs.ts";

export namespace AddCommand {
  export const positionals = {
    path: {
      type: "string" as const,
      description: "Path to a git repo directory",
      required: true,
    },
  };

  export const options = {
    name: {
      alias: "n",
      type: "string" as const,
      description: "Name for the reference (defaults to directory name)",
    },
    description: {
      alias: "d",
      type: "string" as const,
      description: "Description of the reference",
      default: "",
    },
  };

  export function run(argv: Record<string, unknown>): void {
    const raw = String(argv.path ?? "");
    const resolved = path.resolve(raw);

    if (!fs.existsSync(resolved)) {
      console.error(defaultTheme.error(`Path does not exist: ${resolved}`));
      process.exit(1);
    }

    if (!fs.statSync(resolved).isDirectory()) {
      console.error(defaultTheme.error(`Not a directory: ${resolved}`));
      process.exit(1);
    }

    const name = typeof argv.name === "string" && argv.name.length > 0
      ? argv.name
      : path.basename(resolved);
    const description = typeof argv.description === "string" ? argv.description : "";

    const global = Config.readGlobal();
    const updated = Config.addRepo(global, { name, path: resolved, description });
    Config.writeGlobal(updated);

    console.log(`${defaultTheme.success("added")} ${defaultTheme.primary(name)} ${defaultTheme.dim(resolved)}`);
  }
}

export const add: CommandDef = {
  description: "Register a git repo as a reference",
  summary: "Add a repo to the global registry",
  positionals: AddCommand.positionals,
  options: AddCommand.options,
  handler: (argv) => {
    AddCommand.run(argv);
  },
};
