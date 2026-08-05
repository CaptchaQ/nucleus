/**
 * grill.ts — Phase 1: relentless interview.
 *
 * Inspired by mattpocock/skills `grill-me`, `grilling`, and `grill-with-docs`.
 * The agent asks one question at a time, walks the decision tree depth-first,
 * resolves dependencies between decisions, and for each question offers a
 * recommended answer. Facts are looked up, not asked. Decisions are the user's.
 *
 * Output: a ProjectProfile locked into `.agent-forge/profile.json` plus an
 * evolving ADR set under `docs/adr/` and a glossary in `CONTEXT.md`.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type {
  GlossaryTerm,
  ProjectDomain,
  ProjectProfile,
  TechChoice,
} from "../types.js";

// ── Question bank ─────────────────────────────────────────────────────────────
// Breadth-first across layers, then descend into dependencies. Each question
// carries a recommended answer the agent can offer; the user overrides freely.

export interface GrillQuestion {
  id: string;
  layer: "identity" | "domain" | "stack" | "harness" | "tracker" | "quality" | "scope";
  /** The question, asked in one sentence. */
  prompt: string;
  /** A recommended answer the agent can offer. Empty = no recommendation. */
  recommend?: string;
  /** Question ids that must be answered before this one is meaningful. */
  dependsOn?: string[];
  /** Domains for which this question is relevant. Empty = always. */
  domains?: ProjectDomain[];
  help?: string;
}

