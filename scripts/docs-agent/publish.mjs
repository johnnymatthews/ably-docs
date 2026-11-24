// Step 5: turn a verified draft into a draft docs PR and the one comment.
//   node scripts/docs-agent/publish.mjs verified.json --dry-run <outDir>   (writes files, touches nothing else)
//   GH_TOKEN=... GITHUB_REPOSITORY=... node scripts/docs-agent/publish.mjs verified.json   (branch, push, open draft PR)
// Only this step holds a GitHub write token. It never merges.
// NOTE: the live path below has not been run yet. The dry run has.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { applyReplacements, printJson, readJson, renderComment, renderPrBody } from './lib.mjs';

const verified = readJson(process.argv[2]);
const dryRun = process.argv[3] === '--dry-run';
const { source, routing, verification } = verified;

const render = (draftUrl) => ({
  body: renderPrBody({ source, draft: verified, routing, verification }),
  comment: renderComment({
    summary: verified.summary,
    draftUrl,
    previewUrl: '',
    notSure: verification.not_sure,
  }),
});

if (dryRun) {
  const outDir = process.argv[4];
  fs.mkdirSync(outDir, { recursive: true });
  const { body, comment } = render('<draft PR URL appears here>');
  fs.writeFileSync(path.join(outDir, 'pr-body.md'), body);
  fs.writeFileSync(path.join(outDir, 'comment.md'), comment);
  fs.writeFileSync(path.join(outDir, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`);
  printJson({ wrote: ['pr-body.md', 'comment.md', 'verification.json'], dir: outDir });
  process.exit(0);
}

const token = process.env.GH_TOKEN;
const repository = process.env.GITHUB_REPOSITORY; // for example johnnymatthews/ably-docs
if (!token || !repository) {
  throw new Error('GH_TOKEN and GITHUB_REPOSITORY are required for a live run');
}
if (verified.edits.length === 0) {
  console.log('The verified draft has no edits, so there is nothing to publish.');
  process.exit(0);
}

const git = (...args) => execFileSync('git', args, { stdio: 'inherit' });
const suffix = process.env.DOCS_AGENT_RUN ? `-${process.env.DOCS_AGENT_RUN}` : '';
const branch = `docs-agent/${source.repo.replace('/', '-')}-${source.number}${suffix}`;
const base = process.env.DOCS_BASE_BRANCH ?? 'main';

git('config', 'user.name', 'docs-agent');
git('config', 'user.email', 'docs-agent@users.noreply.github.com');
git('checkout', '-b', branch);
for (const edit of verified.edits) {
  if (edit.action === 'create') {
    fs.mkdirSync(path.dirname(edit.path), { recursive: true });
    fs.writeFileSync(edit.path, edit.content);
  } else {
    const { text, errors } = applyReplacements(fs.readFileSync(edit.path, 'utf8'), edit.replacements);
    if (errors.length > 0) {
      throw new Error(`Verified replacements no longer apply to ${edit.path}: ${errors.join('; ')}`);
    }
    fs.writeFileSync(edit.path, text);
  }
  git('add', edit.path);
}
git('commit', '-m', `docs: draft for ${source.repo}#${source.number}\n\nDrafted by the Docs Agent. Source: ${source.url}`);
git('push', '-u', 'origin', branch);

const api = async (url, init = {}, bearer = token) => {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/vnd.github+json', 'content-type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  }
  return response.json();
};

const pr = await api(`https://api.github.com/repos/${repository}/pulls`, {
  method: 'POST',
  body: JSON.stringify({
    title: `docs: draft for ${source.repo}#${source.number}: ${source.title}`.slice(0, 250),
    head: branch,
    base,
    draft: true,
    body: render('').body,
  }),
});

// The comment belongs on the feature PR. Without a token that can write there (the replay case),
// post it on the draft docs PR instead, clearly labelled.
const { comment } = render(pr.html_url);
const sourceToken = process.env.SOURCE_REPO_TOKEN;
if (sourceToken) {
  await api(
    `https://api.github.com/repos/${source.repo}/issues/${source.number}/comments`,
    { method: 'POST', body: JSON.stringify({ body: comment }) },
    sourceToken,
  );
} else {
  await api(`https://api.github.com/repos/${repository}/issues/${pr.number}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      body: `**Replay:** this is the comment the Docs Agent would post on ${source.url}.\n\n---\n\n${comment}`,
    }),
  });
}
printJson({ draft_pr: pr.html_url });
