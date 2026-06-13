import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { registerBrowserTools } from './browserMode.js';
import { registerIDETools } from './ideMode.js';
import { registerFileTools } from './fileTools.js';
import { registerSearchTools } from './searchTools.js';
import { registerContextTools } from './contextTools.js';
import { registerTodoTools } from './todoTools.js';

/** Create a fresh McpServer with all tools registered */
function createServer(mode) {
  const server = new McpServer({ name: `memex-${mode}`, version: '1.0.0' });
  registerFileTools(server);
  registerSearchTools(server);
  registerContextTools(server);
  registerTodoTools(server);
  if (mode === 'browser') registerBrowserTools(server);
  if (mode === 'ide') registerIDETools(server);
  return server;
}

// Store SSE transports by session ID
const sseTransports = new Map();

// Store Streamable HTTP transports by session ID
const httpTransports = new Map();

/** Create browser-mode MCP endpoint */
export function createBrowserMCP(app) {
  app.get('/mcp/browser', (req, res) => {
    res.json({
      service: 'Memex MCP Server',
      mode: 'browser',
      status: 'running',
      usage: 'MCP endpoint — connect your AI tool here, do not open in browser.',
      tools: ['list_projects', 'select_project', 'get_context', 'read_file', 'write_file', 'search_files', 'get_todos', 'complete_todo']
    });
  });

  // SSE endpoint for Claude Desktop compatibility
  app.get('/mcp/browser/sse', async (req, res) => {
    const server = createServer('browser');
    const transport = new SSEServerTransport('/mcp/browser/messages', res);
    sseTransports.set(transport.sessionId, transport);
    res.on('close', () => sseTransports.delete(transport.sessionId));
    await server.connect(transport);
  });

  // POST endpoint for SSE messages
  app.post('/mcp/browser/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = sseTransports.get(sessionId);
    if (!transport) {
      return res.status(400).json({ error: 'Invalid or missing session ID' });
    }
    await transport.handlePostMessage(req, res);
  });

  // Streamable HTTP endpoint
  app.all('/mcp/browser', async (req, res) => {
    // Check for existing session
    const sessionId = req.headers['mcp-session-id'];
    if (sessionId) {
      const existing = httpTransports.get(sessionId);
      if (existing) {
        return existing.handleRequest(req, res, req.body);
      }
      return res.status(400).json({ error: 'Invalid or expired session' });
    }

    // New session — initialize
    const server = createServer('browser');
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => `browser-${Date.now()}-${Math.random().toString(36).slice(2)}`
    });

    transport.onclose = () => {
      httpTransports.delete(transport.sessionId);
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    // Store transport after initialization
    if (transport.sessionId) {
      httpTransports.set(transport.sessionId, transport);
    }
  });
}

/** Create IDE-mode MCP endpoint */
export function createIDEMCP(app) {
  app.get('/mcp/ide', (req, res) => {
    res.json({
      service: 'Memex MCP Server',
      mode: 'ide',
      status: 'running',
      usage: 'MCP endpoint — connect your AI IDE here, do not open in browser.',
      tools: ['detect_project', 'get_context', 'read_file', 'write_file', 'search_files', 'get_todos', 'complete_todo']
    });
  });

  // SSE endpoint for Claude Desktop compatibility
  app.get('/mcp/ide/sse', async (req, res) => {
    const server = createServer('ide');
    const transport = new SSEServerTransport('/mcp/ide/messages', res);
    sseTransports.set(transport.sessionId, transport);
    res.on('close', () => sseTransports.delete(transport.sessionId));
    await server.connect(transport);
  });

  // POST endpoint for SSE messages
  app.post('/mcp/ide/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = sseTransports.get(sessionId);
    if (!transport) {
      return res.status(400).json({ error: 'Invalid or missing session ID' });
    }
    await transport.handlePostMessage(req, res);
  });

  // Streamable HTTP endpoint
  app.all('/mcp/ide', async (req, res) => {
    // Check for existing session
    const sessionId = req.headers['mcp-session-id'];
    if (sessionId) {
      const existing = httpTransports.get(sessionId);
      if (existing) {
        return existing.handleRequest(req, res, req.body);
      }
      return res.status(400).json({ error: 'Invalid or expired session' });
    }

    // New session — initialize
    const server = createServer('ide');
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => `ide-${Date.now()}-${Math.random().toString(36).slice(2)}`
    });

    transport.onclose = () => {
      httpTransports.delete(transport.sessionId);
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    // Store transport after initialization
    if (transport.sessionId) {
      httpTransports.set(transport.sessionId, transport);
    }
  });
}
