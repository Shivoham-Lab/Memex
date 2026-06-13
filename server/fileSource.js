import fs from 'fs';
import path from 'path';

/** Read a file from the project */
export function readFile(projectPath, filePath) {
  const fullPath = path.join(projectPath, filePath);
  if (!fs.existsSync(fullPath)) throw new Error(`File not found: ${filePath}`);
  return fs.readFileSync(fullPath, 'utf-8');
}

/** Write a file to the project */
export function writeFile(projectPath, filePath, content) {
  const fullPath = path.join(projectPath, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

/** List files in a directory, respecting ignored dirs */
export function listDirectory(projectPath, dirPath, ignoredDirs) {
  const fullPath = path.join(projectPath, dirPath || '');
  if (!fs.existsSync(fullPath)) throw new Error(`Directory not found: ${dirPath || '.'}`);

  const ignored = ignoredDirs.split(',').map(d => d.trim());
  const results = [];

  function scanDir(dir, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignored.includes(entry.name)) continue;
      const relativePath = path.join(prefix, entry.name).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        results.push({ name: entry.name, path: relativePath, type: 'directory' });
        scanDir(path.join(dir, entry.name), relativePath);
      } else {
        results.push({ name: entry.name, path: relativePath, type: 'file' });
      }
    }
  }

  scanDir(fullPath);
  return results;
}

/** Check if a file path is within allowed scope */
export function isPathAllowed(filePath, allowedPaths) {
  if (!allowedPaths || allowedPaths.length === 0) return true;
  return allowedPaths.some(allowed => filePath.startsWith(allowed));
}
