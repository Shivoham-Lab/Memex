import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, timeAgo } from '../lib/api';

export default function Connections() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [connections, setConnections] = useState([]);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get('/api/projects').then(data => {
      const p = data.projects.find(p => p.id === id);
      setProject(p);
    });
    api.get(`/api/projects/${id}/connections`).then(data => setConnections(data.connections));
  }, [id]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  if (!project) return <div className="text-[#737373]">Loading...</div>;

  const baseUrl = window.location.origin;
  const browserUrl = `${baseUrl}/mcp/browser`;
  const ideUrl = `${baseUrl}/mcp/ide`;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Connections</h1>

      {/* MCP URLs */}
      <div className="space-y-4 mb-8">
        <div className="bg-[#111] border border-[#222] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-[#a3a3a3] mb-2">Browser Mode (Claude, etc.)</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[#0a0a0a] px-3 py-2 rounded text-sm font-mono text-[#7c3aed]">{browserUrl}</code>
            <button onClick={() => copyToClipboard(browserUrl, 'browser')} className="px-3 py-2 bg-[#222] rounded text-sm hover:bg-[#333]">
              {copied === 'browser' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-[#a3a3a3] mb-2">IDE Mode (Cursor, Continue, etc.)</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[#0a0a0a] px-3 py-2 rounded text-sm font-mono text-[#7c3aed]">{ideUrl}</code>
            <button onClick={() => copyToClipboard(ideUrl, 'ide')} className="px-3 py-2 bg-[#222] rounded text-sm hover:bg-[#333]">
              {copied === 'ide' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Setup instructions */}
      <div className="bg-[#111] border border-[#222] rounded-lg p-5 mb-8">
        <h3 className="font-semibold mb-4">Setup Instructions</h3>
        <div className="space-y-4 text-sm text-[#a3a3a3]">
          <div>
            <h4 className="font-medium text-[#fafafa] mb-1">Claude (claude.ai)</h4>
            <p>Settings → Connectors → Add MCP server → paste the Browser Mode URL</p>
          </div>
          <div>
            <h4 className="font-medium text-[#fafafa] mb-1">Cursor</h4>
            <p>Add to <code className="bg-[#0a0a0a] px-1.5 py-0.5 rounded text-xs">.cursor/mcp.json</code>:</p>
            <pre className="bg-[#0a0a0a] p-3 rounded mt-2 text-xs font-mono overflow-x-auto">{`{
  "mcpServers": {
    "memex": {
      "url": "${ideUrl}"
    }
  }
}`}</pre>
          </div>
          <div>
            <h4 className="font-medium text-[#fafafa] mb-1">Continue.dev / Open Code</h4>
            <p>Add to config.json:</p>
            <pre className="bg-[#0a0a0a] p-3 rounded mt-2 text-xs font-mono overflow-x-auto">{`{
  "mcpServers": {
    "memex": {
      "url": "${ideUrl}"
    }
  }
}`}</pre>
          </div>
        </div>
      </div>

      {/* Connection log */}
      <div>
        <h3 className="font-semibold mb-3">Recent Connections</h3>
        <div className="space-y-2">
          {connections.map(c => (
            <div key={c.id} className="flex items-center gap-4 py-2 border-b border-[#1a1a1a] text-sm">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#7c3aed]/20 text-[#7c3aed]">{c.ai_client || 'unknown'}</span>
              <span className="font-mono text-[#737373] text-xs">{c.ip_address}</span>
              <span className="text-[#a3a3a3] ml-auto">{timeAgo(c.connected_at)}</span>
            </div>
          ))}
          {connections.length === 0 && <p className="text-[#737373] text-center py-4">No connections yet</p>}
        </div>
      </div>
    </div>
  );
}
