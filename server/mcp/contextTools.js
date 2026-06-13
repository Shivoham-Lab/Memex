import { z } from 'zod';
import { readSnapshot } from '../records/snapshot.js';
import { getRecentChangelog } from '../records/changelog.js';
import { getTodos } from '../db.js';
import { getFileSummary } from '../records/fileSummaries.js';
import * as localOps from '../git/localOps.js';
import { getCurrentProject } from './browserMode.js';

/** Register context tools */
export function registerContextTools(server) {
  server.tool('get_context', 'Get project context: snapshot, recent changes, and pending TODOs', {}, async () => {
    const project = getCurrentProject();
    if (!project) return { content: [{ type: 'text', text: 'No project selected.' }], isError: true };

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
          ollama_mode: project.ollama_mode,
          project_name: project.name
        }, null, 2)
      }]
    };
  });

  server.tool('get_file_summary', 'Get the memex_files.md entry for a specific file', {
    path: z.string().describe('File path')
  }, async ({ path: filePath }) => {
    const project = getCurrentProject();
    if (!project) return { content: [{ type: 'text', text: 'No project selected.' }], isError: true };

    const summary = getFileSummary(project.local_path, filePath);

    if (!summary) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            path: filePath,
            summary: 'No summary available for this file.',
            ollama_enhanced: false,
            last_modified_by: null,
            has_gotchas: false
          }, null, 2)
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          path: filePath,
          summary: `**Purpose:** ${summary.purpose}\n**Exports:** ${summary.exports.join(', ')}\n**Depends on:** ${summary.dependsOn.join(', ')}\n**Gotchas:** ${summary.gotchas.join('; ')}`,
          ollama_enhanced: summary.ollamaEnhanced,
          last_modified_by: summary.lastModifiedBy,
          has_gotchas: summary.gotchas.length > 0
        }, null, 2)
      }]
    };
  });

  server.tool('get_file_diff', 'Get the diff between a file and a past git checkpoint', {
    path: z.string().describe('File path'),
    checkpoint: z.string().describe('Git commit hash from changelog')
  }, async ({ path: filePath, checkpoint }) => {
    const project = getCurrentProject();
    if (!project) return { content: [{ type: 'text', text: 'No project selected.' }], isError: true };

    try {
      const diff = await localOps.getFileDiff(project.local_path, filePath, checkpoint);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ path: filePath, checkpoint, diff }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error getting diff: ${error.message}` }], isError: true };
    }
  });
}
