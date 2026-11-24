# Docs Agent (demo)

A working sketch of the pipeline described in [DESIGN.md](DESIGN.md): a feature PR gets a draft docs PR and one short comment, a person reviews, and nothing merges automatically.

This is a demo built in a fork of the archived `ably/docs` repo. It is not wired into any Ably repository.

## What runs today

| Step | Script | Status |
|---|---|---|
| 1. Collect context | `collect.mjs` | Fixture path tested. Live path (GitHub API) not yet run. |
| 2. Route pages | `route.mjs` + `routing.json` | Tested on the fixture. |
| 3. Draft | `draft.mjs` | Canned path tested. The live model call is written but not yet run. |
| 4. Verify | `verify.mjs` | Tested on the fixture. |
| 5. Publish | `publish.mjs` | Dry run tested. Live branch, push and PR code is written but not yet run. |

The workflow is `.github/workflows/docs-agent.yml`. It runs the five steps and uploads the PR body and comment as an artifact. It does not open a PR yet.

## Try it offline

```bash
D=scripts/docs-agent; T=$(mktemp -d)
node $D/collect.mjs --fixture $D/fixtures/synthetic-pr.json > $T/context.json
node $D/route.mjs $T/context.json > $T/routed.json
node $D/draft.mjs $T/routed.json --canned $D/fixtures/synthetic-pr.json > $T/draft.json
node $D/verify.mjs $T/draft.json $T/routed.json > $T/verified.json
node $D/publish.mjs $T/verified.json --dry-run $T/out
```

The fixture is synthetic. Its repository, method names and error code are invented, and its canned draft contains planted mistakes so the verifier has something to catch. See `examples/dry-run/` for the output.

## Edit contract

Existing files change through exact find-and-replace patches (`replacements`), each of which must match exactly once. New pages use `create` with full content. Navigation is edited the same way, so the agent is shown the nav file that already links to the pages it is editing. This keeps edits to 20,000-character pages small and checkable.

## Replay

A replay rewinds this repo to the commit before a real docs PR, runs the agent on the matching SDK PR, and lets you compare the draft with what a person wrote. See `REPLAY.md`, and `REPLAY-RESULT.md` for the first result.

## Known gaps

- Generators are listed in `routing.json` but not run by the pipeline yet.
- Reactions on the comment, the reply handler and the run log (DESIGN.md sections 8 and 11) are not built.
- Third-party actions in the workflow are not yet pinned to commit SHAs.
