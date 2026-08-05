/**
 * skill-loader.ts — Phase 3: resolve & install the skill bundle for a profile.
 *
 * Hybrid strategy (user-confirmed):
 *   external  → installed via `npx skills add <owner/repo>` (mattpocock, ECC,
 *               emilkowalski, stitch-skills, prompts.chat). Standard layout,
 *               agent-harness independent.
 *   overlay   → lives under `${root}/.agent-forge/skills/<name>/SKILL.md` in
 *               the user's repo. Custom / user-added skills go here. Versioned
 *               by the repo itself.
 *   builtin   → shipped with nucleus (nucleus-init, nucleus-wayfind,
 *               nucleus-orchestrate, nucleus-improve, nucleus-skill-add).
 *
 * The loader merges catalogs from all three sources, filters by domain, and
 * emits a `.agent-forge/bundle.json` the orchestrator reads at run time.
 */

import { mkdir, readFile, readdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import type {
  ProjectDomain,
  ProjectProfile,
  ResolvedSkill,
  SkillFrontmatter,
  SkillRef,
} from "../types.js";


export const BUNDLE_FILE = ".agent-forge/bundle.json";

// ── Catalog of skill sources (the 7 resources + builtin) ─────────────────────
export interface SkillSourceDef {
  repo: string; // `owner/repo` for npx skills; internal id for overlay/builtin
  label: string;
  domains: ProjectDomain[];
  /** Skills we recommend pulling from this source (ids). */
  picks: string[];
  install: "npx-skills" | "overlay" | "builtin";
}

export const SKILL_SOURCES: SkillSourceDef[] = [
  {
    repo: "mattpocock/skills",
    label: "mattpocock — grilling, wayfinder, TDD, codebase design",
    domains: ["web", "backend", "fullstack", "data", "cli", "mobile", "infra", "content"],
    picks: ["grill-me", "grilling", "grill-with-docs", "wayfinder", "tdd", "codebase-design", "diagnosing-bugs", "code-review"],
    install: "npx-skills",
  },
  {
    repo: "affaan-m/ECC",
    label: "ECC — 281 skills, 67 agents, orchestration, security",
    domains: ["web", "ui", "backend", "fullstack", "data", "ml", "cli", "infra", "content"],
    picks: ["deep-research", "e2e-testing", "eval-harness", "agent-introspection-debugging", "coding-standards", "backend-patterns", "security-scan"],
    install: "npx-skills",
  },
  {
    repo: "f/prompts.chat",
    label: "prompts.chat — world's largest open prompt library (MCP role source)",
    domains: ["web", "ui", "backend", "fullstack", "data", "ml", "cli", "mobile", "infra", "content"],
    picks: [], // consumed as MCP server / role library, not installed as skills
    install: "npx-skills",
  },
  {
    repo: "google-labs-code/stitch-skills",
    label: "stitch-skills — design generation, react components, shadcn-ui",
    domains: ["web", "ui", "fullstack"],
    picks: ["generate-design", "react-components", "shadcn-ui", "extract-design-md", "code-to-design"],
    install: "npx-skills",
  },
  {
    repo: "emilkowalski/skills",
    label: "emilkowalski — animation taste, UI polish, pick-ui-library",
    domains: ["web", "ui", "fullstack"],
    picks: ["emil-design-eng", "review-animations", "improve-animations", "find-animation-opportunities", "pick-ui-library", "apple-design"],
    install: "npx-skills",
  },
  {
    repo: "keepsimple.io/uxcore",
    label: "uxcore — cognitive biases, nudge strategies (UX rubric source)",
    domains: ["web", "ui", "fullstack", "content"],
    picks: [], // consumed as a rubric / datasource, not a skill set
    install: "overlay",
  },
  {
    repo: "crimeacs/auto-improve",
    label: "auto-improve — GAN-style self-improvement loop for text artifacts",
    domains: ["web", "ui", "backend", "fullstack", "data", "ml", "cli", "mobile", "infra", "content"],
    picks: ["auto-improve"],
    install: "npx-skills",
  },
  {
    repo: "nucleus-builtin",
    label: "nucleus — kickoff, orchestration, improve, skill-add",
    domains: [],
    picks: ["nucleus-agent", "nucleus-init", "nucleus-wayfind", "nucleus-orchestrate", "nucleus-improve", "nucleus-skill-add"],
    install: "builtin",
  },
];

// ── Profile → recommended skill refs ─────────────────────────────────────────

export function recommendSkills(profile: ProjectProfile): SkillRef[] {
  const refs: SkillRef[] = [];
  for (const src of SKILL_SOURCES) {
    if (src.domains.length !== 0 && !src.domains.includes(profile.domain)) continue;
    for (const id of src.picks) {
      refs.push({
        id,
        source: src.install === "npx-skills" ? "external" : src.install === "overlay" ? "overlay" : "builtin",
        origin: src.repo,
        summary: src.label,
        domains: src.domains,
      });
    }
  }
  // Dedup by id (a skill may appear in multiple sources).
  const seen = new Set<string>();
  return refs.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

// ── Frontmatter parser ───────────────────────────────────────────────────────

/** Minimal YAML frontmatter parser — enough for SKILL.md headers. */
export function parseFrontmatter(markdown: string): { frontmatter: SkillFrontmatter; body: string } {
  const m = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { frontmatter: { name: "", description: "" }, body: markdown };
  const block = m[1] ?? "";
  const body = m[2] ?? "";
  const fm: Record<string, unknown> = {};
  for (const line of block.split("\n")) {
    const mm = line.match(/^([a-zA-Z][\w-]*)\s*:\s*(.*)$/);
    if (!mm) continue;
    const k = mm[1];
    const v = mm[2];
    if (k === undefined || v === undefined) continue;
    fm[k] = v === "true" ? true : v === "false" ? false : /^-?\d+$/.test(v) ? Number(v) : v;
  }
  return { frontmatter: fm as unknown as SkillFrontmatter, body };
}

// ── Overlay + builtin discovery ──────────────────────────────────────────────

async function dirExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Scan a directory of skill folders (each with a SKILL.md) into resolved skills. */
export async function scanSkillDir(dirPath: string, source: "overlay" | "builtin"): Promise<ResolvedSkill[]> {
  if (!(await dirExists(dirPath))) return [];
  const entries = await readdir(dirPath, { withFileTypes: true });
  const skills: ResolvedSkill[] = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const skillDir = join(dirPath, ent.name);
    const mdPath = join(skillDir, "SKILL.md");
    if (!(await dirExists(mdPath))) continue;
    const md = await readFile(mdPath, "utf8");
    const { frontmatter } = parseFrontmatter(md);
    skills.push({
      id: ent.name,
      source,
      origin: source === "overlay" ? ".agent-forge/skills" : "nucleus/skills",
      path: mdPath,
      frontmatter,
      summary: frontmatter.description ?? "",
      domains: [],
    });
  }
  return skills;
}

// ── External install (delegates to `npx skills`) ─────────────────────────────

export async function installExternal(
  repo: string,
  picks?: string[],
  opts: { harness?: string } = {},
): Promise<void> {
  const args = ["-y", "skills@latest", "add", repo];
  if (picks?.length) {
    for (const p of picks) args.push("--skill", p);
  }
  if (opts.harness) args.push("--agent", opts.harness);
  await new Promise<void>((resolve, reject) => {
    const p = spawn("npx", args, { stdio: "inherit", shell: true });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`npx skills exited ${code}`))));
    p.on("error", reject);
  });
}