export const GRILL_QUESTIONS: GrillQuestion[] = [
  {
    id: "name",
    layer: "identity",
    prompt: "Как называется проект? Одно-два слова.",
    recommend: "",
  },
  {
    id: "destination",
    layer: "identity",
    prompt: "Что значит «дойти до конца»? Опишите destination одной-тремя строками — что должно появиться.",
    help: "destination фиксирует scope: всё за его пределом — out of scope.",
  },
  {
    id: "domain",
    layer: "domain",
    prompt: "К какой области относится проект (web / ui / backend / fullstack / data / cli / mobile / infra / content)?",
    dependsOn: ["destination"],
  },
  {
    id: "languages",
    layer: "stack",
    prompt: "На каких языках пишем? Перечислите основные.",
    domains: ["web", "backend", "fullstack", "data", "ml", "cli", "mobile", "infra"],
  },
  {
    id: "frameworks",
    layer: "stack",
    prompt: "Фреймворки / рантаймы / ключевые библиотеки?",
    domains: ["web", "ui", "backend", "fullstack", "data", "ml", "mobile"],
  },
  {
    id: "harness",
    layer: "harness",
    prompt: "В каком агент-харнессе вы работаете (claude-code / codex / cursor / opencode / gemini / zed)?",
    recommend: "claude-code",
  },
  {
    id: "tracker",
    layer: "tracker",
    prompt: "Issue-трекер: GitHub Issues, Linear или локальные markdown-файлы?",
    recommend: "github",
  },
  {
    id: "quality",
    layer: "quality",
    prompt: "Какие обратные связи у вас есть (статические типы / браузерный доступ / тесты / e2e)? Какие MUST быть?",
    domains: ["web", "ui", "backend", "fullstack", "data", "ml", "mobile"],
  },
  {
    id: "out-of-scope",
    layer: "scope",
    prompt: "Что точно НЕ входит в этот проект? Что вы осознанно отсекаете?",
  },
  {
    id: "glossary",
    layer: "scope",
    prompt: "Есть ли термины, которые агент должен знать заранее (предметная область, аббревиатуры)?",
    help: "Общий язык уменьшает многословность агента и экономит токены.",
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

export interface GrillAnswers {
  [questionId: string]: string;
}

export interface GrillResult {
  profile: ProjectProfile;
  adrDir: string;
  contextFile: string;
}

/**
 * Build a ProjectProfile from the user's answers. The CLI drives the actual
 * interview (one question at a time) and passes the collected answers here.
 */
export function buildProfile(answers: GrillAnswers): ProjectProfile {
  const domain = (answers.domain ?? "fullstack") as ProjectDomain;
  const languages = listSplit(answers.languages);
  const frameworks = listSplit(answers.frameworks);
  const harness = (answers.harness ?? "claude-code") as ProjectProfile["harness"];
  const tracker = (answers.tracker ?? "github") as ProjectProfile["tracker"];
  const decisions: TechChoice[] = [];
  if (languages.length) decisions.push({ layer: "languages", choice: languages.join(", "), rationale: answers.languages ?? "" });
  if (frameworks.length) decisions.push({ layer: "frameworks", choice: frameworks.join(", "), rationale: answers.frameworks ?? "" });
  if (answers.harness) decisions.push({ layer: "harness", choice: harness, rationale: "primary coding agent" });
  if (answers.tracker) decisions.push({ layer: "tracker", choice: tracker, rationale: "where decision tickets live" });
  if (answers["out-of-scope"]) decisions.push({ layer: "scope", choice: "excluded", rationale: answers["out-of-scope"] });
  const glossary: GlossaryTerm[] = listTerms(answers.glossary);
  const outOfScope = listSplit(answers["out-of-scope"]);

  return {
    name: answers.name ?? "unnamed",
    destination: answers.destination ?? "(не указан)",
    domain,
    languages,
    frameworks,
    harness,
    tracker,
    decisions,
    glossary,
    outOfScope,
    fog: [],
    skillRefs: [],
  };
}

function listSplit(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse "term: definition" lines into glossary entries. */
function listTerms(raw?: string): GlossaryTerm[] {
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .map((line) => line.split(/:(.*)/s))
    .map((parts): [string, string] | null => {
      const term = parts[0]?.trim();
      const definition = parts[1]?.trim();
      return term && definition ? [term, definition] : null;
    })
    .filter((p): p is [string, string] => p !== null)
    .map(([term, definition]) => ({ term, definition }));
}

/** Persist a ProjectProfile as a JSON file plus an ADR + CONTEXT.md skeleton. */
export async function persistProfile(rootDir: string, profile: ProjectProfile): Promise<GrillResult> {
  const forgeDir = join(rootDir, ".agent-forge");
  const profilePath = join(forgeDir, "profile.json");
  const adrDir = join(rootDir, "docs", "adr");
  const contextFile = join(rootDir, "CONTEXT.md");

  await mkdir(forgeDir, { recursive: true });
  await mkdir(adrDir, { recursive: true });
  await mkdir(dirname(contextFile), { recursive: true });

  await writeFile(profilePath, JSON.stringify(profile, null, 2) + "\n", "utf8");
  await writeFile(join(adrDir, "0001-destination.md"), adrTemplate(profile), "utf8");
  await writeFile(contextFile, contextTemplate(profile), "utf8");

  return { profile, adrDir: resolve(adrDir), contextFile: resolve(contextFile) };
}

function adrTemplate(p: ProjectProfile): string {
  return `# ADR-0001 — Destination

Status: accepted
Date: ${new Date().toISOString().slice(0, 10)}

## Destination

${p.destination}

## Domain

${p.domain}

## Decisions locked at kickoff

${p.decisions.map((d) => `- **${d.layer}**: ${d.choice} — ${d.rationale}`).join("\n") || "_(none yet)_"}

## Out of scope

${p.outOfScope.length ? p.outOfScope.map((s) => `- ${s}`).join("\n") : "_(nothing ruled out yet)_"}
`;
}

function contextTemplate(p: ProjectProfile): string {
  return `# ${p.name}

${p.destination}

## Ubiquitous language

${p.glossary.length ? p.glossary.map((g) => `- **${g.term}** — ${g.definition}`).join("\n") : "_(empty — fill as the project finds its language)_"}
`;
}
