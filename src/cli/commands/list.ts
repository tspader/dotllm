import { Config } from "../../config.ts";
import { table } from "../../shared/layout.ts";
import { defaultTheme } from "../../shared/theme.ts";
import type { CommandDef } from "../../shared/yargs.ts";

export namespace ListCommand {
  export function run(): void {
    const global = Config.readGlobal();

    if (global.repos.length === 0) {
      console.log(defaultTheme.dim("(no repos registered)"));
      console.log(defaultTheme.dim("use `dotllm add <path>` to register one"));
      return;
    }

    const local = Config.readLocal();
    const linked = new Set(local.refs);

    table(
      ["name", "path", "description", "linked"],
      [
        global.repos.map((r) => r.name),
        global.repos.map((r) => r.path),
        global.repos.map((r) => r.description),
        global.repos.map((r) => linked.has(r.name) ? "yes" : ""),
      ],
      {
        flex: [0, 1, 1, 0],
        noTruncate: [true, false, false, true],
        truncate: ["end", "start", "end", "end"],
        format: [
          (s) => defaultTheme.primary(s),
          (s) => defaultTheme.dim(s),
          (s) => s,
          (s) => s.trim() === "yes" ? defaultTheme.success(s) : defaultTheme.dim(s),
        ],
      },
    );
  }
}

export const list: CommandDef = {
  description: "List all registered repos",
  summary: "Show the global registry",
  handler: () => {
    ListCommand.run();
  },
};
