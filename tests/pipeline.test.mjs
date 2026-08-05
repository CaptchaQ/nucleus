/**
 * End-to-end pipeline tests — the real CLI against a temp workspace.
 *
 * These exercise the full user journey: `nucleus bootstrap` in an empty
 * folder, then the phase-by-phase protocol (`init --answers` → `wayfind`
 * → `load` → `orchestrate`), plus idempotency and doctor. No network,
 * no external installs (externals are refs only unless `--install`).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(process.cwd(), "dist", "cli", "index.js");

/** Run the real CLI in `cwd`; returns {status, stdout, stderr}. */
function run(args, cwd) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

async function readJson(p) {
  return JSON.parse(await readFile(p, "utf8"));
}

/** Shared fixtures: a fresh temp workspace per test. */
async function workspace(name) {
  const dir = await mkdtemp(join(tmpdir(), `nucleus-pipeline-${name}-`));
  return dir;
}

const FORGE = ".agent-forge";
const artifacts = (dir) => ({
  profile: join(dir, FORGE, "profile.json"),
  wayfinder: join(dir, FORGE, "wayfinder.json"),
  bundle: join(dir, FORGE, "bundle.json"),
  orchestration: join(dir, FORGE, "orchestration.json"),
  agentsMd: join(dir, "AGENTS.md"),
});

