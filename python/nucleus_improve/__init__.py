"""GAN-style self-improvement loop for any text artifact.

Adapted from crimeacs/auto-improve. The mutator and evaluator never share
context; candidates are pairwise-judged debiased (both orderings); only
verified wins are committed. The git history is the improvement log.

This module is imported by the Node CLI via `python -m nucleus_improve`.
"""

from .core import improve, load_rubric, infer_rubric, run_pairwise_gate

__all__ = ["improve", "load_rubric", "infer_rubric", "run_pairwise_gate"]
__version__ = "0.1.0"
