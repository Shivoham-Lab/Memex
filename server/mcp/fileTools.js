import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import * as fileSource from '../fileSource.js';
import * as localOps from '../git/localOps.js';
import * as githubOps from '../git/githubOps.js';
import { updateProjectActivity } from '../db.js';
import { appendChangelog } from '../records/changelog.js';
import { updateFileSummary, readFileSummaries } from '../records/fileSummaries.js';
import { updateSnapshotFileMap } from '../records/snapshot.js';
import { logAndBroadcast } from '../activity.js';
import { queueFileSummary, queueSnapshotUpdate } from '../ollama/jobQueue.js';
import { getCurrentProject } from './browserMode.js';

/** Register file operation tools */
export function registerFileTools(server) {
  server.tool('read_file', 'Read the full content of a file', {
    path: z.string().describe('File path relative to project root')
  }, async ({ path: filePath }) => {
    const project = getCurrentProject();
    if (!project) return { content: [{ type: 'text', text: 'No project selected.' }], isError: true };

    try {
      const content = fileSource.readFile(project.local_path, filePath);
      logAndBroadcast(project.id, null, 'read_file', `Read ${filePath}`, filePath);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            path: filePath,
            content,
            lines: content.split('\n').length,
            language: getLanguage(filePath)
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error reading file: ${error.message}` }], isError: true };
    }
  });

  server.tool('write_file', 'Write content to a file. Creates git checkpoint before writing, commits after, updates all record files.', {
    path: z.string().describe('File path relative to project root'),
    content: z.string().describe('Complete file content to write'),
    ai_name: z.string().describe('Name of AI making this change: Claude, Cursor, Continue, Antigravity'),
    task_description: z.string().describe('What this change does. Used as git commit message and changelog title.'),
    decisions: z.array(z.string()).optional().describe('Non-obvious decisions made'),
    watch_out: z.array(z.string()).optional().describe('Things next AI must know')
  }, async ({ path: filePath, content, ai_name, task_description, decisions, watch_out }) => {
    const project = getCurrentProject();
    if (!project) return { content: [{ type: 'text', text: 'No project selected.' }], isError: true };

    try {
      // 1. Pre-write git checkpoint
      const checkpointHash = await localOps.checkpoint(project.local_path, task_description, ai_name);

      // 2. Write the file
      fileSource.writeFile(project.local_path, filePath, content);

      // 3. Post-write git commit
      const commitHash = await localOps.commit(project.local_path, task_description, ai_name);

      // 4. Append basic changelog entry
      const filesMdPath = path.join(project.local_path, 'memex_files.md');
      const isNew = !fs.existsSync(filesMdPath) || !readFileSummaries(project.local_path).includes(`### ${filePath}`);

      appendChangelog(project.local_path, {
        aiName: ai_name,
        taskDescription: task_description,
        gitCheckpoint: checkpointHash,
        files: [{ path: filePath, created: isNew, description: task_description }],
        decisions: decisions || [],
        watchOut: watch_out || []
      });

      // 5. Update file summary
      updateFileSummary(project.local_path, filePath, {
        purpose: task_description,
        lastModified: new Date().toISOString().split('T')[0],
        lastModifiedBy: ai_name
      });

      // 6. Update snapshot file map
      updateSnapshotFileMap(project.local_path, filePath, task_description);

      // 7. Log activity
      logAndBroadcast(project.id, ai_name, 'write_file', `${task_description} → ${filePath}`, filePath);

      // 8. Update project activity
      updateProjectActivity(project.id);

      // 9. Queue Ollama tasks (non-blocking)
      let ollamaEnhancing = false;
      if (project.ollama_mode === 'full') {
        ollamaEnhancing = true;
        queueFileSummary(project.id, project.local_path, filePath, content, project.thinking_model);
        queueSnapshotUpdate(project.id, project.local_path, project.thinking_model);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            path: filePath,
            git_checkpoint: checkpointHash,
            git_commit: commitHash,
            changelog: 'appended',
            files_summary: 'updated',
            ollama_enhancing: ollamaEnhancing,
            github_pr: null
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error writing file: ${error.message}` }], isError: true };
    }
  });

  server.tool('list_directory', 'List files and folders in a directory', {
    path: z.string().optional().describe('Directory path (optional, defaults to project root)')
  }, async ({ path: dirPath }) => {
    const project = getCurrentProject();
    if (!project) return { content: [{ type: 'text', text: 'No project selected.' }], isError: true };

    try {
      const entries = fileSource.listDirectory(project.local_path, dirPath || '', project.ignored_dirs);
      const fileCount = entries.filter(e => e.type === 'file').length;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tree: entries.map(e => `${e.type === 'directory' ? '📁 ' : '📄 '}${e.path}`).join('\n'),
            file_count: fileCount,
            tracked_count: fileCount,
            ignored: project.ignored_dirs.split(',')
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error listing directory: ${error.message}` }], isError: true };
    }
  });
}

function getLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langs = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', go: 'go', rs: 'rust', json: 'json', md: 'markdown', css: 'css', html: 'html', sql: 'sql' };
  return langs[ext] || 'text';
}
