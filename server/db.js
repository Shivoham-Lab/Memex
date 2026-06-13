import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'memex.db');

let db;
let SQL;

/** Initialize SQLite database and create all tables */
export async function initDB() {
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      stack TEXT DEFAULT '',
      local_path TEXT,
      github_repo TEXT,
      github_token TEXT,
      file_source TEXT DEFAULT 'local',
      change_target TEXT DEFAULT 'local',
      tracked_extensions TEXT DEFAULT '.js,.jsx,.ts,.tsx,.json,.md,.css,.html,.py,.go,.rs,.sql',
      ignored_dirs TEXT DEFAULT 'node_modules,.git,dist,build,__pycache__,.next,.cache',
      ollama_mode TEXT DEFAULT 'full',
      thinking_model TEXT DEFAULT 'phi4-mini',
      created_at TEXT DEFAULT (datetime('now')),
      last_activity TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      tags TEXT DEFAULT '[]',
      hints TEXT DEFAULT '',
      completed_by TEXT,
      completed_at TEXT,
      git_commit TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      ai_name TEXT,
      action TEXT NOT NULL,
      details TEXT DEFAULT '',
      file_path TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS mcp_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      ai_name TEXT,
      client_ip TEXT,
      session_duration INTEGER,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scope_profiles (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      allowed_paths TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ollama_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      job_type TEXT NOT NULL,
      file_path TEXT,
      status TEXT DEFAULT 'pending',
      result TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS snapshot_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      suggestion TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  saveDB();
  return db;
}

/** Save database to disk */
function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/** Get the database instance */
export function getDB() {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

/** Run a query and return all results */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/** Run a query and return first result */
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || undefined;
}

/** Run a statement and return info */
function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
  return { changes: db.getRowsModified(), lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] };
}

/* ── Project queries ── */

export function createProject(id, name, stack, localPath, githubRepo, githubToken, fileSource, changeTarget) {
  return run(
    `INSERT INTO projects (id, name, stack, local_path, github_repo, github_token, file_source, change_target) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, stack || '', localPath || null, githubRepo || null, githubToken || null, fileSource || 'local', changeTarget || 'local']
  );
}

export function getProject(nameOrId) {
  return queryOne('SELECT * FROM projects WHERE name = ? OR id = ?', [nameOrId, nameOrId]);
}

export function getAllProjects() {
  return queryAll('SELECT * FROM projects ORDER BY last_activity DESC');
}

export function updateProject(id, fields) {
  const allowed = ['name', 'stack', 'local_path', 'github_repo', 'github_token', 'file_source', 'change_target', 'tracked_extensions', 'ignored_dirs', 'ollama_mode', 'thinking_model'];
  const updates = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      updates.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (updates.length === 0) return null;
  values.push(id);
  return run(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
}

export function updateProjectActivity(id) {
  return run("UPDATE projects SET last_activity = datetime('now') WHERE id = ?", [id]);
}

export function deleteProject(id) {
  return run('DELETE FROM projects WHERE id = ?', [id]);
}

/* ── TODO queries ── */

export function createTodo(id, projectId, title, description, priority, tags, hints) {
  return run(
    `INSERT INTO todos (id, project_id, title, description, priority, tags, hints) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, projectId, title, description || '', priority || 'medium', JSON.stringify(tags || []), hints || '']
  );
}

export function getTodos(projectId, status) {
  if (status) {
    return queryAll('SELECT * FROM todos WHERE project_id = ? AND status = ? ORDER BY created_at DESC', [projectId, status]);
  }
  return queryAll("SELECT * FROM todos WHERE project_id = ? AND status != 'done' ORDER BY created_at DESC", [projectId]);
}

export function getTodoById(id) {
  return queryOne('SELECT * FROM todos WHERE id = ?', [id]);
}

export function updateTodoStatus(id, status, completedBy, gitCommit) {
  return run(
    `UPDATE todos SET status = ?, completed_by = ?, completed_at = datetime('now'), git_commit = ? WHERE id = ?`,
    [status, completedBy || null, gitCommit || null, id]
  );
}

