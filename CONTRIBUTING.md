# Contributing

Thanks for looking at this. The project is a skill (prose instructions plus one script), so most contributions are to the instructions, and the best way to improve instructions is with evidence from real runs.

## The most useful contribution: a run that went wrong

Open an issue titled `run: <owner>/<repo>` with:

1. The input URL and the exact question you asked.
2. The output you got (paste it, or attach the markdown).
3. What a knowledgeable person in that niche would have said instead — which repos were missed, which shouldn't be there, which group was wrong, which verdict you disagree with and why.

That third point is the valuable one. Nobody can hold expertise in every niche, and the skill is only as good as the facet decompositions it has been corrected on.

## Changing the skill

- `skills/github-similar-repos/SKILL.md` is the workflow. Keep it under ~150 lines; move detail into `references/`.
- Explain the *why* behind an instruction rather than adding another MUST. The model following the skill is capable; what it needs is the reasoning so it can generalise.
- Prefer removing something that isn't pulling its weight over adding a rule for a single case.
- Before opening a PR, run the skill on at least two repos from different domains (one you know well, one you don't) and include the outputs in the PR. `examples/` shows the format.

## Changing `repo_health.py`

- It deliberately produces a *dependability* score, not a relevance score. Keep that boundary: nothing in the script should decide what is similar.
- Any new signal should be shown as a column, not only folded into the score. Users should be able to see what produced the number.
- Keep it dependency-free (standard library only) so it runs anywhere Python does.

## Adding an example

Put the full output in `examples/<owner>-<repo>.md` and add a row to the table in both READMEs. Outputs may be in any language; say which model and date produced them in a one-line HTML comment at the top.

## Style

- Plain language, short sentences, no filler.
- English in `SKILL.md` and `references/` (it's read by models and contributors worldwide). READMEs are maintained in English and Simplified Chinese; if you change one, change both or note in the PR that the other needs updating.
