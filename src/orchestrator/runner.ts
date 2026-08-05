/**
 * orchestrator.ts — Phase 4: spin up a subagent DAG from a skill bundle.
 *
 * Inspired by ECC's orchestration + mattpocock's research subagents. The
 * orchestrator maps skills → agent roles → a DAG where edges are downstream
 * work. Memory is persisted under `.agent-forge/memory/` so artifacts survive
 * across sessions and agents.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  AgentRole,
  Orchestration,
  ProjectProfile,
  SkillRef,
  SubagentSpec,
} from "../types.js";
import type { SkillBundle } from "../loader/runner.js";

// ── Skill → role mapping ─────────────────────────────────────────────────────
// Domain knowledge lives in skills; this table snaps a skill id to the agent
// role that should consult it. Skills with no mapping are advisory across roles.

const ROLE_BY_SKILL: Record<string, AgentRole> = {
  // mattpocock
  "grill-me": "planner",
  grilling: "planner",
  "grill-with-docs": "planner",
  wayfinder: "planner",
  "codebase-design": "planner",
  tdd: "tester",
  "code-review": "reviewer",
  "diagnosing-bugs": "implementer",
  // ECC
  "deep-research": "researcher",
  "e2e-testing": "tester",
  "eval-harness": "tester",
  "agent-introspection-debugging": "implementer",
  "coding-standards": "implementer",
  "backend-patterns": "implementer",
  "security-scan": "security",
  // stitch
  "generate-design": "designer",
  "react-components": "designer",
  "shadcn-ui": "designer",
  "extract-design-md": "designer",
  "code-to-design": "designer",
  // emilkowalski
  "emil-design-eng": "designer",
  "review-animations": "designer",
  "improve-animations": "designer",
  "find-animation-opportunities": "designer",
  "pick-ui-library": "designer",
  "apple-design": "designer",
  // auto-improve
  "auto-improve": "improver",
  // nucleus
  "nucleus-agent": "planner",
  "nucleus-init": "planner",
  "nucleus-wayfind": "planner",
  "nucleus-orchestrate": "planner",
  "nucleus-improve": "improver",
  "nucleus-skill-add": "planner",
};

function roleForSkill(id: string): AgentRole | null {
  return ROLE_BY_SKILL[id] ?? null;
}

/** Supplement: skills with no explicit mapping yet. */
function defaultRoles(profile: ProjectProfile): AgentRole[] {
  // Planner + implementer + reviewer + docs are baseline for all projects.
  const roles: AgentRole[] = ["planner", "implementer", "reviewer", "docs"];
  if (profile.domain === "web" || profile.domain === "ui") roles.push("designer");
  if (profile.domain === "ui") roles.push("tester");
  if (profile.domain === "backend" || profile.domain === "fullstack") roles.push("security");
  return roles;
}

// ── Build the DAG ───────────────────────────────────────────────────────────

export function buildOrchestration(
  profile: ProjectProfile,
  bundle: SkillBundle,
  rootTask: string,
): Orchestration {
  // 1. Collect role set from loaded skills + defaults.
  const roleSet = new Set<AgentRole>(defaultRoles(profile));
  for (const ref of bundle.refs) {
    const role = roleForSkill(ref.id);
    if (role) roleSet.add(role);
  }

  // 2. Construct one agent per role, attaching skills it consults.
  const byRole: Map<AgentRole, SubagentSpec> = new Map();
  for (const role of roleSet) {
    const existing = new Set<AgentRole>(roleSet);
    const skillRefs: SkillRef[] = bundle.refs.filter(
      (ref) => roleForSkill(ref.id) === role,
    );
    byRole.set(role, {
      id: role,
      role,
      label: LABEL_BY_ROLE[role],
      skillRefs,
      // Drop downstream edges that point at roles not present in this DAG —
      // a dynamic role set must never reference a missing peer.
      downstream: (DOWNSTREAM_BY_ROLE[role] ?? []).filter((d) =>
        existing.has(d as AgentRole),
      ),
      owns: OWNS_BY_ROLE[role],
      model: modelHint(role, profile),
    });
  }

  // 3. Resolve downstream: replace role names with agent ids (== role ids here).
  const agents = Array.from(byRole.values());

  return {
    agents,
    memory: {
      dirPath: ".agent-forge/memory",
      artifacts: {},
    },
    rootTask,
  };
}

const LABEL_BY_ROLE: Record<AgentRole, string> = {
  planner: "Planner — grilling, decisions, task breakdown",
  researcher: "Researcher — prior art, API surface, docs",
  implementer: "Implementer — TDD, bug diagnosis, build repair",
  reviewer: "Reviewer — code review, contract enforcement",
  tester: "Tester — red-green-refactor, e2e, evals",
  designer: "Designer — UI polish, animation taste, stitch generation",
  security: "Security — scan & threat surface",
  docs: "Docs — README, ADR, glossary upkeep",
  improver: "Improver — GAN-style loop over project artifacts",
};

const OWNS_BY_ROLE: Record<AgentRole, string> = {
  planner: "turning the destination into a sequence of decision tickets",
  researcher: "gathering facts decisions wait on, on throwaway branches",
  implementer: "writing code behind tests, repairing the build",
  reviewer: "fresh-context review of every change before it merges",
  tester: "maintaining the red-green-refactor loop and e2e coverage",
  designer: "the feel of the interface — animation, polish, accessibility",
  security: "the threat surface — prompt/hook/MCP/permission scanning",
  docs: "the shared language — CONTEXT.md, ADRs, CHANGELOG",
  improver: "rubric-gated improvement of READMEs, prompts, copy, contracts",
};

const DOWNSTREAM_BY_ROLE: Record<AgentRole, string[]> = {
  planner: ["researcher", "implementer"],
  researcher: ["implementer", "designer"],
  implementer: ["tester", "reviewer"],
  tester: ["reviewer"],
  reviewer: ["docs", "improver"],
  designer: ["reviewer"],
  security: ["reviewer"],
  docs: [],
  improver: [],
};

function modelHint(role: AgentRole, profile: ProjectProfile): string | undefined {
  // Smol/fast for mechanical roles; capable for planner/reviewer; untouched for others.
  if (role === "tester" || role === "docs") return "smol";
  if (role === "planner" || role === "reviewer") return "slow";
  if (role === "researcher" && profile.domain === "data") return "slow";
  return undefined;
}

// ── Persist ───────────────────────────────────────────────────────────────────

export async function persistOrchestration(
  rootDir: string,
  orch: Orchestration,
): Promise<void> {
  const memDir = join(rootDir, ".agent-forge", "memory");
  await mkdir(memDir, { recursive: true });
  await writeFile(
    join(rootDir, ".agent-forge", "orchestration.json"),
    JSON.stringify(orch, null, 2) + "\n",
    "utf8",
  );
}
