import fs from 'fs';
import path from 'path';

/**
 * Scope filter: restricts file access by project scope settings.
 * Each scope profile can limit which directories an AI can access.
 */

/**
 * Check if a file path is allowed by the project's scope settings.
 * Returns true if no scope restrictions are configured.
 */
export function isFileAllowed(project, filePath) {
  const ignoredDirs = project.ignored_dirs.split(',').map(d => d.trim());

  for (const dir of ignoredDirs) {
    if (filePath.startsWith(dir + '/') || filePath.includes('/' + dir + '/') || filePath === dir) {
      return false;
    }
  }

  return true;
}

/**
 * Filter a list of file paths by the project's scope settings.
 */
export function filterFilesByScope(project, files) {
  return files.filter(f => isFileAllowed(project, f.path || f));
}

/**
 * Check if a directory listing respects scope settings.
 */
export function filterDirectoryByScope(project, entries) {
  const ignoredDirs = project.ignored_dirs.split(',').map(d => d.trim());
  return entries.filter(e => !ignoredDirs.includes(e.name));
}