/* ── Activity log queries ── */

export function logActivity(projectId, aiName, action, details, filePath) {
  return run(
    `INSERT INTO activity_log (project_id, ai_name, action, details, file_path) VALUES (?, ?, ?, ?, ?)`,
    [projectId, aiName || null, action, details || '', filePath || null]
  );
}

export function getActivityLog(projectId, limit = 100, filters = {}) {
  let sql = 'SELECT * FROM activity_log WHERE project_id = ?';
  const params = [projectId];

  if (filters.aiName) {
    sql += ' AND ai_name = ?';
    params.push(filters.aiName);
  }
  if (filters.action) {
    sql += ' AND action = ?';
    params.push(filters.action);
  }
  if (filters.search) {
    sql += ' AND (file_path LIKE ? OR details LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  return queryAll(sql, params);
}

/* ── MCP connection queries ── */

export function logConnection(projectId, aiName, clientIp, sessionDuration) {
  return run(
    `INSERT INTO mcp_connections (project_id, ai_name, client_ip, session_duration) VALUES (?, ?, ?, ?)`,
    [projectId, aiName || null, clientIp || null, sessionDuration || null]
  );
}

export function getConnections(projectId, limit = 50) {
  return queryAll('SELECT * FROM mcp_connections WHERE project_id = ? ORDER BY timestamp DESC LIMIT ?', [projectId, limit]);
}

export function getConnectedAIs(projectId) {
  return queryAll(
    `SELECT ai_name, COUNT(*) as sessions, MAX(timestamp) as last_seen FROM mcp_connections WHERE project_id = ? AND timestamp >= datetime('now', '-30 days') GROUP BY ai_name ORDER BY last_seen DESC`,
    [projectId]
  );
}

/* ── Scope profile queries ── */

export function createScopeProfile(id, projectId, name, allowedPaths) {
  return run(
    `INSERT INTO scope_profiles (id, project_id, name, allowed_paths) VALUES (?, ?, ?, ?)`,
    [id, projectId, name, JSON.stringify(allowedPaths || [])]
  );
}

export function getScopeProfiles(projectId) {
  return queryAll('SELECT * FROM scope_profiles WHERE project_id = ?', [projectId]);
}

export function deleteScopeProfile(id) {
  return run('DELETE FROM scope_profiles WHERE id = ?', [id]);
}

/* ── Ollama job queries ── */

export function createOllamaJob(projectId, jobType, filePath) {
  return run(
    `INSERT INTO ollama_jobs (project_id, job_type, file_path) VALUES (?, ?, ?)`,
    [projectId, jobType, filePath || null]
  );
}

export function updateOllamaJob(id, status, result) {
  return run(
    `UPDATE ollama_jobs SET status = ?, result = ?, completed_at = CASE WHEN ? IN ('done','failed') THEN datetime('now') ELSE completed_at END WHERE id = ?`,
    [status, result || null, status, id]
  );
}

export function getActiveOllamaJobs(projectId) {
  return queryAll(
    `SELECT * FROM ollama_jobs WHERE project_id = ? AND status IN ('pending', 'processing') ORDER BY created_at DESC`,
    [projectId]
  );
}

/* ── Snapshot suggestion queries ── */

export function createSnapshotSuggestion(projectId, suggestion) {
  return run(
    `INSERT INTO snapshot_suggestions (project_id, suggestion) VALUES (?, ?)`,
    [projectId, suggestion]
  );
}

export function getSnapshotSuggestions(projectId) {
  return queryAll(
    `SELECT * FROM snapshot_suggestions WHERE project_id = ? AND status = 'pending' ORDER BY created_at DESC`,
    [projectId]
  );
}

export function updateSnapshotSuggestion(id, status) {
  return run('UPDATE snapshot_suggestions SET status = ? WHERE id = ?', [status, id]);
}

export function closeDB() {
  if (db) {
    saveDB();
    db.close();
    db = null;
  }
}
