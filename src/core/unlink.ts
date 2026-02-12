import fs from "fs";
import path from "path";
import { Config } from "dotllm/core/config";

export type UnlinkResult = {
  ok: true;
} | {
  ok: false;
  error: string;
};

export function unlink(name: string): UnlinkResult {
  const local = Config.Local.read();

  if (!Config.Local.has(local, name)) {
    return { ok: false, error: `"${name}" is not linked in local config` };
  }

  const target = path.join(Config.refDir(), name);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }

  Config.Local.write(Config.Local.remove(local, name));
  return { ok: true };
}
