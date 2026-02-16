import fs from "fs";
import path from "path";
import * as prompts from "@clack/prompts";
import { z } from "zod";
import { add, Config, sync } from "@spader/dotllm/core";
import { defaultTheme as t } from "@spader/dotllm/cli/theme";
import { Prompt } from "@spader/dotllm/cli/prompt";
import type { Command } from "@spader/dotllm/cli/yargs";

const RepoShape = z.object({
  description: z.string().nullable().optional(),
});

function isUrl(value: string): boolean {
  return value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("git@") ||
    value.startsWith("ssh://");
}

export function stem(value: string): string {
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

export function github(uri: string): { owner: string; repo: string } | null {
  return hosted(uri, "github.com");
}

export function codeberg(uri: string): { owner: string; repo: string } | null {
  return hosted(uri, "codeberg.org");
}

function hosted(uri: string, host: string): { owner: string; repo: string } | null {
  const escaped = host.replace(/\./g, "\\.");
  const https = uri.match(new RegExp(`^https?:\\/\\/${escaped}\\/([^/]+)\\/([^/]+?)(?:\\.git)?\\/?$`));
  if (https) {
    return { owner: https[1]!, repo: https[2]! };
  }

  const ssh = uri.match(new RegExp(`^ssh:\\/\\/git@${escaped}\\/([^/]+)\\/([^/]+?)(?:\\.git)?\\/?$`));
  if (ssh) {
    return { owner: ssh[1]!, repo: ssh[2]! };
  }

  const scp = uri.match(new RegExp(`^git@${escaped}:([^/]+)\\/([^/]+?)(?:\\.git)?$`));
  if (scp) {
    return { owner: scp[1]!, repo: scp[2]! };
  }

  return null;
}

async function apiDescription(url: string, accept: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept,
      "user-agent": "dotllm",
    },
  });
  if (!response.ok) return "";

  const raw = await response.json();
  const result = RepoShape.safeParse(raw);
  if (!result.success) return "";
  return result.data.description ?? "";
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
  const gh = github(uri);
  if (gh) {
    const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}`;
    return apiDescription(url, "application/vnd.github+json");
  }

  const cb = codeberg(uri);
  if (cb) {
    const url = `https://codeberg.org/api/v1/repos/${cb.owner}/${cb.repo}`;
    return apiDescription(url, "application/json");
  }

  return "";
}

async function prefill(uri: string): Promise<{ name: string; description: string }> {
  const remote = isUrl(uri);
  const git = remote ? "" : gitName(uri);
  const name = git.length > 0 ? git : stem(uri);
  const description = remote ? await remoteDescription(uri) : "";
  return { name, description };
}

async function interactive(namePrefill?: string, descPrefill?: string): Promise<void> {
  const uri = await prompts.text({
    message: "URL or local path to a git repo",
  });
  if (prompts.isCancel(uri)) return;

  const input = uri.trim();
  const seed = await prefill(input);

  const name = await prompts.text({
    message: "Name",
    initialValue: namePrefill ?? seed.name,
  });
  if (prompts.isCancel(name)) return;

  const description = await prompts.text({
    message: "Description",
    initialValue: descPrefill ?? seed.description,
  });
  if (prompts.isCancel(description)) return;

  await run(input, name || undefined, description || undefined);
}

function autoLink(name: string): void {
  const localFile = path.join(".llm", "dotllm.json");
  if (!fs.existsSync(localFile)) return;

  const local = Config.Local.read();
  if (Config.Local.has(local, name)) return;

  const global = Config.Global.read();
  const repo = Config.Global.find(global, name);
  if (!repo) return;

  Config.Local.write(Config.Local.add(local, repo));
  Prompt.sync(sync());
}

async function run(uri: string, name?: string, description?: string): Promise<void> {
  const spinner = prompts.spinner();
  spinner.start(`Adding ${uri}`);

  const needSeed = !name || !description;
  const seed = needSeed ? await prefill(uri) : { name: "", description: "" };
  const resolved = name ?? seed.name;
  const desc = description ?? seed.description;

  const result = await add(uri, resolved || undefined, desc || undefined);
  if (!result.ok) {
    spinner.stop(t.error(result.error), 1);
    process.exit(1);
    return;
  }

  spinner.stop(`${t.success("added")} ${t.primary(result.entry.name)} ${t.link(result.storePath)}`);
  autoLink(result.entry.name);
}

export const command: Command = {
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
    prompts.intro("dotllm add");
    const uri = typeof argv.uri === "string" && argv.uri.length > 0 ? argv.uri : undefined;
    const name = typeof argv.name === "string" && argv.name.length > 0 ? argv.name : undefined;
    const description = typeof argv.description === "string" && argv.description.length > 0 ? argv.description : undefined;

    if (!uri) {
      await interactive(name, description);
      return;
    }

    await run(uri, name, description);
  },
};
