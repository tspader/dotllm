import fs from "fs";
import path from "path";
import { Config, type RepoEntry } from "dotllm/core/config";

function isUrl(value: string): boolean {
  return value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("git@") ||
    value.startsWith("ssh://");
}

function nameFromGitRemote(dir: string): string | null {
  const result = Bun.spawnSync(["git", "remote", "get-url", "origin"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) return null;
  const url = result.stdout.toString().trim();
  return nameFromUrl(url);
}

function nameFromUrl(url: string): string {
  const base = url.split("/").pop() ?? url;
  return base.replace(/\.git$/, "");
}

export type AddResult = {
  ok: true;
  entry: RepoEntry;
  storePath: string;
} | {
  ok: false;
  error: string;
};

export async function add(uri: string, name?: string, description?: string): Promise<AddResult> {
  const desc = description ?? "";

  if (isUrl(uri)) {
    return cloneUrl(uri, name, desc);
  }

  return linkLocal(uri, name, desc);
}

async function cloneUrl(url: string, name: string | undefined, description: string): Promise<AddResult> {
  const resolved = name ?? nameFromUrl(url);
  const store = Config.storeDir();
  fs.mkdirSync(store, { recursive: true });

  const target = path.join(store, resolved);

  if (!fs.existsSync(target)) {
    const proc = Bun.spawn(["git", "clone", url, target], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await proc.exited;

    if (code !== 0) {
      const msg = await new Response(proc.stderr).text();
      return { ok: false, error: `git clone failed: ${msg.trim()}` };
    }
  }

  const entry: RepoEntry = { kind: "url", name: resolved, uri: url, description };
  const global = Config.Global.read();
  Config.Global.write(Config.Global.add(global, entry));

  return { ok: true, entry, storePath: target };
}

function linkLocal(raw: string, name: string | undefined, description: string): AddResult {
  const resolved = path.resolve(raw);

  if (!fs.existsSync(resolved)) {
    return { ok: false, error: `Path does not exist: ${resolved}` };
  }

  if (!fs.statSync(resolved).isDirectory()) {
    return { ok: false, error: `Not a directory: ${resolved}` };
  }

  const store = Config.storeDir();
  fs.mkdirSync(store, { recursive: true });

  const finalName = name ?? nameFromGitRemote(resolved) ?? path.basename(resolved);
  const target = path.join(store, finalName);

  if (!fs.existsSync(target)) {
    fs.symlinkSync(resolved, target, "dir");
  }

  const entry: RepoEntry = { kind: "file", name: finalName, uri: resolved, description };
  const global = Config.Global.read();
  Config.Global.write(Config.Global.add(global, entry));

  return { ok: true, entry, storePath: target };
}
