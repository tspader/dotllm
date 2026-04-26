import fs from "fs";
import path from "path";
import { Config } from "@spader/dotllm/core/config";

export type UnlinkResult = {
  ok: true;
} | {
  ok: false;
  error: string;
};

export function unlink(name: string): UnlinkResult {
  const local = Config.Local.read();
  const found = Config.Local.find(local, name);

  if (!found) {
    return { ok: false, error: `"${name}" is not linked in local config` };
  }

  const target = path.join(Config.refDir(), found.name);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }

  Config.Local.write(Config.Local.remove(local, found.name));
  return { ok: true };
}
