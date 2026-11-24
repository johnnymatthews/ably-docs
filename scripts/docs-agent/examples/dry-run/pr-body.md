Source PR: https://github.com/example-org/example-sdk/pull/1
Drafted by the Docs Agent. A person must review before merge.

**Summary:** I read this PR and think it lets you cap how many times a failed publish is retried, so that a stuck publish fails fast instead of retrying without limit.

**Files changed**
- `src/pages/docs/channels/retry-limit-demo.mdx` (drafted)

**Not sure about**
- What the default limit is
- Whether `resetRetries` exists (not found in the PR or the existing docs)
- resetRetries restores the default limit
- Failures past the limit reject with code 49999

**Source-of-truth warnings**
- error code without registry entry: The PR uses five-digit error codes that have no page yet (49999) and changes no registry entry, so no error page will be generated.

**Verification:** 3 claims checked, 2 failed. Names in code samples not found in the PR or existing docs: 1. Edits rejected: 2.
**Engineer response:** none yet

### Checklist

- [ ] Commits have been rebased.
- [ ] Linting has been run against the changed file(s).
- [ ] The PR adheres to the [writing style guide](../blob/main/writing-style-guide.md) and [contribution guide](../blob/main/CONTRIBUTING.md).
