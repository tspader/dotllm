import fs from "fs";
import os from "os";
import path from "path";
import { z } from "zod";

const LOCAL_DIR = ".llm";
const LOCAL_FILE = path.join(LOCAL_DIR, "dotllm.json");
const REF_DIR = path.join(LOCAL_DIR, "reference");

function home(): string {
  if (process.platform === "win32") {
    const appData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
    return path.join(appData, "dotllm");
  }
  return path.join(process.env.HOME ?? os.homedir(), ".local", "share", "dotllm");
}

const RepoEntry = z.object({
  kind: z.enum(["url", "file"]),
  name: z.string(),
  uri: z.string(),
  description: z.string(),
});

export type RepoEntry = z.infer<typeof RepoEntry>;

const GlobalShape = z.object({
  repos: z.array(RepoEntry),
});

const LocalShape = z.object({
  refs: z.record(z.string(), RepoEntry),
});

export namespace Config {
  export function storeDir(): string {
    return path.join(home(), "store");
  }

  export function refDir(): string {
    return REF_DIR;
  }

  export namespace Global {
    export type Shape = z.infer<typeof GlobalShape>;

    export function read(): Shape {
      const raw = readJson(path.join(home(), "dotllm.json"));
      if (!raw) return { repos: [] };
      const result = GlobalShape.safeParse(raw);
      if (!result.success) return { repos: [] };
      return result.data;
    }

    export function write(config: Shape): void {
      const dir = home();
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "dotllm.json"), JSON.stringify(config, null, 2) + "\n");
    }

    export function find(config: Shape, name: string): RepoEntry | undefined {
      const lower = name.toLowerCase();
      return config.repos.find((r) => r.name.toLowerCase() === lower);
    }

    export function add(config: Shape, entry: RepoEntry): Shape {
      const lower = entry.name.toLowerCase();
      const filtered = config.repos.filter((r) => r.name.toLowerCase() !== lower);
      return { repos: [...filtered, entry] };
    }

    export function remove(config: Shape, name: string): Shape {
      const lower = name.toLowerCase();
      return { repos: config.repos.filter((r) => r.name.toLowerCase() !== lower) };
    }
  }

  export namespace Local {
    export type Shape = z.infer<typeof LocalShape>;

    export function read(): Shape {
      const raw = readJson(LOCAL_FILE);
      if (!raw) return { refs: {} };
      const result = LocalShape.safeParse(raw);
      if (!result.success) return { refs: {} };
      return result.data;
    }

    export function write(config: Shape): void {
      fs.mkdirSync(LOCAL_DIR, { recursive: true });
      fs.writeFileSync(LOCAL_FILE, JSON.stringify(config, null, 2) + "\n");
    }

    export function find(config: Shape, name: string): RepoEntry | undefined {
      const lower = name.toLowerCase();
      for (const [key, value] of Object.entries(config.refs)) {
        if (key.toLowerCase() === lower) return value;
      }
      return undefined;
    }

    export function has(config: Shape, name: string): boolean {
      return find(config, name) !== undefined;
    }

    export function add(config: Shape, repo: RepoEntry): Shape {
      const lower = repo.name.toLowerCase();
      const refs = Object.fromEntries(
        Object.entries(config.refs).filter(([key]) => key.toLowerCase() !== lower),
      );
      refs[repo.name] = repo;
      return { refs };
    }

    export function remove(config: Shape, name: string): Shape {
      const lower = name.toLowerCase();
      const refs = Object.fromEntries(
        Object.entries(config.refs).filter(([key]) => key.toLowerCase() !== lower),
      );
      return { refs };
    }
  }
}

function readJson(filepath: string): unknown {
  if (!fs.existsSync(filepath)) return null;
  const raw = fs.readFileSync(filepath, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
