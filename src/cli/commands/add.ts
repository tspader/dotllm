import * as prompts from "@clack/prompts";
import { add } from "dotllm/core";
import { defaultTheme as t } from "dotllm/cli/theme";
import type { CommandDef } from "dotllm/cli/yargs";

async function interactive(): Promise<void> {
  const uri = await prompts.text({
    message: "URL or local path to a git repo",
  });
  if (prompts.isCancel(uri)) return;

  const name = await prompts.text({
    message: "Name (leave empty to auto-detect)",
    defaultValue: "",
  });
  if (prompts.isCancel(name)) return;

  const description = await prompts.text({
    message: "Description",
    defaultValue: "",
  });
  if (prompts.isCancel(description)) return;

  await run(uri, name || undefined, description || undefined);
}

async function run(uri: string, name?: string, description?: string): Promise<void> {
  const spinner = prompts.spinner();
  spinner.start(`Adding ${uri}`);

  const result = await add(uri, name, description);
  if (!result.ok) {
    spinner.stop(t.error(result.error), 1);
    process.exit(1);
    return;
  }

  spinner.stop(`${t.success("added")} ${t.primary(result.entry.name)} ${t.link(result.storePath)}`);
}

export const command: CommandDef = {
  description: "Register a git repo as a reference",
  summary: "Add a repo to the registry",
  positionals: {
    uri: {
      type: "string",
      description: "URL or local path to a git repo",
    },
  },
  options: {
    name: {
      alias: "n",
      type: "string",
      description: "Name override (defaults to repo name from git)",
    },
    description: {
      alias: "d",
      type: "string",
      description: "Description of the reference",
    },
  },
  handler: async (argv) => {
    const uri = typeof argv.uri === "string" && argv.uri.length > 0 ? argv.uri : undefined;

    if (!uri) {
      await interactive();
      return;
    }

    const name = typeof argv.name === "string" && argv.name.length > 0 ? argv.name : undefined;
    const description = typeof argv.description === "string" ? argv.description : undefined;
    await run(uri, name, description);
  },
};
