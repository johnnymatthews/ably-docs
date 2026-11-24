# First replay result: ably-js #2262 (React Native push)

Run: Actions run 45399179906 on `replay/ably-js-2262-react-native-push`, model on, publish on. The agent's draft is PR #2 in this fork. The person's version is `git diff d9c8677a 7f991f39`.

This is one replay with one model run. The agent's output varies between runs, so treat it as an example, not a measurement.

## What the agent did

- Changed one file (`push/getting-started/react-native.mdx`): corrected the note that said `push.activate()` can't be used in React Native, and added a section that shows the `ably/react-native-push` plugin.
- Left `push/configure/device.mdx`, `api/realtime-sdk/push.mdx` and the nav file alone, and said why.
- Verifier: 7 claims checked, 0 failed, 0 unknown names in code, 0 rejected edits.

## What the person did

Changed four files (135 lines added, 60 removed). The biggest decision was to rewrite the whole React Native guide around the plugin, replacing the older flow that registered devices through the admin API.

## Comparison

| | Agent | Person |
|---|---|---|
| Plugin code sample | `ReactNativePush.create({ storage, requestToken })` with `plugins: { Push }` and `client.getDevice()` | Same shape and names |
| Whether to rewrite the guide around the plugin | Did not. Flagged it as a product decision | Did |
| SDK version note (2.25.0 or later) | Left out, and flagged that the PR does not state it | Added |
| `push-subscribe` capability in the API key requirements | Missed | Added |
| `@react-native-async-storage/async-storage` in the install step | Missed. Its own sample imports it | Added |
| API reference and device configuration pages | Left unchanged, and flagged | Updated |
| Nav entry | Not needed for its change | Added a nav link for the guide |

## Reading the result

- **Precision was good.** Nothing the agent wrote contradicts the PR, and its code sample matches the person's.
- **Recall was low.** It changed one of the four files the person changed, and missed two small steps that would leave a reader's copy of the sample broken (the install command and the key capability).
- **The verifier can't catch omissions.** It checks that names exist and claims have evidence. It cannot see that the install step is missing. That needs a different check, for example comparing every import in a new code sample against the page's install step.
- **The agent flagged the right doubts.** The SDK version, whether to rewrite the guide around the plugin, and the API reference page were all on its "not sure" list, and the person addressed all three (a version note, the rewrite, and an update to the API reference page; I did not check what the reference change says).
