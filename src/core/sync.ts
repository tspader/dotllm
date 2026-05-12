import fs from "fs";
import path from "path";
import { Config } from "@spader/dotllm/core/config";

export type SyncResult = {
  linked: string[];
  removed: string[];
  missing: string[];
  unchanged: string[];
};

type PullState = {
  kind: "ok";
} | {
  kind: "skipped";
  name: string;
} | {
  kind: "failed";
  name: string;
  error: string;
};

export type PullError = {
  name: string;
  error: string;
};

export type PullResult = {
  count: number;
  pulled: string[];
  skipped: string[];
  failed: PullError[];
};

export type PullOptions = {
  force?: boolean;
};

const FRESH_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 7 * FRESH_MS;

function shouldPull(storeDir: string, force: boolean): boolean {
  if (force) return true;
  const head = path.join(storeDir, ".git", "HEAD");
  const headStat = fs.statSync(head, { throwIfNoEntry: false });
  if (!headStat) return true;

  const age = Date.now() - headStat.mtimeMs;
  if (age < FRESH_MS) return false;
  if (age > STALE_MS) return true;

  const dirStat = fs.statSync(storeDir, { throwIfNoEntry: false });
  if (!dirStat) return true;
  return dirStat.atimeMs > headStat.mtimeMs;
}

export async function pull(names: string[], options: PullOptions = {}): Promise<PullResult> {
  const force = options.force === true;
  const global = Config.Global.read();

  const states = await Promise.all(
    names.map(async (name): Promise<PullState> => {
      const cwd = path.join(Config.refDir(), name);
      if (!fs.existsSync(cwd)) {
        return { kind: "failed", name, error: "reference directory missing" };
      }

      const repo = Config.Global.find(global, name);
      if (repo && repo.kind === "file") {
        return { kind: "skipped", name };
      }

      const storeDir = path.join(Config.storeDir(), name);
      const storeStat = fs.lstatSync(storeDir, { throwIfNoEntry: false });
      if (!storeStat || storeStat.isSymbolicLink()) {
        return { kind: "skipped", name };
      }

      if (!fs.existsSync(path.join(storeDir, ".git"))) {
        return { kind: "failed", name, error: "store directory is not a git repo" };
      }

      if (!shouldPull(storeDir, force)) {
        return { kind: "skipped", name };
      }

      const fetch = Bun.spawn(["git", "fetch", "--depth=1", "origin", "HEAD"], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      });
      const [fetchCode, fetchOut, fetchErr] = await Promise.all([
        fetch.exited,
        new Response(fetch.stdout).text(),
        new Response(fetch.stderr).text(),
      ]);
      if (fetchCode !== 0) {
        const msg = `${fetchOut}\n${fetchErr}`.trim();
        return { kind: "failed", name, error: msg || "git fetch failed" };
      }

      const reset = Bun.spawn(["git", "reset", "--hard", "FETCH_HEAD"], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      });
      const [resetCode, resetOut, resetErr] = await Promise.all([
        reset.exited,
        new Response(reset.stdout).text(),
        new Response(reset.stderr).text(),
      ]);
      if (resetCode !== 0) {
        const msg = `${resetOut}\n${resetErr}`.trim();
        return { kind: "failed", name, error: msg || "git reset failed" };
      }

      return { kind: "ok" };
    }),
  );

  const pulled: string[] = [];
  const skipped: string[] = [];
  const failed: PullError[] = [];
  for (let i = 0; i < states.length; i++) {
    const state = states[i]!;
    if (state.kind === "ok") pulled.push(names[i]!);
    if (state.kind === "skipped") skipped.push(state.name);
    if (state.kind === "failed") failed.push({ name: state.name, error: state.error });
  }

  return { count: names.length, pulled, skipped, failed };
}

export function sync(): SyncResult {
  const local = Config.Local.read();
  const global = Config.Global.read();
  const merged = Object.values(local.refs).reduce(
    (config, repo) => Config.Global.add(config, repo),
    global,
  );
  if (Object.keys(local.refs).length > 0) {
    Config.Global.write(merged);
  }

  const refDir = Config.refDir();
  fs.mkdirSync(refDir, { recursive: true });
  fs.mkdirSync(Config.storeDir(), { recursive: true });

  const linked: string[] = [];
  const removed: string[] = [];
  const missing: string[] = [];
  const unchanged: string[] = [];

  const wanted = new Set(Object.keys(local.refs));
  for (const entry of fs.readdirSync(refDir)) {
    if (wanted.has(entry)) continue;
    const target = path.join(refDir, entry);
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(target);
      removed.push(entry);
    }
  }

  for (const [name, repo] of Object.entries(local.refs)) {
    const store = path.join(Config.storeDir(), name);
    const storeBroken = repo.kind === "url" && fs.existsSync(store) && !fs.existsSync(path.join(store, ".git"));
    if (storeBroken) {
      fs.rmSync(store, { recursive: true, force: true });
    }

    if (!fs.existsSync(store) && repo.kind === "url") {
      const clone = Bun.spawnSync(["git", "clone", "--depth=1", repo.uri, store], {
        stdout: "pipe",
        stderr: "pipe",
      });
      if (clone.exitCode !== 0) {
        missing.push(name);
        continue;
      }
    }

    if (!fs.existsSync(store) && repo.kind === "file") {
      if (!fs.existsSync(repo.uri)) {
        missing.push(name);
        continue;
      }
      if (!fs.statSync(repo.uri).isDirectory()) {
        missing.push(name);
        continue;
      }
      fs.symlinkSync(repo.uri, store, "dir");
    }

    if (!fs.existsSync(store)) {
      missing.push(name);
      continue;
    }

    const target = path.join(refDir, name);
    if (fs.existsSync(target)) {
      unchanged.push(name);
      continue;
    }

    fs.symlinkSync(store, target, "dir");
    linked.push(name);
  }

  return { linked, removed, missing, unchanged };
}
