// Step 1: gather context for one source PR.
//   node scripts/docs-agent/collect.mjs <pull request URL>      (live, reads the GitHub API)
//   node scripts/docs-agent/collect.mjs --fixture <file.json>   (offline dry run)
// Prints context JSON to stdout. Never writes anything and never executes PR code.
import fs from 'node:fs';
import { DOCS_ROOT, addedLines, identifiers, pageUrl, printJson, readJson, walk } from './lib.mjs';

const NAV_ROOT = 'src/data/nav';

const MAX_PATCH_CHARS = 20000;
const MAX_TOTAL_PATCH_CHARS = 60000;
const MAX_PAGES = 4;
const MAX_PAGE_CHARS = 30000;

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

// Existing docs to show the agent. A page scores for each name the PR adds that it already mentions,
// and for each word of the PR title that appears in its path (for example "react native" matches
// push/getting-started/react-native). No page is ever chosen by hand.
const STOP = new Set(['feat', 'fix', 'add', 'adds', 'support', 'update', 'plugin', 'with', 'from', 'that', 'this', 'into', 'docs', 'chore', 'refactor', 'remove']);
const titleWords = new Set(
  source.title
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !STOP.has(word)),
);
const names = identifiers(source.files.map((file) => addedLines(file.patch)).join('\n'));

const candidates = [];
for (const file of walk(DOCS_ROOT)) {
  const text = fs.readFileSync(file, 'utf8');
  const matches = [...names].filter((name) => text.includes(name));
  const segments = new Set(file.toLowerCase().split(/[/.-]/));
  const pathHits = [...titleWords].filter((word) => segments.has(word));
  const score = matches.length + 2 * pathHits.length;
  if (score > 0) {
    candidates.push({ path: file, matches, pathHits, score, text: text.slice(0, MAX_PAGE_CHARS) });
  }
}
candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
const docs = candidates.slice(0, MAX_PAGES);

// Navigation files that already link to a selected page, so new pages can be added next to it.
const nav = [];
for (const file of fs.readdirSync(NAV_ROOT)) {
  const text = fs.readFileSync(`${NAV_ROOT}/${file}`, 'utf8');
  if (docs.some((page) => text.includes(`link: '${pageUrl(page.path)}'`))) {
    nav.push({ path: `${NAV_ROOT}/${file}`, text });
  }
}

printJson({ source, truncated, docs, nav });
