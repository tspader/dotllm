import fs from "fs";
import path from "path";
import { z } from "zod";

const GLOBAL_DIR = path.join(
  process.env.HOME ?? "",
  ".local",
  "share",
  "dotllm",
);
const STORE_DIR = path.join(GLOBAL_DIR, "store");
const GLOBAL_FILE = path.join(GLOBAL_DIR, "llm.json");
const LOCAL_DIR = ".llm";
const LOCAL_FILE = path.join(LOCAL_DIR, "llm.json");
const REF_DIR = path.join(LOCAL_DIR, "reference");

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
  refs: z.array(z.string()),
});

export namespace Config {
  export function storeDir(): string {
    return STORE_DIR;
  }

  export function refDir(): string {
    return REF_DIR;
  }

  export namespace Global {
    export type Shape = z.infer<typeof GlobalShape>;

    export function read(): Shape {
      const raw = readJson(GLOBAL_FILE);
      if (!raw) return { repos: [] };
      const result = GlobalShape.safeParse(raw);
      if (!result.success) return { repos: [] };
      return result.data;
    }

    export function write(config: Shape): void {
      fs.mkdirSync(GLOBAL_DIR, { recursive: true });
      fs.writeFileSync(GLOBAL_FILE, JSON.stringify(config, null, 2) + "\n");
    }

    export function find(config: Shape, name: string): RepoEntry | undefined {
      return config.repos.find((r) => r.name === name);
    }

    export function add(config: Shape, entry: RepoEntry): Shape {
      const filtered = config.repos.filter((r) => r.name !== entry.name);
      return { repos: [...filtered, entry] };
    }

    export function remove(config: Shape, name: string): Shape {
      return { repos: config.repos.filter((r) => r.name !== name) };
    }
  }

  export namespace Local {
    export type Shape = z.infer<typeof LocalShape>;

    export function read(): Shape {
      const raw = readJson(LOCAL_FILE);
      if (!raw) return { refs: [] };
      const result = LocalShape.safeParse(raw);
      if (!result.success) return { refs: [] };
      return result.data;
    }

    export function write(config: Shape): void {
      fs.mkdirSync(LOCAL_DIR, { recursive: true });
      fs.writeFileSync(LOCAL_FILE, JSON.stringify(config, null, 2) + "\n");
    }

    export function has(config: Shape, name: string): boolean {
      return config.refs.includes(name);
    }

    export function add(config: Shape, name: string): Shape {
      if (config.refs.includes(name)) return config;
      return { refs: [...config.refs, name] };
    }

    export function remove(config: Shape, name: string): Shape {
      return { refs: config.refs.filter((r) => r !== name) };
    }
  }
}

function readJson(filepath: string): unknown {
  if (!fs.existsSync(filepath)) return null;
  const raw = fs.readFileSync(filepath, "utf-8");
  return JSON.parse(raw);
}
