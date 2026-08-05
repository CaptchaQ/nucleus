"""improve core — mutate, score, pairwise-judge, commit/discard.

A faithful, dependency-light port of the loop in crimeacs/auto-improve. We keep
the two anti-slop rules from the original:

  1. A **separate judge.** The model that *mutates* never *grades* — grading is
     a fresh call against a rubric.
  2. A **pairwise keep/discard gate.** Candidate vs current champion, evaluated
     in both orderings to cancel position bias. A mutation is kept only when the
     candidate strictly out-votes the champion; ties are discarded.

The feedback loop here is small and explicit so the Node side can shell out to
it with any provider. The provider contract is a single callable:

    call(system: str, user: str) -> str

that hides the wire protocol (Gemini, OpenAI, local, …).
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import difflib
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional

Provider = Callable[[str, str], str]


# ── Dataclasses ───────────────────────────────────────────────────────────────


@dataclass
class Rubric:
    """A markdown rubric — weighted dimensions totaling 100."""

    text: str

    def __post_init__(self) -> None:
        self.text = self.text.strip()


@dataclass
class Candidate:
    text: str
    score: float
    diff: str


@dataclass
class ClimbLog:
    rows: list = field(default_factory=list)

    def append(self, iteration: int, kind: str, score: float) -> None:
        self.rows.append((iteration, kind, f"{score:.2f}"))

    def as_tsv(self) -> str:
        out = "iteration\tevent\tscore\n"
        for i, kind, score in self.rows:
            out += f"{i}\t{kind}\t{score}\n"
        return out


# ── Rubric I/O ────────────────────────────────────────────────────────────────


def load_rubric(path: str) -> Rubric:
    """Load a markdown rubric from a file path."""
    return Rubric(text=Path(path).read_text(encoding="utf-8"))


def infer_rubric(artifact_text: str, goal: str, provider: Provider) -> Rubric:
    """Infer a rubric from the artifact itself, steered by a one-line goal.

    The returned rubric is a markdown file of weighted dimensions totaling 100,
    anchored (50=average, 70=good, 90+ exceptional), reward-framed and specific.
    """
    system = (
        "You write a quality rubric as a markdown file. Weighted dimensions "
        "summing to 100, anchored (50=average, 70=good, 90+ exceptional). "
        "Reward craft, not length. Output ONLY the rubric markdown."
    )
    user = f"--goal\n{goal}\n\n--artifact\n{artifact_text}\n"
    return Rubric(text=provider(system, user))


# ── Mutate ────────────────────────────────────────────────────────────────────


def mutate(
    artifact_text: str,
    rubric: Rubric,
    provider: Provider,
    n: int = 3,
) -> list[str]:
    """Ask the model for N candidate edits, applied as surgical diffs.

    Returns the N candidate full-texts (best-of-N). We request the model return
    a JSON list of rewritten strings; we keep candidates that parse and differ
    from the artifact.
    """
    system = (
        "You mutate a text artifact to improve it against the given rubric. "
        "Make SMALL surgical edits, not wholesale rewrites. Return a JSON array "
        "of N rewritten full-text strings. Output ONLY the JSON array."
    )
    user = (
        f"--rubric\n{rubric.text}\n\n--artifact\n{artifact_text}\n\n--N\n{n}"
    )
    raw = provider(system, user)
    try:
        candidates = json.loads(_strip_fences(raw))
    except (json.JSONDecodeError, ValueError):
        return []
    if not isinstance(candidates, list):
        return [candidates] if isinstance(candidates, str) else []
    out: list[str] = []
    for c in candidates:
        if isinstance(c, str) and c != artifact_text:
            out.append(c)
    return out


# ── Score ─────────────────────────────────────────────────────────────────────


def score(candidate: str, rubric: Rubric, provider: Provider) -> float:
    """Grade a single candidate against the rubric on a 0-100 scale."""
    system = (
        "You grade a text artifact against a rubric and return ONLY a number "
        "0-100. Strict, independent judge. No commentary."
    )
    user = f"--rubric\n{rubric.text}\n\n--artifact\n{candidate}\n"
    raw = provider(system, user)
    m = re.search(r"-?\d+(?:\.\d+)?", raw)
    return float(m.group()) if m and float(m.group()) <= 100 else 0.0


# ── Pairwise gate (debiased) ───────────────────────────────────────────────────


def _vote(ordering: list[str], rubric: Rubric, provider: Provider) -> int:
    """Return 0 if first wins, 1 if second wins, -1 for tie."""
    system = (
        "You are a strict pairwise judge. Anonymise, no commentary. "
        "Output ONLY 'A' if the first option is better, 'B' if the second is "
        "better, 'T' if tied."
    )
    user = (
        f"--rubric\n{rubric.text}\n\n"
        f"--Option A\n{ordering[0]}\n\n--Option B\n{ordering[1]}\n"
    )
    raw = provider(system, user).strip().upper()
    if raw.startswith("A"):
        return 0
    if raw.startswith("B"):
        return 1
    return -1


def run_pairwise_gate(
    candidate: str,
    champion: str,
    rubric: Rubric,
    provider: Provider,
) -> bool:
    """Keep the candidate iff it strictly out-votes champion in both orderings.

    To cancel position bias, the judge sees [Candidate, Champion] and
    [Champion, Candidate]. A win is when the candidate is preferred in both
    orderings; anything else is a discard — including ties.
    """
    a = _vote([candidate, champion], rubric, provider)
    b = _vote([champion, candidate], rubric, provider)
    # a=0 → candidate first wins; b=1 → candidate second wins.
    return a == 0 and b == 1


# ── Diff / apply ──────────────────────────────────────────────────────────────


def unified_diff(before: str, after: str) -> str:
    return "\n".join(
        difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile="before",
            tofile="after",
            n=3,
        )
    )


# ── Git ──────────────────────────────────────────────────────────────────────


def _git(args: list[str], cwd: str) -> str:
    r = subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
    return r.stdout.strip()


def git_branch(tag: str, cwd: str) -> str:
    branch = f"improve/{tag}"
    try:
        _git(["rev-parse", "--verify", branch], cwd)
    except RuntimeError:
        _git(["checkout", "-b", branch], cwd)
    else:
        _git(["checkout", branch], cwd)
    return branch


def commit_keep(cwd: str, artifact: str, score: float) -> str:
    _git(["add", artifact], cwd)
    msg = f"improve: keep ({score:.1f})"
    _git(["commit", "-m", msg], cwd)
    return _git(["rev-parse", "HEAD"], cwd)


# ── Main loop ─────────────────────────────────────────────────────────────────


@dataclass
class ImproveConfig:
    artifact: str
    tag: str
    criteria: Optional[str] = None
    goal: Optional[str] = None
    max_iterations: int = 10
    candidates: int = 3
    eval_runs: int = 2
    threshold: float = 90.0
    provider: Provider = None  # required
    results_dir: str = "results"

    def __post_init__(self) -> None:
        if self.provider is None:
            raise TypeError("ImproveConfig.provider is required")


def improve(cfg: ImproveConfig) -> ClimbLog:
    """Run the GAN-style climb. Returns a ClimbLog; writes results/<tag>.tsv."""
    cwd = os.getcwd()
    artifact_path = Path(cwd, cfg.artifact)
    champion = artifact_path.read_text(encoding="utf-8")

    rubric = (
        load_rubric(cfg.criteria) if cfg.criteria
        else infer_rubric(champion, cfg.goal or "make it measurably better", cfg.provider)
    )
    Path(cfg.results_dir).mkdir(parents=True, exist_ok=True)
    rubric_path = Path(cfg.results_dir, f"{cfg.tag}.rubric.md")
    rubric_path.write_text(rubric.text, encoding="utf-8")

    git_branch(cfg.tag, cwd)
    log = ClimbLog()
    log.append(0, "baseline", score(champion, rubric, cfg.provider))

    for i in range(1, cfg.max_iterations + 1):
        candidates = mutate(champion, rubric, cfg.provider, n=cfg.candidates)
        if not candidates:
            log.append(i, "skip", float("nan"))
            continue

        # Score each candidate (averaged over eval_runs).
        scored = []
        for c in candidates:
            s = sum(score(c, rubric, cfg.provider) for _ in range(cfg.eval_runs)) / max(1, cfg.eval_runs)
            scored.append((s, c))
        scored.sort(key=lambda x: x[0], reverse=True)
        best_score, best = scored[0]

        if best_score >= cfg.threshold:
            log.append(i, "threshold", best_score)
            break

        kept = run_pairwise_gate(best, champion, rubric, cfg.provider)
        if kept:
            artifact_path.write_text(best, encoding="utf-8")
            commit_keep(cwd, cfg.artifact, best_score)
            champion = best
            log.append(i, "keep", best_score)
        else:
            # Revert the working tree to the champion (discard the candidate).
            # Skip the checkout for untracked files — the working tree already
            # is the champion (mutation only materializes on a keep).
            try:
                _git(["ls-files", "--error-unmatch", cfg.artifact], cwd)
            except RuntimeError:
                pass
            else:
                _git(["checkout", "--", cfg.artifact], cwd)
            log.append(i, "discard", best_score)

    Path(cfg.results_dir, f"{cfg.tag}.tsv").write_text(log.as_tsv(), encoding="utf-8")
    return log


# ── Helpers ───────────────────────────────────────────────────────────────────


def _strip_fences(raw: str) -> str:
    """Strip a single surrounding ```json … ``` fence if present."""
    m = re.match(r"^```(?:json)?\s+(.*)```\s*$", raw, re.DOTALL)
    return m.group(1) if m else raw
