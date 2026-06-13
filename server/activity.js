import { logActivity } from './db.js';

let broadcastFn = null;

/** Set the WebSocket broadcast function */
export function setBroadcast(fn) {
  broadcastFn = fn;
}

/** Log an AI action and broadcast to dashboard */
export function logAndBroadcast(projectId, aiName, action, details, filePath) {
  const entry = logActivity(projectId, aiName, action, details, filePath);

  if (broadcastFn) {
    broadcastFn(projectId, {
      id: entry.lastInsertRowid,
      project_id: projectId,
      ai_name: aiName,
      action,
      details,
      file_path: filePath,
      timestamp: new Date().toISOString()
    });
  }

  return entry;
}
