/**
 * Tests for the skill loader — run against the built dist/ output.
 * `npm test` builds first, so these always test compiled reality.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter, recommendSkills } from "../dist/loader/runner.js";
import { SKILL_SOURCES } from "../dist/loader/runner.js";

const SKILL_MD = `---
name: my-skill
description: One sentence about what it does.
user-invocable: true
---

# my-skill

Body content here.
`;

test("parseFrontmatter extracts name and description", () => {
  const { frontmatter, body } = parseFrontmatter(SKILL_MD);
  assert.equal(frontmatter.name, "my-skill");
  assert.equal(frontmatter.description, "One sentence about what it does.");
  assert.match(body, /# my-skill/);
});

test("parseFrontmatter falls back on missing frontmatter", () => {
  const { frontmatter, body } = parseFrontmatter("# no frontmatter");
  assert.equal(frontmatter.name, "");
  assert.equal(frontmatter.description, "");
  assert.equal(body, "# no frontmatter");
});

test("parseFrontmatter keeps body after closing fence", () => {
  const md = "---\nname: x\n---\ntrailing";
  const { frontmatter, body } = parseFrontmatter(md);
  assert.equal(frontmatter.name, "x");
  assert.equal(body, "trailing");
});

test("recommendSkills picks domain-matched sources only", () => {
  const refs = recommendSkills({ domain: "web" });
  // A web profile must not pull backend-only sources; every pick must belong
  // to a source whose domains include "web" (or that applies to all domains).
  for (const ref of refs) {
    const src = SKILL_SOURCES.find((s) => s.repo === ref.origin);
    assert.ok(src, `source ${ref.origin} must exist in SKILL_SOURCES`);
    assert.ok(
      src.domains.length === 0 || src.domains.includes("web"),
      `source ${src.repo} must match web domain`
    );
  }
  // The builtin source always contributes.
  assert.ok(refs.some((r) => r.origin === "nucleus-builtin"));
});

test("all 7 external sources are in the catalog", () => {
  const external = SKILL_SOURCES.filter((s) => s.install !== "builtin");
  assert.equal(external.length, 7);
});

test("agent protocol: questions dump has 10 ids", async () => {
  const { GRILL_QUESTIONS } = await import("../dist/grill/runner.js");
  assert.equal(GRILL_QUESTIONS.length, 10);
  const ids = GRILL_QUESTIONS.map((q) => q.id);
  for (const must of ["name", "destination", "domain", "harness", "tracker", "out-of-scope"]) {
    assert.ok(ids.includes(must), `question ${must} must exist`);
  }
});

test("agent protocol: buildProfile from file answers", async () => {
  const { buildProfile } = await import("../dist/grill/runner.js");
  const profile = buildProfile({
    name: "tasknote",
    destination: "веб-приложение заметок",
    domain: "fullstack",
    languages: "typescript",
    frameworks: "react,node",
    harness: "opencode",
    tracker: "github",
    quality: "тесты, e2e",
    "out-of-scope": "мобильное приложение",
  });
  assert.equal(profile.name, "tasknote");
  assert.equal(profile.domain, "fullstack");
  assert.equal(profile.harness, "opencode");
  assert.deepEqual(profile.languages, ["typescript"]);
  assert.deepEqual(profile.outOfScope, ["мобильное приложение"]);
});