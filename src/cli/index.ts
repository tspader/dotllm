#!/usr/bin/env bun

import { build, type Cli } from "@spader/dotllm/cli/yargs";
import { add, remove, list, link, sync, which, completions } from "@spader/dotllm/cli/commands/index";

export namespace DotLlmCli {
  export async function run(): Promise<void> {
    const raw = await Bun.file(new URL("../../package.json", import.meta.url)).json() as { version?: unknown };
    const version = typeof raw.version === "string" ? raw.version : undefined;

    const def: Cli = {
      name: "dotllm",
      description: "Manage git repo references symlinked into .llm/reference/",
      version,
      commands: {
        add,
        remove,
        list,
        link,
        sync,
        which,
        completions,
      },
    };

    build(def).parse();
  }
}

await DotLlmCli.run();