test("bootstrap: empty folder becomes a complete agent workspace", async () => {
  const dir = await workspace("bootstrap");
  try {
    const r = run(["bootstrap", "--domain", "fullstack"], dir);
    assert.equal(r.status, 0, r.stderr);

    const a = artifacts(dir);
    for (const [name, p] of Object.entries(a)) {
      assert.ok(existsSync(p), `${name} must exist`);
    }

    // Profile: name from folder, defaults applied.
    const profile = await readJson(a.profile);
    assert.equal(profile.domain, "fullstack");
    assert.equal(profile.harness, "opencode");
    assert.deepEqual(profile.languages, ["typescript"]);
    assert.equal(profile.name, join(dir).split(/[\\/]/).pop());

    // Wayfinder: charted frontier has tickets.
    const map = await readJson(a.wayfinder);
    assert.ok(map.tickets.length >= 1, "wayfinder must chart at least one ticket");

    // Bundle: builtin source always resolved, external sources referenced.
    const bundle = await readJson(a.bundle);
    assert.ok(bundle.resolved.some((s) => s.source === "builtin"));
    assert.ok(bundle.refs.some((r) => r.origin === "nucleus-builtin"));
    assert.ok(bundle.refs.length >= 20, `fullstack refs (${bundle.refs.length}) should be rich`);

    // Orchestration: full role DAG.
    const orch = await readJson(a.orchestration);
    const roles = new Set(orch.agents.map((ag) => ag.role));
    for (const must of ["planner", "implementer", "reviewer", "tester", "designer", "docs"]) {
      assert.ok(roles.has(must), `role ${must} must be in the DAG`);
    }
    assert.ok(orch.rootTask.length > 0);

    // AGENTS.md: the "system prompt" — carries mission and roles.
    const md = await readFile(a.agentsMd, "utf8");
    assert.match(md, /# Project instructions/);
    assert.match(md, /Domain: fullstack/);
    assert.ok(md.includes("- implementer"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("bootstrap: --answers overrides defaults; existing profile is not clobbered", async () => {
  const dir = await workspace("answers");
  try {
    // First: profile from answers file.
    await writeFile(
      join(dir, "answers.json"),
      JSON.stringify({
        name: "tasknote",
        destination: "веб-приложение заметок",
        domain: "backend",
        languages: "typescript",
        frameworks: "react,node",
        harness: "claude-code",
        tracker: "linear",
      }),
      "utf8",
    );
    const r1 = run(["bootstrap", "--answers", "answers.json"], dir);
    assert.equal(r1.status, 0, r1.stderr);

    const a = artifacts(dir);
    const profile1 = await readJson(a.profile);
    assert.equal(profile1.name, "tasknote");
    assert.equal(profile1.domain, "backend");
    assert.equal(profile1.harness, "claude-code");

    // Second run with NO answers: defaults must NOT overwrite the profile.
    const r2 = run(["bootstrap", "--domain", "fullstack"], dir);
    assert.equal(r2.status, 0, r2.stderr);
    const profile2 = await readJson(a.profile);
    assert.equal(profile2.name, "tasknote", "existing profile must survive a default bootstrap");
    assert.equal(profile2.domain, "backend");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("bootstrap: AGENTS.md is refreshed on re-run with a new answers file", async () => {
  const dir = await workspace("refresh");
  try {
    const r1 = run(["bootstrap"], dir);
    assert.equal(r1.status, 0, r1.stderr);
    const md1 = await readFile(join(dir, "AGENTS.md"), "utf8");
    assert.doesNotMatch(md1, /chat-сервис/);

    await writeFile(
      join(dir, "answers.json"),
      JSON.stringify({
        name: "svc",
        destination: "чат-сервис на Node",
        domain: "backend",
        languages: "typescript",
        frameworks: "node",
        harness: "opencode",
        tracker: "local",
      }),
      "utf8",
    );
    const r2 = run(["bootstrap", "--answers", "answers.json"], dir);
    assert.equal(r2.status, 0, r2.stderr);
    const md2 = await readFile(join(dir, "AGENTS.md"), "utf8");
    assert.match(md2, /чат-сервис на Node/);
    assert.match(md2, /Domain: backend/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("phase protocol: init --answers → wayfind --json → load → orchestrate", async () => {
  const dir = await workspace("phases");
  try {
    await writeFile(
      join(dir, "answers.json"),
      JSON.stringify({
        name: "ui-kit",
        destination: "дизайн-система с компонентами",
        domain: "ui",
        languages: "typescript",
        frameworks: "react",
        harness: "opencode",
        tracker: "github",
      }),
      "utf8",
    );

    // init --answers: profile artifacts, no stdin.
    const rInit = run(["init", "--answers", "answers.json"], dir);
    assert.equal(rInit.status, 0, rInit.stderr);
    const profile = await readJson(join(dir, FORGE, "profile.json"));
    assert.equal(profile.name, "ui-kit");
    assert.equal(profile.domain, "ui");

    // wayfind --json: map as JSON on stdout (agent protocol).
    const rMap = run(["wayfind", "--json"], dir);
    assert.equal(rMap.status, 0, rMap.stderr);
    const map = JSON.parse(rMap.stdout);
    assert.ok(map.tickets.length >= 1);
    assert.ok(map.tickets.every((t) => t.id && t.title));

    // load: bundle written.
    const rLoad = run(["load"], dir);
    assert.equal(rLoad.status, 0, rLoad.stderr);
    const bundle = await readJson(join(dir, FORGE, "bundle.json"));
    assert.ok(bundle.refs.length >= 1);

    // orchestrate: DAG written and downstream edges consistent.
    const rOrch = run(["orchestrate"], dir);
    assert.equal(rOrch.status, 0, rOrch.stderr);
    const orch = await readJson(join(dir, FORGE, "orchestration.json"));
    const ids = new Set(orch.agents.map((ag) => ag.id));
    for (const ag of orch.agents) {
      for (const d of ag.downstream) {
        assert.ok(ids.has(d), `downstream ${d} of ${ag.id} must be a known agent`);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("doctor: reports a bootstrapped workspace as healthy", async () => {
  const dir = await workspace("doctor");
  try {
    const r1 = run(["doctor"], dir);
    assert.equal(r1.status, 0, r1.stderr);

    const r2 = run(["bootstrap"], dir);
    assert.equal(r2.status, 0, r2.stderr);
    const r3 = run(["doctor"], dir);
    assert.equal(r3.status, 0, r3.stderr);
    assert.match(r3.stdout, /profile/);
    assert.match(r3.stdout, /bundle/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("bootstrap: works in a folder whose name is non-ASCII", async () => {
  const dir = await workspace("unicode");
  const unicodeDir = join(dir, "проект-тест");
  try {
    await mkdir(unicodeDir, { recursive: true });
    const r = run(["bootstrap", "--domain", "cli"], unicodeDir);
    assert.equal(r.status, 0, r.stderr);
    const profile = await readJson(join(unicodeDir, FORGE, "profile.json"));
    assert.equal(profile.name, "проект-тест");
    assert.equal(profile.domain, "cli");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
