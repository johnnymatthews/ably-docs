// Step 1: gather context for one source PR.
//   node scripts/docs-agent/collect.mjs <pull request URL>      (live, reads the GitHub API)
//   node scripts/docs-agent/collect.mjs --fixture <file.json>   (offline dry run)
// Prints context JSON to stdout. Never writes anything and never executes PR code.
import fs from 'node:fs';
import { DOCS_ROOT, addedLines, identifiers, printJson, readJson, walk } from './lib.mjs';

const MAX_PATCH_CHARS = 20000;
const MAX_TOTAL_PATCH_CHARS = 60000;
const MAX_PAGES = 5;
const MAX_PAGE_CHARS = 12000;

async function loadSource() {
  if (process.argv[2] === '--fixture') {
    return readJson(process.argv[3]).source;
  }
  const match = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(process.argv[2] ?? '');
  if (!match) {
    throw new Error('Expected a pull request URL or --fixture <file>');
  }
  const [, owner, repo, number] = match;
  const headers = {
    Accept: 'application/vnd.github+json',
    ...(process.env.GH_TOKEN && { Authorization: `Bearer ${process.env.GH_TOKEN}` }),
  };
  const get = async (suffix) => {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/${suffix}`, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API ${suffix} returned ${response.status}`);
    }
    return response.json();
  };
  const pr = await get(`pulls/${number}`);
  const files = await get(`pulls/${number}/files?per_page=100`);
  return {
    url: pr.html_url,
    repo: `${owner}/${repo}`,
    number: Number(number),
    title: pr.title,
    body: pr.body ?? '',
    merged: Boolean(pr.merged_at),
    files: files.map((file) => ({
      path: file.filename,
      status: file.status,
      patch: (file.patch ?? '').slice(0, MAX_PATCH_CHARS),
    })),
  };
}

const source = await loadSource();

let budget = MAX_TOTAL_PATCH_CHARS;
let truncated = false;
for (const file of source.files) {
  if (file.patch.length > budget) {
    file.patch = file.patch.slice(0, Math.max(budget, 0));
    truncated = true;
  }
  budget -= file.patch.length;
}

// Existing docs that mention names the PR adds. Names come from added lines only.
const names = identifiers(source.files.map((file) => addedLines(file.patch)).join('\n'));
const docs = [];
for (const file of walk(DOCS_ROOT)) {
  const text = fs.readFileSync(file, 'utf8');
  const matches = [...names].filter((name) => text.includes(name));
  if (matches.length > 0) {
    docs.push({ path: file, matches, text: text.slice(0, MAX_PAGE_CHARS) });
  }
}
docs.sort((a, b) => b.matches.length - a.matches.length);

printJson({ source, truncated, docs: docs.slice(0, MAX_PAGES) });
