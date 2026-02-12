import { Config } from "../../config.ts";
import { defaultTheme } from "../../shared/theme.ts";
import type { CommandDef } from "../../shared/yargs.ts";

export namespace RemoveCommand {
  export const positionals = {
    name: {
      type: "string" as const,
      description: "Name of the reference to remove",
      required: true,
    },
  };

  export function run(argv: Record<string, unknown>): void {
    const name = String(argv.name ?? "");
    const global = Config.readGlobal();
    const found = Config.findRepo(global, name);

    if (!found) {
      console.error(defaultTheme.error(`No repo named "${name}" in registry`));
      process.exit(1);
    }

    const updated = Config.removeRepo(global, name);
    Config.writeGlobal(updated);

    console.log(`${defaultTheme.success("removed")} ${defaultTheme.primary(name)}`);
  }
}

export const remove: CommandDef = {
  description: "Remove a repo from the global registry",
  summary: "Remove a registered repo",
  positionals: RemoveCommand.positionals,
  handler: (argv) => {
    RemoveCommand.run(argv);
  },
};
