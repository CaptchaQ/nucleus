/**
 * wayfinder.ts — Phase 2: decision tickets.
 *
 * Adapted from mattpocock/skills `wayfinder`. After the grilling pins the
 * destination, big efforts are charted as a shared *map* of *decision
 * tickets* — questions whose resolution is a decision, not slices of a build.
 *
 * The map is stored under `.agent-forge/wayfinder.json`. The tracker provider
 * (github | linear | local) is pluggable via `TrackerProvider`; `local` is
 * the zero-dep default and keeps the map inside the repo.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectProfile, WayfinderMap, DecisionTicket, TicketType, TicketMode, TicketState } from "../types.js";

export const MAP_FILE = ".agent-forge/wayfinder.json";

// ── Tracker provider interface ────────────────────────────────────────────────
export interface TrackerProvider {
  createTicket(t: DecisionTicket): Promise<string>;
  closeTicket(id: string, resolution: string): Promise<void>;
  setBlocking(childId: string, parentIds: string[]): Promise<void>;
}

/** Zero-dep local tracker — IDs/edges live in the map object; provider is a no-op. */
export const LocalTracker: TrackerProvider = {
  async createTicket(t) { return t.id; },
  async closeTicket() {},
  async setBlocking() {},
};

// ── Map I/O ──────────────────────────────────────────────────────────────────

export async function loadMap(rootDir: string): Promise<WayfinderMap | null> {
  try {
    const raw = await readFile(join(rootDir, MAP_FILE), "utf8");
    return JSON.parse(raw) as WayfinderMap;
  } catch {
    return null;
  }
}

export async function saveMap(rootDir: string, map: WayfinderMap): Promise<void> {
  await mkdir(join(rootDir, ".agent-forge"), { recursive: true });
  await writeFile(join(rootDir, MAP_FILE), JSON.stringify(map, null, 2) + "\n", "utf8");
}

export function emptyMap(profile: ProjectProfile): WayfinderMap {
  return {
    destination: profile.destination,
    notes: `Domain: ${profile.domain}. Primary harness: ${profile.harness}. Tracker: ${profile.tracker}.`,
    tickets: [],
    decisions: [],
    fog: profile.fog,
    outOfScope: profile.outOfScope.map((gist) => ({ gist, reason: "ruled out at kickoff" })),
  };
}

// ── Ticket factories ─────────────────────────────────────────────────────────

let seq = 0;
export function makeTicket(
  title: string,
  type: TicketType,
  question: string,
  opts: Partial<Pick<DecisionTicket, "blockedBy" | "assets" | "mode">> = {},
): DecisionTicket {
  const id = `wf-${String(++seq).padStart(3, "0")}`;
  return {
    id,
    title,
    type,
    mode: opts.mode ?? (type === "research" ? "AFK" : "HITL"),
    state: "open",
    blockedBy: opts.blockedBy ?? [],
    question,
    assets: opts.assets ?? [],
  };
}

/** Chart the first frontier of tickets from a freshly-grilled profile. */
export function chartInitialFrontier(profile: ProjectProfile): DecisionTicket[] {
  const tickets: DecisionTicket[] = [];

  // Architecture decision: how the system splits into deep modules.
  const arch = makeTicket(
    "Architecture: divide into deep modules",
    "grilling",
    "How does this system split into deep modules (simple interface, a lot of functionality behind it)? Name them.",
  );
  tickets.push(arch);
  const archId = arch.id;

  // Stack confirmation — only if grilling left framework choices ambiguous.
  if (profile.frameworks.length === 0) {
    tickets.push(
      makeTicket(
        "Stack: confirm frameworks",
        "grilling",
        "Which frameworks / runtimes do we commit to? Each gets a one-line rationale.",
        { blockedBy: [archId] },
      ),
    );
  }

  // Feedback loops — types, browser, tests.
  tickets.push(
    makeTicket(
      "Feedback loops: which gates MUST exist",
      "grilling",
      "Which feedback loops are non-negotiable — static types, browser access, unit tests, e2e? What's the red-green-refactor loop here?",
      { blockedBy: [archId] },
    ),
  );

  // Skills to load — depends on domain + harness.
  tickets.push(
    makeTicket(
      "Skills: which bundles to install",
      "grilling",
      `Given domain=${profile.domain}, harness=${profile.harness}: which external skill bundles (mattpocock, ECC, emilkowalski, stitch, prompts.chat, uxcore) and which overlay skills do we load?`,
      { blockedBy: [archId] },
    ),
  );

  // Research tickets run AFK — spawn parallel subagents from the orchestrator.
  tickets.push(
    makeTicket(
      "Research: prior art & API surface",
      "research",
      "What prior art and public APIs do we depend on? Spawn a research subagent; capture findings on a throwaway branch.",
      { mode: "AFK" },
    ),
  );

  return tickets;
}

// ── Frontier computation ─────────────────────────────────────────────────────

export function frontier(map: WayfinderMap): DecisionTicket[] {
  return map.tickets.filter(
    (t) =>
      t.state === "open" &&
      t.blockedBy.every((id) => map.tickets.find((x) => x.id === id)?.state === "closed"),
  );
}

export function claim(map: WayfinderMap, ticketId: string): DecisionTicket | null {
  const t = map.tickets.find((x) => x.id === ticketId);
  if (!t || t.state !== "open") return null;
  t.state = "claimed";
  return t;
}

export function resolve(
  map: WayfinderMap,
  ticketId: string,
  resolution: string,
): DecisionTicket | null {
  const t = map.tickets.find((x) => x.id === ticketId);
  if (!t) return null;
  t.state = "closed";
  t.resolution = resolution;
  map.decisions.push({ title: t.title, url: `#${t.id}`, gist: resolution });
  // Graduate any fog the answer may have sharpened is left to the caller.
  return t;
}

export function ruleOutOfScope(map: WayfinderMap, ticketId: string, reason: string): void {
  const t = map.tickets.find((x) => x.id === ticketId);
  if (!t) return;
  t.state = "out-of-scope";
  map.outOfScope.push({ gist: t.title, reason, url: `#${t.id}` });
}

export function graduateFog(map: WayfinderMap, fogLine: string, into: DecisionTicket): void {
  map.fog = map.fog.filter((f) => f !== fogLine);
  map.tickets.push(into);
}
