import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { initDB, closeDB } from './db.js';
import { authenticate, sessionAuth, validateSecretKey } from './auth.js';
import { createBrowserMCP, createIDEMCP } from './mcp/server.js';
import { setBroadcast } from './activity.js';
import { healthCheck, checkModel } from './ollama/client.js';
import { jobQueue } from './ollama/jobQueue.js';
import crypto from 'crypto';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Validate required env vars
if (!process.env.MEMEX_SECRET_KEY) {
  console.error('ERROR: MEMEX_SECRET_KEY not set. Create .env with MEMEX_SECRET_KEY=your-secret-key');
  process.exit(1);
}

// Initialize database
await initDB();
console.log('✓ Database initialized');

// Start Ollama job queue
jobQueue.start();
console.log('✓ Ollama job queue started');

// Check Ollama status
const ollamaRunning = await healthCheck();
console.log(`✓ Ollama: ${ollamaRunning ? 'connected' : 'not running (limited features)'}`);

if (ollamaRunning) {
  const embedModel = await checkModel('nomic-embed-text');
  const thinkModel = await checkModel(process.env.OLLAMA_THINKING_MODEL || 'phi4-mini');
  console.log(`  - nomic-embed-text: ${embedModel ? 'available' : 'not found'}`);
  console.log(`  - ${process.env.OLLAMA_THINKING_MODEL || 'phi4-mini'}: ${thinkModel ? 'available' : 'not found'}`);
}

// Initialize Express
const app = express();
const server = createServer(app);

app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// WebSocket server for live activity feed
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const projectId = url.searchParams.get('project');
  if (projectId) {
    if (!wsClients.has(projectId)) wsClients.set(projectId, new Set());
    wsClients.get(projectId).add(ws);
    ws.on('close', () => {
      wsClients.get(projectId)?.delete(ws);
      if (wsClients.get(projectId)?.size === 0) wsClients.delete(projectId);
    });
  }
});

setBroadcast((projectId, event) => {
  if (!projectId) return;
  const clients = wsClients.get(projectId);
  if (!clients) return;
  const msg = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
});

console.log('✓ WebSocket server ready');

// Initialize MCP servers
createBrowserMCP(app);
createIDEMCP(app);
console.log('✓ MCP servers initialized (browser + IDE modes)');

// ─── Dashboard API: Auth ─────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const result = authenticate(password);
  if (!result) return res.status(401).json({ error: 'Invalid password' });
  if (result.noAuth) return res.json({ success: true, noAuth: true });

  const isHTTPS = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https';
  res.cookie('memex_session', result.token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isHTTPS ? 'none' : 'lax',
    secure: isHTTPS
  });
  res.json({ success: true });
});

app.post('/api/auth/logout', (req, res) => {
  const isHTTPS = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https';
  res.clearCookie('memex_session', {
    httpOnly: true,
    sameSite: isHTTPS ? 'none' : 'lax',
    secure: isHTTPS
  });
  res.json({ success: true });
});

app.get('/api/auth/check', sessionAuth, (req, res) => {
  res.json({ authenticated: true, auth_enabled: !!process.env.MEMEX_PASSWORD });
});

// ─── Dashboard API: Projects ─────────────────────────────────────────
const { default: dashboardRoutes } = await import('./routes/dashboard.js');
app.use('/api', sessionAuth, dashboardRoutes);

// ─── MCP root info ──────────────────────────────────────────────────
app.get('/mcp', (req, res) => {
  const proto = req.protocol;
  const host = req.get('host');
  const base = `${proto}://${host}`;
  res.json({
    service: 'Memex MCP Server',
    status: 'running',
    endpoints: {
      browser_sse: `${base}/mcp/browser/sse`,
      browser_http: `${base}/mcp/browser`,
      ide_sse: `${base}/mcp/ide/sse`,
      ide_http: `${base}/mcp/ide`
    },
    usage: 'Connect your AI tool to the SSE or HTTP endpoints above. Do not open these URLs in a browser directly.'
  });
});

// ─── Serve static dashboard files ────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/mcp') || req.path.startsWith('/ws')) {
    return res.status(404).json({ error: 'Not found' });
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Dashboard not built. Run: npm run build');
  }
});

// ─── Start server ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀 Memex running on http://localhost:${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   MCP: http://localhost:${PORT}/mcp`);
  console.log(`   MCP Browser SSE: http://localhost:${PORT}/mcp/browser/sse`);
  console.log(`   MCP IDE SSE: http://localhost:${PORT}/mcp/ide/sse`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`\n   To expose via tunnel:`);
  console.log(`   Cloudflare: cloudflared tunnel --url http://localhost:${PORT}`);
  console.log(`   Tailscale:  tailscale funnel ${PORT}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => { closeDB(); process.exit(0); });
process.on('SIGTERM', () => { closeDB(); process.exit(0); });
