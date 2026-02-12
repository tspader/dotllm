import fs from "fs";
import path from "path";
import { Config } from "dotllm/core/config";

export type RemoveResult = {
  ok: true;
} | {
  ok: false;
  error: string;
};

export function remove(name: string): RemoveResult {
  const global = Config.Global.read();
  const found = Config.Global.find(global, name);

  if (!found) {
    return { ok: false, error: `No repo named "${name}" in registry` };
  }

  const target = path.join(Config.storeDir(), name);
  if (fs.existsSync(target)) {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(target);
    }
    if (stat.isDirectory()) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  Config.Global.write(Config.Global.remove(global, name));
  return { ok: true };
}
