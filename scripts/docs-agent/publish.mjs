// Step 5: turn a verified draft into a draft docs PR and the one comment.
//   node scripts/docs-agent/publish.mjs verified.json --dry-run <outDir>   (writes files, touches nothing else)
//   GH_TOKEN=... node scripts/docs-agent/publish.mjs verified.json          (branch, push, open draft PR)
// Only this step holds a GitHub write token. It never merges.
// NOTE: the live path below has not been run yet. The dry run has.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { printJson, readJson, renderComment, renderPrBody } from './lib.mjs';

const verified = readJson(process.argv[2]);
const dryRun = process.argv[3] === '--dry-run';
const { source, routing, verification } = verified;

const prBody = (draftUrl) => ({
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
  const { body, comment } = prBody('<draft PR URL appears here>');
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

const git = (...args) => execFileSync('git', args, { stdio: 'inherit' });
const branch = `docs-agent/${source.repo.replace('/', '-')}-${source.number}`;

git('config', 'user.name', 'docs-agent');
git('config', 'user.email', 'docs-agent@users.noreply.github.com');
git('checkout', '-b', branch);
for (const edit of verified.edits) {
  fs.mkdirSync(path.dirname(edit.path), { recursive: true });
  fs.writeFileSync(edit.path, edit.content);
  git('add', edit.path);
}
git('commit', '-m', `docs: draft for ${source.repo}#${source.number}\n\nDrafted by the Docs Agent. Source: ${source.url}`);
git('push', '-u', 'origin', branch);

const api = async (url, init) => {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'content-type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
};

const base = process.env.DOCS_BASE_BRANCH ?? 'main';
const pr = await api(`https://api.github.com/repos/${repository}/pulls`, {
  method: 'POST',
  body: JSON.stringify({
    title: `docs: draft for ${source.repo}#${source.number}: ${source.title}`,
    head: branch,
    base,
    draft: true,
    body: prBody('').body,
  }),
});

// The comment on the source PR needs a token that can write there. Without one, print it.
const { comment } = prBody(pr.html_url);
const commentToken = process.env.SOURCE_REPO_TOKEN;
if (commentToken) {
  await fetch(`https://api.github.com/repos/${source.repo}/issues/${source.number}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${commentToken}`, Accept: 'application/vnd.github+json', 'content-type': 'application/json' },
    body: JSON.stringify({ body: comment }),
  });
} else {
  console.log(`No SOURCE_REPO_TOKEN, so not commenting on ${source.url}. Comment would be:\n\n${comment}`);
}
printJson({ draft_pr: pr.html_url });
