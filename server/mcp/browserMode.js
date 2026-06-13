import { z } from 'zod';
import { getAllProjects, getProject } from '../db.js';
import { readSnapshot } from '../records/snapshot.js';
import { getRecentChangelog } from '../records/changelog.js';
import { getTodos } from '../db.js';

/** Register browser-mode tools */
export function registerBrowserTools(server) {
  server.tool('list_projects', 'List all projects in this Memex instance', {}, async () => {
    const projects = getAllProjects();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          projects: projects.map(p => ({
            id: p.id,
            name: p.name,
            stack: p.stack,
            last_activity: p.last_activity,
            pending_todos: getTodos(p.id).length,
            file_source: p.file_source
          }))
        }, null, 2)
      }]
    };
  });

  server.tool('select_project', 'Select the active project for this session. Automatically returns project context.', {
    name: z.string().describe('Project name from list_projects()')
  }, async ({ name }) => {
    const project = getProject(name);
    if (!project) {
      return {
        content: [{ type: 'text', text: `Project "${name}" not found. Use list_projects() to see available projects.` }],
        isError: true
      };
    }

    globalThis.__memex_current_project = project;

    const snapshot = readSnapshot(project.local_path) || 'No snapshot yet';
    const recentChanges = getRecentChangelog(project.local_path, 10);
    const pendingTodos = getTodos(project.id);

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
          project_name: project.name
        }, null, 2)
      }]
    };
  });
}

/** Get current project from session */
export function getCurrentProject() {
  return globalThis.__memex_current_project || null;
}
