/**
 * Tests for the self-install runner — run against the built dist/ output.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { harnessTargets, installSkill, listedSkills } from "../dist/install/runner.js";

test("harnessTargets covers opencode, claude-code, codex, omp", () => {
  const targets = harnessTargets(join("home", "me"));
  assert.deepEqual(
    targets.map((t) => t.harness),
    ["opencode", "claude-code", "codex", "omp"]
  );
  assert.equal(targets[0].dir, join("home", "me", ".config", "opencode", "skills"));
  assert.equal(targets[3].dir, join("home", "me", ".agents", "skills"));
});

test("installSkill copies nucleus-agent into requested harnesses (idempotent)", async () => {
  const home = await mkdtemp(join(tmpdir(), "nucleus-home-"));
  const repoRoot = await mkdtemp(join(tmpdir(), "nucleus-repo-"));
  try {
    // Fake repo with the skill.
    const skillDir = join(repoRoot, "skills", "nucleus-agent");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), "---\nname: nucleus-agent\n---\n");

    const first = await installSkill({ harnesses: ["claude-code", "opencode"], repoRoot, home });
    assert.deepEqual(first.map((t) => t.harness), ["opencode", "claude-code"]);

    // Skill file landed where the harness looks.
    const copied = await readFile(join(home, ".claude", "skills", "nucleus-agent", "SKILL.md"), "utf8");
    assert.match(copied, /name: nucleus-agent/);

    // listedSkills reports it.
    const skills = await listedSkills(join(home, ".claude", "skills"));
    assert.ok(skills.includes("nucleus-agent"));

    // Re-run must not fail (idempotent overwrite).
    await installSkill({ harnesses: ["all"], repoRoot, home });
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("installSkill skips unknown harnesses", async () => {
  const home = await mkdtemp(join(tmpdir(), "nucleus-home2-"));
  const repoRoot = await mkdtemp(join(tmpdir(), "nucleus-repo2-"));
  try {
    const written = await installSkill({ harnesses: ["does-not-exist"], repoRoot, home });
    assert.deepEqual(written, []);
  } finally {
    await rm(home, { recursive: true, force: true });
    await rm(repoRoot, { recursive: true, force: true });
  }
});