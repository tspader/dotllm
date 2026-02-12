#!/usr/bin/env bun

import { build, type CliDef } from "../shared/yargs.ts";
import { add, remove, list, link, unlink, sync } from "./commands/index.ts";

export namespace DotLlmCli {
  export const def: CliDef = {
    name: "dotllm",
    description: "Manage git repo references symlinked into .llm/reference/",
    commands: {
      add,
      remove,
      list,
      link,
      unlink,
      sync,
    },
  };

  export function run(): void {
    build(def).parse();
  }
}

DotLlmCli.run();
