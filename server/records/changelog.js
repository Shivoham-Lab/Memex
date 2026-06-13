import fs from 'fs';
import path from 'path';

/** Read the changelog file */
export function readChangelog(projectPath) {
  const changelogPath = path.join(projectPath, 'memex_changelog.md');
  if (!fs.existsSync(changelogPath)) return '';
  return fs.readFileSync(changelogPath, 'utf-8');
}

/** Append a new entry to the changelog */
export function appendChangelog(projectPath, entry) {
  const changelogPath = path.join(projectPath, 'memex_changelog.md');
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

  let content = '';
  if (fs.existsSync(changelogPath)) {
    content = fs.readFileSync(changelogPath, 'utf-8');
  }

  const filesChanged = entry.files.map(f => {
    const action = f.created ? 'CREATED' : f.deleted ? 'DELETED' : 'MODIFIED';
    return `- ${action.padEnd(10)} ${f.path} → ${f.description || ''}`;
  }).join('\n');

  const decisions = entry.decisions?.map(d => `- DECISION: ${d}`).join('\n') || '';
  const watchOut = entry.watchOut?.map(w => `- WATCH OUT: ${w}`).join('\n') || '';

  const enhanced = entry.ollamaEnhanced ? '\n[Enhanced by Phi-4 Mini ✓]' : '';

  const newEntry = `
## ${timestamp} | AI: ${entry.aiName} | Task: ${entry.taskDescription}
Git checkpoint: ${entry.gitCheckpoint}

### Files Changed
${filesChanged || '- (no files listed)'}

### Decisions Made
${decisions || '- (none recorded)'}
${enhanced}

### Watch Out
${watchOut || '- (none recorded)'}
${enhanced}

---
`;

  fs.writeFileSync(changelogPath, content + newEntry, 'utf-8');
  return newEntry;
}

/** Get the last N entries from changelog */
export function getRecentChangelog(projectPath, count = 10) {
  const content = readChangelog(projectPath);
  if (!content) return '';

  const entries = content.split(/^## /m).filter(e => e.trim());
  return entries.slice(0, count).map(e => `## ${e}`).join('\n');
}

/** Parse changelog entries into structured data */
export function parseChangelog(content) {
  if (!content) return [];

  const entries = [];
  const blocks = content.split(/^## /m).filter(e => e.trim());

  for (const block of blocks) {
    const lines = block.split('\n');
    const header = lines[0];
    const headerMatch = header.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \| AI: (.+?) \| Task: (.+)/);

    if (!headerMatch) continue;

    const entry = {
      timestamp: headerMatch[1],
      aiName: headerMatch[2],
      taskDescription: headerMatch[3],
      gitCheckpoint: '',
      filesChanged: [],
      decisions: [],
      watchOut: []
    };

    let currentSection = '';
    for (const line of lines) {
      if (line.startsWith('Git checkpoint:')) {
        entry.gitCheckpoint = line.replace('Git checkpoint:', '').trim();
      } else if (line.startsWith('### Files Changed')) {
        currentSection = 'files';
      } else if (line.startsWith('### Decisions Made')) {
        currentSection = 'decisions';
      } else if (line.startsWith('### Watch Out')) {
        currentSection = 'watchOut';
      } else if (line.startsWith('### ') || line === '---') {
        currentSection = '';
      } else if (line.startsWith('- ') && currentSection === 'files') {
        const match = line.match(/^- (CREATED|MODIFIED|DELETED)\s+(\S+)\s*→?\s*(.*)/);
        if (match) {
          entry.filesChanged.push({
            action: match[1],
            path: match[2],
            description: match[3]
          });
        }
      } else if (line.startsWith('- DECISION:') && currentSection === 'decisions') {
        entry.decisions.push(line.replace('- DECISION:', '').trim());
      } else if (line.startsWith('- WATCH OUT:') && currentSection === 'watchOut') {
        entry.watchOut.push(line.replace('- WATCH OUT:', '').trim());
      }
    }

    entries.push(entry);
  }

  return entries;
}
