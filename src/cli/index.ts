#!/usr/bin/env node
/**
 * src/cli/index.ts — the `npx nucleus` CLI.
 *
 * Commands:
 *   nucleus init        — grill the user, persist ProjectProfile + ADR + CONTEXT
 *   nucleus wayfind    — chart/resolve decision tickets on the map
 *   nucleus load       — assemble & (optionally) install the skill bundle
 *   nucleus orchestrate— build the subagent DAG from the bundle
 *   nucleus improve    — GAN-style loop on a project artifact (Python bridge)
 *   nucleus skill add  — scaffold a custom skill under .agent-forge/skills/
 *   nucleus catalog    — dump the catalog of available skills (all 7 sources)
 *   nucleus doctor     — sanity-check environment + paths
 */

import { createInterface, type Interface } from "node:readline/promises";
import { join } from "node:path";
import { readFile, mkdir, writeFile, readdir, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { buildProfile, persistProfile, GRILL_QUESTIONS, type GrillAnswers } from "../grill/runner.js";
import {
  loadMap,
  saveMap,
  emptyMap,
  chartInitialFrontier,
  frontier,
  claim,
  resolve as resolveTicket,
  ruleOutOfScope,
} from "../wayfinder/runner.js";
import { assembleBundle, SKILL_SOURCES, type SkillBundle } from "../loader/runner.js";
import { buildOrchestration, persistOrchestration } from "../orchestrator/runner.js";
import type { ProjectProfile } from "../types.js";

const ROOT = process.cwd();

// ── tiny helpers ─────────────────────────────────────────────────────────────

const log = (s: string) => process.stdout.write(s + "\n");
const err = (s: string) => process.stderr.write(s + "\n");

async function readJson<T>(p: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(p, "utf8")) as T;
  } catch {
    return null;
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function ask(rl: Interface, q: string): Promise<string> {
  const a = await rl.question(q + " ");
  return a.trim();
}

function usage(): never {
  log(`nucleus — kickoff-to-orchestration utility for AI coding agents

Usage:
  nucleus init             Grill the user; persist .agent-forge/profile.json + ADR + CONTEXT.md
  nucleus wayfind          Chart/resolve decision tickets on the wayfinder map
  nucleus load [--install] Assemble the skill bundle (optionally install externals via npx skills)
  nucleus orchestrate      Build the subagent DAG from the loaded skill bundle
  nucleus improve <file>   GAN-style improvement loop on <file> (Python bridge)
  nucleus skill add <name> Scaffold a custom skill under .agent-forge/skills/<name>/
  nucleus catalog          Print the catalog of skills across all 7 sources
  nucleus doctor           Sanity-check environment and required paths
`);
  process.exit(2);
}

// ── commands ──────────────────────────────────────────────────────────────────

async function cmdInit(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answers: GrillAnswers = {};
  log("nucleus init — relentless interview (one question at a time, with recommended answers)\n");
  for (const q of GRILL_QUESTIONS) {
    if (q.dependsOn && !q.dependsOn.every((id) => answers[id])) continue;
    if (q.domains && q.domains.length) {
      // Defer domain-filtering until we know the domain (asked by the domain question).
      const dom = answers.domain as string | undefined;
      if (dom && q.domains.length && !q.domains.includes(dom as never)) continue;
    }
    const rec = q.recommend ? ` [рекомендация: ${q.recommend}]` : "";
    const a = await ask(rl, `${q.prompt}${rec}`);
    if (a) answers[q.id] = a;
    else if (q.recommend) answers[q.id] = q.recommend;
  }
  rl.close();
  const profile = buildProfile(answers);
  const { adrDir, contextFile } = await persistProfile(ROOT, profile);
  log(`\n✓ Profile → .agent-forge/profile.json`);
  log(`✓ ADR-0001 → ${adrDir}`);
  log(`✓ CONTEXT  → ${contextFile}`);
  log(`\nNext: \`nucleus wayfind\` to chart decision tickets.`);
}

async function cmdWayfind(): Promise<void> {
  const profile = await readJson<ProjectProfile>(join(ROOT, ".agent-forge", "profile.json"));
  if (!profile) {
    err("No profile found. Run `nucleus init` first.");
    return process.exit(1);
  }
  let map = await loadMap(ROOT);
  if (!map) {
    map = emptyMap(profile);
    map.tickets = chartInitialFrontier(profile);
    await saveMap(ROOT, map);
    log(`✓ Charted ${map.tickets.length} initial decision tickets.`);
    log("Frontier:");
    for (const t of frontier(map)) log(`  • ${t.id} [${t.type}/${t.mode}] ${t.title}`);
    log(`\nMap → .agent-forge/wayfinder.json`);
    return;
  }
  // Resolve next frontier ticket interactively.
  const next = frontier(map)[0];
  if (!next) {
    log("No open tickets on the frontier. The way to the destination is clear.");
    return;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  log(`\nTicket: ${next.title} (${next.id})`);
  log(`Question: ${next.question}\n`);
  await claim(map, next.id);
  const answer = await ask(rl, "Your decision (one line, or 'OOS' to rule out of scope):");
  if (/^oos$/i.test(answer)) {
    const reason = await ask(rl, "Why is it out of scope?");
    ruleOutOfScope(map, next.id, reason);
  } else {
    resolveTicket(map, next.id, answer);
  }
  rl.close();
  await saveMap(ROOT, map);
  log(`\n✓ Map updated.`);
}

async function cmdLoad(install: boolean): Promise<void> {
  const profile = await readJson<ProjectProfile>(join(ROOT, ".agent-forge", "profile.json"));
  if (!profile) {
    err("No profile found. Run `nucleus init` first.");
    return process.exit(1);
  }
  const bundle = await assembleBundle(ROOT, profile, { installExternals: install });
  log(`✓ Bundle → .agent-forge/bundle.json`);
  log(`  refs: ${bundle.refs.length}`);
  log(`  resolved (overlay + builtin): ${bundle.resolved.length}`);
  if (install) log("  external installs via `npx skills` attempted.");
  log("\nNext: `nucleus orchestrate` to build the subagent DAG.");
}

async function cmdOrchestrate(): Promise<void> {
  const profile = await readJson<ProjectProfile>(join(ROOT, ".agent-forge", "profile.json"));
  const bundle = await readJson<SkillBundle>(join(ROOT, ".agent-forge", "bundle.json"));
  if (!profile || !bundle) {
    err("Missing profile or bundle. Run `nucleus init` then `nucleus load`.");
    return process.exit(1);
  }
  const orch = buildOrchestration(profile, bundle, profile.destination);
  await persistOrchestration(ROOT, orch);
  log(`✓ Orchestration → .agent-forge/orchestration.json`);
  log(`  agents: ${orch.agents.length}`);
  for (const a of orch.agents) log(`    • ${a.id} — ${a.skillRefs.length} skills; downstream → ${a.downstream.join(", ") || "—"}`);
}

async function cmdImprove(file: string, extra: string[]): Promise<void> {
  const getFlag = (name: string): string | undefined => {
    const i = extra.indexOf(name);
    return i >= 0 && i + 1 < extra.length ? extra[i + 1] : undefined;
  };
  const known = ["--tag", "--criteria", "--goal"];
  const passThrough: string[] = [];
  for (let i = 0; i < extra.length; i++) {
    if (known.includes(extra[i]!)) { i++; continue; } // skip flag + its value
    passThrough.push(extra[i]!);
  }
  const py = spawn("python", [
    "-m", "nucleus_improve",
    "--artifact", file,
    "--tag", getFlag("--tag") ?? "v1",
    ...(getFlag("--criteria") ? ["--criteria", getFlag("--criteria")!] : []),
    ...(getFlag("--goal") ? ["--goal", getFlag("--goal")!] : []),
    ...passThrough,
  ], { stdio: "inherit", cwd: ROOT });
  py.on("exit", (c) => process.exit(c ?? 0));
}

async function cmdSkillAdd(name: string): Promise<void> {
  const dir = join(ROOT, ".agent-forge", "skills", name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "SKILL.md"),
    SKILL_TEMPLATE.replaceAll("{{name}}", name),
    "utf8",
  );
  log(`✓ Scaffolded skill → .agent-forge/skills/${name}/SKILL.md`);
  log("Edit it, then run `nucleus catalog` to see it listed.");
}

async function cmdCatalog(): Promise<void> {
  log("Catalog of skill sources (the 7 external resources + nucleus builtin):\n");
  for (const src of SKILL_SOURCES) {
    log(`• ${src.repo} — ${src.label}`);
    log(`   install: ${src.install}  |  picks: ${src.picks.join(", ") || "(MCP/datasource)"}`);
  }
  const overlayDir = join(ROOT, ".agent-forge", "skills");
  if (await exists(overlayDir)) {
    log("\nOverlay skills in this repo:");
    for (const ent of await readdir(overlayDir, { withFileTypes: true })) {
      if (ent.isDirectory()) log(`  • ${ent.name} (overlay)`);
    }
  }
}

async function cmdDoctor(): Promise<void> {
  const needs = [
    [".agent-forge/profile.json", "profile (run `nucleus init`)"],
    [".agent-forge/wayfinder.json", "wayfinder map (run `nucleus wayfind`)"],
    [".agent-forge/bundle.json", "skill bundle (run `nucleus load`)"],
    [".agent-forge/orchestration.json", "orchestration (run `nucleus orchestrate`)"],
  ] as const;
  let ok = true;
  for (const [rel, hint] of needs) {
    const full = join(ROOT, rel);
    if (!(await exists(full))) {
      log(`  ✗ ${rel} — missing (${hint})`);
      ok = false;
    } else {
      log(`  ✓ ${rel}`);
    }
  }
  log(ok ? "\nAll nucleus artifacts present." : "\nSome artifacts missing — run the listed commands.");
}

// ── entrypoint ────────────────────────────────────────────────────────────────

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case "init": await cmdInit(); break;
  case "wayfind": await cmdWayfind(); break;
  case "load": await cmdLoad(rest.includes("--install")); break;
  case "orchestrate": await cmdOrchestrate(); break;
  case "improve": {
    const file = rest[0];
    if (!file) usage();
    await cmdImprove(file, rest.slice(1));
    break;
  }
  case "skill":
    if (rest[0] !== "add" || !rest[1]) usage();
    await cmdSkillAdd(rest[1]);
    break;
  case "catalog": await cmdCatalog(); break;
  case "doctor": await cmdDoctor(); break;
  default: usage();
}

// ── skill template ───────────────────────────────────────────────────────────

const SKILL_TEMPLATE = `---
name: {{name}}
description: TODO — one sentence describing what this skill helps the agent do.
user-invocable: true
---

# {{name}}

## When to use

Describe the situation that should trigger this skill.

## Instructions

Step-by-step guidance the agent follows when the skill is invoked. Keep it tight;
this is loaded into context, so every line earns its place.

## Examples

Optional: concrete worked examples.
`;
