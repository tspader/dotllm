import fs from "fs";
import path from "path";
import { Config } from "dotllm/core/config";

export type SyncResult = {
  linked: string[];
  removed: string[];
  missing: string[];
  unchanged: string[];
};

export function sync(): SyncResult {
  const local = Config.Local.read();
  const global = Config.Global.read();
  const refDir = Config.refDir();
  fs.mkdirSync(refDir, { recursive: true });

  const linked: string[] = [];
  const removed: string[] = [];
  const missing: string[] = [];
  const unchanged: string[] = [];

  const wanted = new Set(local.refs);
  for (const entry of fs.readdirSync(refDir)) {
    if (wanted.has(entry)) continue;
    const target = path.join(refDir, entry);
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(target);
      removed.push(entry);
    }
  }

  for (const name of local.refs) {
    const repo = Config.Global.find(global, name);
    if (!repo) {
      missing.push(name);
      continue;
    }

    const target = path.join(refDir, name);
    if (fs.existsSync(target)) {
      unchanged.push(name);
      continue;
    }

    const store = path.join(Config.storeDir(), name);
    fs.symlinkSync(store, target, "dir");
    linked.push(name);
  }

  return { linked, removed, missing, unchanged };
}
