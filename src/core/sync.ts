import fs from "fs";
import path from "path";
import { Config } from "dotllm/core/config";

export type SyncResult = {
  linked: string[];
  removed: string[];
  missing: string[];
  unchanged: string[];
};

type PullState = {
  name: string;
  error: string;
} | null;

export type PullError = {
  name: string;
  error: string;
};

export type PullResult = {
  count: number;
  failed: PullError[];
};

export async function pull(names: string[]): Promise<PullResult> {
  const states = await Promise.all(
    names.map(async (name): Promise<PullState> => {
      const cwd = path.join(Config.refDir(), name);
      if (!fs.existsSync(cwd)) {
        return { name, error: "reference directory missing" };
      }

      const proc = Bun.spawn(["git", "pull", "--ff-only"], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      });
      const [code, out, err] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      const msg = `${out}\n${err}`.trim();

      if (code !== 0) {
        return { name, error: msg || "git pull failed" };
      }

      return null;
    }),
  );

  const failed = states.filter((state): state is PullError => state !== null);

  return { count: names.length, failed };
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
    if (!fs.existsSync(store)) {
      fs.rmSync(store, { recursive: true, force: true });
    }

    if (!fs.existsSync(store) && repo.kind === "url") {
      const clone = Bun.spawnSync(["git", "clone", repo.uri, store], {
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
