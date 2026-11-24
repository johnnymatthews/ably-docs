// Prints a readable summary of a verified draft. Used for the job log and the run summary page.
//   node scripts/docs-agent/summarize.mjs verified.json
import { readJson } from './lib.mjs';

const v = readJson(process.argv[2]);
const clip = (text, n = 220) => (text.length > n ? `${text.slice(0, n)}...` : text).replace(/\n/g, '\\n');
const lines = [`## Docs Agent draft for ${v.source.repo}#${v.source.number}`, '', `**Summary:** ${v.summary}`, '', '### Edits'];
for (const edit of v.edits) {
  if (edit.action === 'create') {
    lines.push(`- create \`${edit.path}\` (${edit.content.length} characters)`);
  } else {
    lines.push(`- modify \`${edit.path}\` (${edit.replacements.length} replacements)`);
    for (const r of edit.replacements) {
      lines.push(`  - replace: \`${clip(r.find, 90)}\` with \`${clip(r.replace)}\``);
    }
  }
}
const x = v.verification;
lines.push('', '### Verification', `- Claims checked: ${x.claims_checked}, failed: ${x.claims_failed}`, `- Names in code not found in the PR or docs: ${x.symbols_failed}`, `- Edits or replacements rejected: ${x.rejected_edits.length}`, `- Needs human attention: ${x.needs_human_attention}`);
for (const f of x.failures) lines.push(`  - failure: ${f}`);
for (const r of x.rejected_edits) lines.push(`  - rejected: ${r.path}: ${r.reason}`);
lines.push('', '### Not sure about', ...(x.not_sure.length ? x.not_sure.map((n) => `- ${n}`) : ['- nothing flagged']));
lines.push('', '### Source-of-truth warnings', ...(v.routing.warnings.length ? v.routing.warnings.map((w) => `- ${w}`) : ['- none']));
console.log(lines.join('\n'));
