import fs from "fs";
import path from "path";
import * as prompts from "@clack/prompts";
import { z } from "zod";
import { add } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import type { CommandDef } from "@spader/dotllm/cli/yargs";

const RepoShape = z.object({
  description: z.string().nullable().optional(),
});

function isUrl(value: string): boolean {
  return value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("git@") ||
    value.startsWith("ssh://");
}

function stem(value: string): string {
  const clean = value.trim().replace(/\/+$/, "");
  if (clean.length === 0) return "";

  if (clean.startsWith("git@")) {
    const raw = clean.split(":").slice(1).join(":");
    const seg = raw.split("/").filter(Boolean).pop() ?? raw;
    return seg.replace(/\.git$/, "");
  }

  if (isUrl(clean)) {
    const seg = clean.split("/").filter(Boolean).pop() ?? clean;
    const raw = seg.split("?")[0] ?? seg;
    const full = raw.split("#")[0] ?? raw;
    return full.replace(/\.git$/, "");
  }

  const base = path.basename(clean);
  const parsed = path.parse(base);
  if (parsed.name.length > 0) return parsed.name;
  return base;
}

function github(uri: string): { owner: string; repo: string } | null {
  const https = uri.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (https) {
    return { owner: https[1]!, repo: https[2]! };
  }

  const ssh = uri.match(/^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (ssh) {
    return { owner: ssh[1]!, repo: ssh[2]! };
  }

  const scp = uri.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (scp) {
    return { owner: scp[1]!, repo: scp[2]! };
  }

  return null;
}

function gitName(uri: string): string {
  const dir = path.resolve(uri);
  if (!fs.existsSync(dir)) return "";
  if (!fs.statSync(dir).isDirectory()) return "";

  const proc = Bun.spawnSync(["git", "remote", "get-url", "origin"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (proc.exitCode !== 0) return "";

  const out = proc.stdout.toString().trim();
  if (out.length === 0) return "";
  return stem(out);
}

async function remoteDescription(uri: string): Promise<string> {
  const repo = github(uri);
  if (!repo) return "";

  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "dotllm",
    },
  });
  if (!response.ok) return "";

  const raw = await response.json();
  const result = RepoShape.safeParse(raw);
  if (!result.success) return "";
  return result.data.description ?? "";
}

async function prefill(uri: string): Promise<{ name: string; description: string }> {
  const remote = isUrl(uri);
  const git = remote ? "" : gitName(uri);
  const name = git.length > 0 ? git : stem(uri);
  const description = remote ? await remoteDescription(uri) : "";
  return { name, description };
}

async function interactive(): Promise<void> {
  const uri = await prompts.text({
    message: "URL or local path to a git repo",
  });
  if (prompts.isCancel(uri)) return;

  const input = uri.trim();
  const seed = await prefill(input);

  const name = await prompts.text({
    message: "Name (leave empty to auto-detect)",
    defaultValue: seed.name,
  });
  if (prompts.isCancel(name)) return;

  const description = await prompts.text({
    message: "Description",
    defaultValue: seed.description,
  });
  if (prompts.isCancel(description)) return;

  await run(input, name || undefined, description || undefined);
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
