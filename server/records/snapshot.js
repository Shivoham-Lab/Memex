import fs from 'fs';
import path from 'path';

/** Read the snapshot file for a project */
export function readSnapshot(projectPath) {
  const snapshotPath = path.join(projectPath, 'memex_snapshot.md');
  if (!fs.existsSync(snapshotPath)) return null;
  return fs.readFileSync(snapshotPath, 'utf-8');
}

/** Write/update the snapshot file */
export function writeSnapshot(projectPath, content) {
  const snapshotPath = path.join(projectPath, 'memex_snapshot.md');
  fs.writeFileSync(snapshotPath, content, 'utf-8');
}

/** Parse snapshot into structured data */
export function parseSnapshot(content) {
  if (!content) return { stack: [], files: [], todos: [], decisions: [] };

  const stack = [];
  const files = [];
  const todos = [];
  const decisions = [];

  let currentSection = '';

  for (const line of content.split('\n')) {
    if (line.startsWith('## Stack')) currentSection = 'stack';
    else if (line.startsWith('## Important Files')) currentSection = 'files';
    else if (line.startsWith('## Active TODOs')) currentSection = 'todos';
    else if (line.startsWith('## Key Decisions')) currentSection = 'decisions';
    else if (line.startsWith('## ')) currentSection = '';

    if (currentSection === 'stack' && line.startsWith('- ')) {
      stack.push(line.slice(2));
    } else if (currentSection === 'files' && line.startsWith('- ')) {
      const match = line.match(/^- `?(\S+)`?\s*→\s*(.+)/);
      if (match) files.push({ path: match[1], description: match[2] });
    } else if (currentSection === 'todos' && line.startsWith('- ')) {
      const done = line.startsWith('- [x]');
      const text = line.replace(/^- \[[ x]\]\s*/, '');
      todos.push({ text, done });
    } else if (currentSection === 'decisions' && line.startsWith('- ')) {
      decisions.push(line.slice(2));
    }
  }

  return { stack, files, todos, decisions };
}

/** Create initial snapshot content */
export function createInitialSnapshot(projectName, stack) {
  return `# Project: ${projectName}
Last updated: ${new Date().toISOString().split('T')[0]} | Mode: Light

## Stack
${stack ? stack.split(',').map(s => `- ${s.trim()}`).join('\n') : '- Not configured yet'}

## Important Files
- (no files tracked yet)

## Active TODOs
- (no TODOs yet)

## Key Decisions
- (no decisions recorded yet)
`;
}

/** Update snapshot file map entry */
export function updateSnapshotFileMap(projectPath, filePath, description) {
  const content = readSnapshot(projectPath);
  if (!content) return;

  const parsed = parseSnapshot(content);
  const existingIndex = parsed.files.findIndex(f => f.path === filePath);

  if (existingIndex >= 0) {
    parsed.files[existingIndex].description = description;
  } else {
    parsed.files.push({ path: filePath, description });
  }

  // Rebuild snapshot
  const lines = content.split('\n');
  const filesStart = lines.findIndex(l => l.startsWith('## Important Files'));
  const filesEnd = lines.findIndex((l, i) => i > filesStart && l.startsWith('## '));

  const newFileLines = parsed.files.map(f => `- \`${f.path}\` → ${f.description}`);
  const newLines = [
    ...lines.slice(0, filesStart + 1),
    ...newFileLines.length ? newFileLines : ['- (no files tracked yet)'],
    ...lines.slice(filesEnd)
  ];

  writeSnapshot(projectPath, newLines.join('\n'));
}
