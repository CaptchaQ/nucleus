/**
 * install/runner.ts — self-install: register the `nucleus-agent` skill into
 * the skill directories of known agent harnesses (claude-code, opencode,
 * codex) so the agent picks the pipeline up in its next session.
 *
 * The CLI runs `nucleus install`; the shell installers (scripts/install.sh,
 * scripts/install.ps1) do the same from a one-liner. Both delegate here for
 * the harness layout so the two paths never drift.
 */

import { mkdir, cp, readdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export interface HarnessTarget {
  harness: string;
  /** Directory that holds skill folders (one per skill). */
  dir: string;
}

/** Known agent harnesses and where they look for skills. */
export function harnessTargets(home: string): HarnessTarget[] {
  return [
    // opencode uses the PLURAL "skills" dir under ~/.config/opencode/.
    { harness: "opencode", dir: join(home, ".config", "opencode", "skills") },
    { harness: "claude-code", dir: join(home, ".claude", "skills") },
    { harness: "codex", dir: join(home, ".codex", "skills") },
    // omp / generic agents read skills from ~/.agents/skills.
    { harness: "omp", dir: join(home, ".agents", "skills") },
  ];
}

/**
 * Copy `skills/nucleus-agent/` into the requested harnesses' skill dirs.
 * Idempotent: re-runs overwrite the skill copy.
 *
 * Returns the targets that were actually written.
 */
export async function installSkill(opts: {
  /** Harness ids to target, or "all". */
  harnesses: string[];
  /** Root of the nucleus repo (where skills/ lives). */
  repoRoot: string;
  /** Home dir override (tests); defaults to os.homedir(). */
  home?: string;
}): Promise<HarnessTarget[]> {
  const home = opts.home ?? homedir();
  const all = harnessTargets(home);
  const wanted = opts.harnesses.includes("all")
    ? all
    : all.filter((t) => opts.harnesses.includes(t.harness));

  const src = join(opts.repoRoot, "skills", "nucleus-agent");
  const written: HarnessTarget[] = [];
  for (const t of wanted) {
    await mkdir(t.dir, { recursive: true });
    await cp(src, join(t.dir, "nucleus-agent"), { recursive: true });
    written.push(t);
  }
  return written;
}

/** List skills a harness dir currently contains (for `nucleus doctor`). */
export async function listedSkills(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}