// ── Bundle assembly ───────────────────────────────────────────────────────────

export interface SkillBundle {
  profile: ProjectProfile;
  refs: SkillRef[];
  resolved: ResolvedSkill[];
  sourcesInstalled: string[];
}

export async function assembleBundle(
  rootDir: string,
  profile: ProjectProfile,
  opts: { installExternals?: boolean } = {},
): Promise<SkillBundle> {
  const refs = profile.skillRefs.length ? profile.skillRefs : recommendSkills(profile);
  const overlayDir = join(rootDir, ".agent-forge", "skills");
  // Builtin skills ship with nucleus (skills/ next to dist/). Resolve to the
  // package root — same trick as cli/index.ts REPO_ROOT — so it works in the
  // repo, in a global install, and in $NucleusHome. Env override for tests.
  const builtinDir =
    process.env.NUCLEUS_SKILLS_DIR ??
    join(fileURLToPath(new URL("../..", import.meta.url)), "skills");
  const [overlay, builtin] = await Promise.all([
    scanSkillDir(overlayDir, "overlay"),
    scanSkillDir(builtinDir, "builtin"),
  ]);
  const resolved: ResolvedSkill[] = [...overlay, ...builtin];
  if (opts.installExternals) {
    const externalRepos = new Set(refs.filter((r) => r.source === "external").map((r) => r.origin));
    for (const repo of externalRepos) {
      await installExternal(repo, refs.filter((r) => r.origin === repo).map((r) => r.id), {
        harness: profile.harness,
      });
    }
  }
  const bundle: SkillBundle = { profile, refs, resolved, sourcesInstalled: [] };
  await mkdir(join(rootDir, ".agent-forge"), { recursive: true });
  await writeFile(join(rootDir, BUNDLE_FILE), JSON.stringify(bundle, null, 2) + "\n", "utf8");
  return bundle;
}
