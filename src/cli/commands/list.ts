import * as prompts from "@clack/prompts";
import { Config } from "@spader/dotllm/core";
import { table } from "@spader/dotllm/cli/layout";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import type { CommandDef } from "@spader/dotllm/cli/yargs";

export const command: CommandDef = {
  description: "List all registered repos",
  summary: "Show the registry",
  handler: () => {
    prompts.intro("dotllm list");
    const global = Config.Global.read();

    if (global.repos.length === 0) {
      console.log(t.dim("(no repos registered)"));
      console.log(t.dim("use `dotllm add <path>` to register one"));
      return;
    }

    const local = Config.Local.read();
    const linked = new Set(Object.keys(local.refs));

    table(
      ["name", "kind", "uri", "description", "linked"],
      [
        global.repos.map((r) => r.name),
        global.repos.map((r) => r.kind),
        global.repos.map((r) => r.uri),
        global.repos.map((r) => r.description),
        global.repos.map((r) => linked.has(r.name) ? "yes" : "no"),
      ],
      {
        flex: [0, 0, 1, 1, 0],
        noTruncate: [true, true, false, false, true],
        truncate: ["end", "end", "start", "end", "end"],
        format: [
          (s) => t.primary(s),
          (s) => s,
          (s) => t.link(s),
          (s) => s,
          (s) => s.trim() === "yes" ? t.success(s) : s,
        ],
      },
    );
  },
};
