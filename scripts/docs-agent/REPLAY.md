# Replay: React Native push

A replay checks the Docs Agent against a case where the answer is known.

| | |
|---|---|
| Feature PR (input) | https://github.com/ably/ably-js/pull/2262, "[AIT-850] feat: react native push plugin", merged 2026-07-17 |
| Docs state the agent starts from | `d9c8677a`, the commit just before docs PR #3478 merged |
| Docs PR written by a person (ground truth) | `ably/docs` #3478, merge commit `7f991f39`, 2026-07-24 |
| Replay branch | `replay/ably-js-2262-react-native-push` (docs at `d9c8677a` plus the Docs Agent files) |

## Why this pair

The ably-js PR adds a user-facing plugin, and the docs PR a week later documents it, so a person's answer exists to compare with. The docs PR touched three pages and the nav file: `push/getting-started/react-native.mdx`, `push/configure/device.mdx`, `api/realtime-sdk/push.mdx` and `src/data/nav/pubsub.ts`.

## Run it

Actions, Docs Agent, **Run workflow**. Choose the replay branch, then set:

- `source_pr`: `https://github.com/ably/ably-js/pull/2262`
- `use_model`: ticked (needs the `DOCS_AGENT_MODEL_KEY` secret)
- `publish`: ticked to open a draft PR against the replay branch, or unticked for a dry run

## Compare

The person's version of the change:

```bash
git diff d9c8677a 7f991f39 -- src/pages/docs src/data/nav
```

The agent's version is the draft PR's diff.

## Limits to state when presenting

- The docs PR also made choices a code diff does not decide, such as how the existing React Native guide is reorganised and how it is worded. Expect the agent's draft to differ in structure even where it is factually right.
- The context heuristic (PR-title words against page paths) was written after looking at this pair, so one good result does not show it generalises. It needs more replays.
- This is one replay. Treat it as a demonstration of the method, not a measurement.
