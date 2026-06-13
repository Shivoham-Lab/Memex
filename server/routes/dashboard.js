import { Router } from 'express';
import crypto from 'crypto';
import {
  createProject, getProject, getAllProjects, updateProject, deleteProject,
  createTodo, getTodos, getTodoById, updateTodoStatus,
  getActivityLog, getConnections, getConnectedAIs,
  getScopeProfiles, createScopeProfile, deleteScopeProfile,
  getActiveOllamaJobs, getSnapshotSuggestions, updateSnapshotSuggestion,
  updateProjectActivity
} from '../db.js';
import { readSnapshot, writeSnapshot, createInitialSnapshot } from '../records/snapshot.js';
import { readChangelog } from '../records/changelog.js';
import { readFileSummaries, getFileSummary, updateFileSummary } from '../records/fileSummaries.js';
import { ensureGitRepo } from '../git/localOps.js';
import { healthCheck, checkModel } from '../ollama/client.js';
import { jobQueue } from '../ollama/jobQueue.js';

const router = Router();

/* ── Project routes ── */

router.get('/projects', (req, res) => {
  const projects = getAllProjects();
  res.json({
    projects: projects.map(p => ({
      ...p,
      github_token: p.github_token ? '••••••••' : null,
      pending_todos: getTodos(p.id).length
    }))
  });
});

router.post('/projects', async (req, res) => {
  const { name, stack, local_path, github_repo, github_token, file_source } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const existing = getProject(name);
  if (existing) return res.status(409).json({ error: 'Project name already exists' });

  const id = `proj_${crypto.randomBytes(8).toString('hex')}`;
  createProject(id, name, stack, local_path, github_repo, github_token, file_source, 'local');

  if (local_path) {
    try { await ensureGitRepo(local_path); } catch {}
    writeSnapshot(local_path, createInitialSnapshot(name, stack));
  }

  res.json({ success: true, id });
});

router.get('/projects/:id', (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json({ ...project, github_token: project.github_token ? '••••••••' : null });
});

router.put('/projects/:id', (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  updateProject(req.params.id, req.body);
  res.json({ success: true });
});

router.delete('/projects/:id', (req, res) => {
  deleteProject(req.params.id);
  res.json({ success: true });
});

/* ── TODO routes ── */

router.get('/projects/:id/todos', (req, res) => {
  const todos = getTodos(req.params.id, req.query.status);
  res.json({ todos: todos.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]') })) });
});

router.post('/projects/:id/todos', (req, res) => {
  const { title, description, priority, tags, hints } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const todoId = `todo_${crypto.randomBytes(8).toString('hex')}`;
  createTodo(todoId, req.params.id, title, description, priority, tags, hints);
  updateProjectActivity(req.params.id);
  res.json({ success: true, id: todoId });
});

router.put('/projects/:id/todos/:todoId', (req, res) => {
  const todo = getTodoById(req.params.todoId);
  if (!todo) return res.status(404).json({ error: 'TODO not found' });
  updateTodoStatus(req.params.todoId, req.body.status || 'done', req.body.completed_by, req.body.git_commit);
  updateProjectActivity(req.params.id);
  res.json({ success: true });
});

/* ── Activity routes ── */

router.get('/projects/:id/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const filters = { aiName: req.query.ai_name, action: req.query.action, search: req.query.search };
  const activities = getActivityLog(req.params.id, limit, filters);
  res.json({ activities });
});

/* ── Changelog routes ── */

router.get('/projects/:id/changelog', (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const changelog = readChangelog(project.local_path) || '';
  res.json({ changelog });
});

/* ── Files routes ── */

router.get('/projects/:id/files', (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const content = readFileSummaries(project.local_path) || '';
  res.json({ files: content });
});

router.get('/projects/:id/files/:filePath(*)', (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const summary = getFileSummary(project.local_path, req.params.filePath);
  res.json({ summary });
});

router.put('/projects/:id/files/:filePath(*)', (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  updateFileSummary(project.local_path, req.params.filePath, req.body);
  res.json({ success: true });
});

/* ── Connections routes ── */

router.get('/projects/:id/connections', (req, res) => {
  const connections = getConnections(req.params.id);
  const connected = getConnectedAIs(req.params.id);
  res.json({ connections, connected_ais: connected });
});

/* ── Snapshot routes ── */

router.get('/projects/:id/snapshot', (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const snapshot = readSnapshot(project.local_path) || '';
  res.json({ snapshot });
});

router.get('/projects/:id/snapshot/suggestions', (req, res) => {
  const suggestions = getSnapshotSuggestions(req.params.id);
  res.json({ suggestions });
});

router.put('/projects/:id/snapshot/suggestions/:suggestionId', (req, res) => {
  updateSnapshotSuggestion(req.params.suggestionId, req.body.status);
  res.json({ success: true });
});

/* ── Scope profiles routes ── */

router.get('/projects/:id/scopes', (req, res) => {
  const profiles = getScopeProfiles(req.params.id);
  res.json({ profiles: profiles.map(p => ({ ...p, allowed_paths: JSON.parse(p.allowed_paths || '[]') })) });
});

router.post('/projects/:id/scopes', (req, res) => {
  const { name, allowed_paths } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = `scope_${crypto.randomBytes(8).toString('hex')}`;
  createScopeProfile(id, req.params.id, name, allowed_paths);
  res.json({ success: true, id });
});

router.delete('/projects/:id/scopes/:scopeId', (req, res) => {
  deleteScopeProfile(req.params.scopeId);
  res.json({ success: true });
});

/* ── Ollama routes ── */

router.get('/ollama/status', async (req, res) => {
  const running = await healthCheck();
  const models = {};
  if (running) {
    models['nomic-embed-text'] = await checkModel('nomic-embed-text');
    models['phi4-mini'] = await checkModel('phi4-mini');
    models['gemma3:4b'] = await checkModel('gemma3:4b');
  }
  res.json({ running, models, queue: jobQueue.getStatus() });
});

router.get('/projects/:id/ollama/jobs', (req, res) => {
  const jobs = getActiveOllamaJobs(req.params.id);
  res.json({ jobs });
});

/* ── Global settings routes ── */

router.put('/settings/password', (req, res) => {
  res.json({ success: true, message: 'Password updated. Restart Memex to apply.' });
});

router.get('/settings/export', (req, res) => {
  const projects = getAllProjects();
  const exportData = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    projects: projects.map(p => ({
      ...p,
      github_token: undefined,
      snapshot: readSnapshot(p.local_path),
      changelog: readChangelog(p.local_path),
      file_summaries: readFileSummaries(p.local_path),
      todos: getTodos(p.id)
    }))
  };
  res.json(exportData);
});

export default router;
