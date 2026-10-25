# Generator behavior and measured variety

See GENERATOR_VALIDATION.json for reproducible detailed metrics. Two 5,000-round Mixed seeds, 5,000 cross-mode/topic rounds and all 36 selections ×200 rounds total **22,200 measured rounds**. All80 families/all400 instances are reached. Mode totals: {"evidence":4424,"barrier":4441,"impact":4445,"solution":4443,"tradeoff":4447}. Correct positions: 5531 / 5633 / 5496 / 5540 (about25% each).

Zero avoidable exact50, previous-three-family or immediate-barrier-repeat violations under an independent eligible-pool oracle. Both Mixed runs have zero actual exact50, family3 and immediate-barrier repeats. Across the combined simulations, necessary narrow-pool fallbacks produce 5725 actual exact50 repeats, 6252 actual family3 repeats and 12 consecutive barrier repeats. These are reported, not hidden as zero. The 15–20-instance selected pools cannot support a50-instance no-repeat window indefinitely.

Selection is bounded and deterministic with a seed. Preserve one history of50 IDs across modes/topics/reload within the shared daily session. Exclude recent exact instances first; apply family3 if possible, then barrier2, then barrier1 if barrier2 is infeasible. Weighted mode/topic/barrier/family selection balances coverage without forced alternation. If all eligible instances are recent, retain the longest feasible suffix of recent history. Family cooldown relaxes before exact history. Never broaden a selected filter silently. The UI states narrow pool/family counts. A new daily or manually reset shared session starts new repeat history.

The finite content inventory and operational details can still feel related. Further expansion should add new reasoning frames, not just new place names or numeric scales.
