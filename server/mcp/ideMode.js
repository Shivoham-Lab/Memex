import { z } from 'zod';
import { getAllProjects } from '../db.js';
import { readSnapshot } from '../records/snapshot.js';
import { getRecentChangelog } from '../records/changelog.js';
import { getTodos } from '../db.js';

/** Register IDE-mode tools */
export function registerIDETools(server) {
  server.tool('detect_project', 'Auto-detect and select project based on workspace root path', {
    workspace_path: z.string().describe('Workspace root path from the IDE')
  }, async ({ workspace_path }) => {
    const projects = getAllProjects();
    const normalizedPath = workspace_path.replace(/\\/g, '/').toLowerCase();

    const matched = projects.find(p => {
      if (!p.local_path) return false;
      const projectPath = p.local_path.replace(/\\/g, '/').toLowerCase();
      return normalizedPath === projectPath || normalizedPath.startsWith(projectPath + '/') || projectPath.startsWith(normalizedPath + '/');
    });

    if (!matched) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'unregistered_project',
            message: 'This directory is not linked to any Memex project. Visit your Memex dashboard to create a new project for this directory, or select an existing project.',
            dashboard_url: process.env.DASHBOARD_URL || 'http://localhost:3000'
          }, null, 2)
        }]
      };
    }

    globalThis.__memex_current_project = matched;

    const snapshot = readSnapshot(matched.local_path) || 'No snapshot yet';
    const recentChanges = getRecentChangelog(matched.local_path, 10);
    const pendingTodos = getTodos(matched.id);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          snapshot,
          recent_changes: recentChanges,
          pending_todos: pendingTodos.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            tags: JSON.parse(t.tags || '[]'),
            hints: t.hints
          })),
          project_name: matched.name
        }, null, 2)
      }]
    };
  });
}

/** Get current project from session */
export function getCurrentProject() {
  return globalThis.__memex_current_project || null;
}
