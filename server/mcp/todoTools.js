import { z } from 'zod';
import { getTodos, getTodoById, updateTodoStatus, updateProjectActivity } from '../db.js';
import * as localOps from '../git/localOps.js';
import { logAndBroadcast } from '../activity.js';
import { getCurrentProject } from './browserMode.js';

/** Register TODO tools */
export function registerTodoTools(server) {
  server.tool('get_todos', 'Get all pending TODOs for the current project', {}, async () => {
    const project = getCurrentProject();
    if (!project) return { content: [{ type: 'text', text: 'No project selected.' }], isError: true };

    const todos = getTodos(project.id);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          todos: todos.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            tags: JSON.parse(t.tags || '[]'),
            hints: t.hints,
            created_at: t.created_at
          }))
        }, null, 2)
      }]
    };
  });

  server.tool('complete_todo', 'Mark a TODO as done. Creates a git commit for this completion.', {
    id: z.string().describe('TODO id from get_todos()'),
    summary: z.string().describe('What was done and any important notes')
  }, async ({ id, summary }) => {
    const project = getCurrentProject();
    if (!project) return { content: [{ type: 'text', text: 'No project selected.' }], isError: true };

    const todo = getTodoById(id);
    if (!todo) return { content: [{ type: 'text', text: `TODO ${id} not found.` }], isError: true };

    try {
      const aiName = 'AI';
      const commitHash = await localOps.commitTodo(project.local_path, todo.title, aiName);
      updateTodoStatus(id, 'done', aiName, commitHash);
      logAndBroadcast(project.id, aiName, 'completed_todo', `Completed: ${todo.title}`);
      updateProjectActivity(project.id);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            todo_id: id,
            status: 'done',
            git_commit: commitHash
          }, null, 2)
        }]
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error completing TODO: ${error.message}` }], isError: true };
    }
  });
}
