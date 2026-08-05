/**
 * Nucleus core types — the contract between phases.
 *
 * Phases:
 *   grill   → relentless interview, produces a ProjectProfile + DecisionLog
 *   wayfind → decision tickets resolved one at a time until the route is clear
 *   load    → resolve a SkillBundle (external + overlay) for the resolved profile
 *   orchestrate → spin up subagents mapped to skill domains, with a memory store
 *   improve → GAN-style loop over project artifacts; git history is the log
 *   skill   → add/inspect custom skills under .agent-forge/skills/<name>/
 */

// ─────────────────────────────────────────────────────────────────────────────
// Project profile — the output of the grilling phase, the input to loading.
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectDomain =
  | "web"
  | "ui"
  | "backend"
  | "fullstack"
  | "data"
  | "ml"
  | "cli"
  | "mobile"
  | "infra"
  | "content";

export type Harness = "claude-code" | "codex" | "cursor" | "opencode" | "gemini" | "zed";

export interface TechChoice {
  /** Layer this choice belongs to: language, framework, data, deploy, etc. */
  layer: string;
  /** What was chosen. */
  choice: string;
  /** Why — one line. ADR-worthy rationale. */
  rationale: string;
}

export interface ProjectProfile {
  /** Human-readable project name. */
  name: string;
  /** One-to-three line destination statement. */
  destination: string;
  /** Coarse domain bucket — drives the default skill bundle. */
  domain: ProjectDomain;
  /** Primary language(s). */
  languages: string[];
  /** Frameworks / runtimes. */
  frameworks: string[];
  /** Coding agent harness the user drives. */
  harness: Harness;
  /** Issue tracker: github | linear | local */
  tracker: "github" | "linear" | "local";
  /** Decisions locked during grilling, each with rationale. */
  decisions: TechChoice[];
  /** Ubiquitous-language terms — a shared glossary for the agent + human. */
  glossary: GlossaryTerm[];
  /** Out-of-scope work, ruled out during grilling. */
  outOfScope: string[];
  /** Fog — suspected decisions not yet sharp enough to ticket. */
  fog: string[];
  /** Skills the profile recommends loading (resolved by the loader). */
  skillRefs: SkillRef[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skill references — how the loader finds skills across sources.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A skill reference is a pointer that works across sources.
 *
 * - `external`  → installed via `npx skills add <repo>` (mattpocock, ECC, emilkowalski, stitch)
 * - `overlay`   → lives under `.agent-forge/skills/<name>/SKILL.md` in the user's repo
 * - `builtin`   → shipped with nucleus itself (nucleus-init, nucleus-orchestrate, …)
 */
export type SkillSource = "external" | "overlay" | "builtin";

export interface SkillRef {
  /** Canonical id, lowercase kebab. */
  id: string;
  /** Where it comes from. */
  source: SkillSource;
  /**
   * For `external`: the `owner/repo` slug installable via `npx skills add`.
   * For `overlay`/`builtin`: the directory path relative to the overlay / builtin root.
   */
  origin: string;
  /** One-line purpose, shown in the catalog. */
  summary: string;
  /** Domains this skill is relevant to. Empty = all. */
  domains: ProjectDomain[];
  /** Optional hard dependencies on other skill ids. */
  dependsOn?: string[];
}

export interface ResolvedSkill extends SkillRef {
  /** Absolute path to the SKILL.md (external installs into the harness dir; overlay/builtin in-repo). */
  path: string;
  /** Raw frontmatter parsed from the SKILL.md. */
  frontmatter: SkillFrontmatter;
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  "disable-model-invocation"?: boolean;
  "user-invocable"?: boolean;
  [k: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wayfinder — decision tickets.
// ─────────────────────────────────────────────────────────────────────────────

export type TicketType = "research" | "prototype" | "grilling" | "task";
export type TicketMode = "HITL" | "AFK";
export type TicketState = "open" | "claimed" | "closed" | "blocked" | "out-of-scope";

export interface DecisionTicket {
  id: string;
  title: string;
  type: TicketType;
  mode: TicketMode;
  state: TicketState;
  /** Child ticket ids this one blocks until closed. */
  blockedBy: string[];
  /** One-line question whose resolution is a decision. */
  question: string;
  /** Resolution recorded on close; undefined while open. */
  resolution?: string;
  /** Assets (branches, prototypes, notes) linked from the ticket. */
  assets: string[];
}

export interface WayfinderMap {
  destination: string;
  notes: string;
  tickets: DecisionTicket[];
  decisions: { title: string; url: string; gist: string }[];
  fog: string[];
  outOfScope: { gist: string; reason: string; url?: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator — subagent DAG.
// ─────────────────────────────────────────────────────────────────────────────

export type AgentRole =
  | "planner"
  | "researcher"
  | "implementer"
  | "reviewer"
  | "tester"
  | "designer"
  | "security"
  | "docs"
  | "improver";

export interface SubagentSpec {
  /** Stable id for cross-agent messaging. */
  id: string;
  role: AgentRole;
  /** Human label shown in logs. */
  label: string;
  /** Skills this agent is expected to consult. */
  skillRefs: SkillRef[];
  /** Peer agent ids it may send work to. */
  downstream: string[];
  /** What this agent owns end-to-end. */
  owns: string;
  /** Model hint (agent harness decides). */
  model?: string;
}

export interface Orchestration {
  /** The DAG of agents. Edges implied by each spec's `downstream`. */
  agents: SubagentSpec[];
  /** Memory store pointer — where shared state lives. */
  memory: MemoryStore;
  /** Root task the orchestrator drives toward. */
  rootTask: string;
}

export interface MemoryStore {
  /** Path under `.agent-forge/` where shared state is persisted. */
  dirPath: string;
  /** Scratch artifacts keyed by name. */
  artifacts: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Improve — GAN-style loop config (delegated to the Python bridge).
// ─────────────────────────────────────────────────────────────────────────────

export interface ImproveConfig {
  /** File to improve, inside a git repo. */
  artifact: string;
  /** Optional rubric; omitted → infer one. */
  criteria?: string;
  /** One-line goal steering the inferred rubric. */
  goal?: string;
  /** Run id → git branch `improve/<tag>`, results `<tag>.tsv`. */
  tag: string;
  maxIterations: number;
  candidates: number;
  evalRuns: number;
  threshold: number;
  /** Mutator model (env IMPROVE_MUTATOR fallback). */
  mutator?: string;
  /** Evaluator model (env IMPROVE_EVALUATOR fallback). */
  evaluator?: string;
  /** API key env var name to pull from the process env. */
  apiKeyEnv?: "GEMINI_API_KEY" | "GOOGLE_API_KEY" | "OPENAI_API_KEY";
}
