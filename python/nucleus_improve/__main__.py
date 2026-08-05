"""CLI entry: `python -m nucleus_improve`.

Mirrors the ``improve.py`` interface from crimeacs/auto-improve so the Node
side can shell out with familiar flags. Resolves a provider from the
environment (Gemini → OpenAI) and pipes config into ``improve()``.
"""

from __future__ import annotations

import argparse
import os
import sys

from .core import ImproveConfig, improve
from .providers import gemini_provider, openai_provider, dummy_provider


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="nucleus-improve", description=__doc__)
    p.add_argument("--artifact", required=True, help="file to improve (inside a git repo)")
    p.add_argument("--criteria", help="markdown rubric; omit to auto-infer")
    p.add_argument("--goal", help="one-line intent steering the inferred rubric")
    p.add_argument("--tag", required=True, help="run id → branch improve/<tag>")
    p.add_argument("--max-iterations", type=int, default=10)
    p.add_argument("--candidates", type=int, default=3)
    p.add_argument("--eval-runs", type=int, default=2)
    p.add_argument("--threshold", type=float, default=90.0)
    p.add_argument("--status", action="store_true", help="show a finished run's results")
    p.add_argument("--dummy", action="store_true", help="offline/deterministic provider")
    p.add_argument("--provider", choices=["gemini", "openai"], default="gemini")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.status:
        from pathlib import Path
        tsv = Path(args.results_dir if hasattr(args, "results_dir") else "results", f"{args.tag}.tsv")
        if tsv.exists():
            print(tsv.read_text(encoding="utf-8"))
        else:
            print(f"no run found for tag {args.tag}", file=sys.stderr)
        return 0

    if args.dummy:
        provider = dummy_provider()
    elif args.provider == "openai":
        provider = openai_provider()
    else:
        provider = gemini_provider()

    cfg = ImproveConfig(
        artifact=args.artifact,
        tag=args.tag,
        criteria=args.criteria,
        goal=args.goal,
        max_iterations=args.max_iterations,
        candidates=args.candidates,
        eval_runs=args.eval_runs,
        threshold=args.threshold,
        provider=provider,
    )
    log = improve(cfg)
    rows = "\n".join(f"  iter={i}  {kind}  {score}" for i, kind, score in log.rows)
    print(f"improve run {args.tag}:\n{rows}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
