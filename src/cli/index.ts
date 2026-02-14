#!/usr/bin/env bun

import { build, type Cli } from "@spader/dotllm/cli/yargs";
import { add, remove, list, link, sync, which, cd } from "@spader/dotllm/cli/commands/index";

export namespace DotLlmCli {
  export const def: Cli = {
    name: "dotllm",
    description: "Manage git repo references symlinked into .llm/reference/",
    commands: {
      add,
      remove,
      list,
      link,
      sync,
      which,
      cd,
    },
  };

  export function run(): void {
    build(def).parse();
  }
}

DotLlmCli.run();
