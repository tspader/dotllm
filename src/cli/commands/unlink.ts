import fs from "fs";
import path from "path";
import { Config } from "../../config.ts";
import { defaultTheme } from "../../shared/theme.ts";
import type { CommandDef } from "../../shared/yargs.ts";

export namespace UnlinkCommand {
  export const positionals = {
    name: {
      type: "string" as const,
      description: "Name of the reference to unlink",
      required: true,
    },
  };

  export function run(argv: Record<string, unknown>): void {
    const name = String(argv.name ?? "");
    const refDir = Config.refDir();
    const target = path.join(refDir, name);

    if (!fs.existsSync(target)) {
      console.error(defaultTheme.error(`No symlink found: ${target}`));
      process.exit(1);
    }

    fs.unlinkSync(target);

    const local = Config.readLocal();
    const refs = local.refs.filter((r) => r !== name);
    Config.writeLocal({ refs });

    console.log(`${defaultTheme.success("unlinked")} ${defaultTheme.primary(name)}`);
  }
}

export const unlink: CommandDef = {
  description: "Remove a symlink from .llm/reference/",
  summary: "Unlink a reference",
  positionals: UnlinkCommand.positionals,
  handler: (argv) => {
    UnlinkCommand.run(argv);
  },
};
