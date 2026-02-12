#!/usr/bin/env bun

import { build, type CliDef } from "dotllm/cli/yargs";
import { add, remove, list, link, sync } from "dotllm/cli/commands/index";

export namespace DotLlmCli {
  export const def: CliDef = {
    name: "dotllm",
    description: "Manage git repo references symlinked into .llm/reference/",
    commands: {
      add,
      remove,
      list,
      link,
      sync,
    },
  };

  export function run(): void {
    build(def).parse();
  }
}

DotLlmCli.run();
