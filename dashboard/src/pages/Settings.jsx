import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function Settings() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!id) return;
    api.get('/api/projects').then(data => {
      const p = data.projects.find(p => p.id === id);
      if (p) { setProject(p); setForm(p); }
    });
    api.get('/api/ollama/status').then(setOllamaStatus);
  }, [id]);

  const save = async () => {
    try {
      await api.put(`/api/projects/${id}`, form);
      alert('Settings saved');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const deleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    await api.delete(`/api/projects/${id}`);
    window.location.href = '/';
  };

  if (!project) return <div className="text-[#737373]">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* General */}
      <section className="bg-[#111] border border-[#222] rounded-lg p-5 mb-4">
        <h3 className="font-semibold mb-3">General</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#a3a3a3] mb-1 block">Project Name</label>
            <input value={form.name || ''} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-[#a3a3a3] mb-1 block">Stack</label>
            <input value={form.stack || ''} onChange={e => setForm(f => ({...f, stack: e.target.value}))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-[#a3a3a3] mb-1 block">Ignored Directories</label>
            <input value={form.ignored_dirs || ''} onChange={e => setForm(f => ({...f, ignored_dirs: e.target.value}))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono" />
          </div>
        </div>
      </section>

      {/* File Source */}
      <section className="bg-[#111] border border-[#222] rounded-lg p-5 mb-4">
        <h3 className="font-semibold mb-3">File Source</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#a3a3a3] mb-1 block">Mode</label>
            <select value={form.file_source || 'local'} onChange={e => setForm(f => ({...f, file_source: e.target.value}))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm">
              <option value="local">Local Only</option>
              <option value="github">GitHub Only</option>
              <option value="both">Both</option>
            </select>
          </div>
          {(form.file_source === 'local' || form.file_source === 'both') && (
            <div>
              <label className="text-xs text-[#a3a3a3] mb-1 block">Local Path</label>
              <input value={form.local_path || ''} onChange={e => setForm(f => ({...f, local_path: e.target.value}))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono" />
            </div>
          )}
          {(form.file_source === 'github' || form.file_source === 'both') && (
            <>
              <div>
                <label className="text-xs text-[#a3a3a3] mb-1 block">GitHub Repo URL</label>
                <input value={form.github_repo || ''} onChange={e => setForm(f => ({...f, github_repo: e.target.value}))}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs text-[#a3a3a3] mb-1 block">GitHub Token</label>
                <input type="password" value={form.github_token || ''} onChange={e => setForm(f => ({...f, github_token: e.target.value}))}
                  className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm" />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Ollama */}
      <section className="bg-[#111] border border-[#222] rounded-lg p-5 mb-4">
        <h3 className="font-semibold mb-3">Ollama</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">Status:</span>
            <span className={`text-xs px-2 py-0.5 rounded ${ollamaStatus?.connected ? 'bg-[#16a34a]/20 text-[#16a34a]' : 'bg-[#dc2626]/20 text-[#dc2626]'}`}>
              {ollamaStatus?.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <div>
            <label className="text-xs text-[#a3a3a3] mb-1 block">Mode</label>
            <select value={form.ollama_mode || 'full'} onChange={e => setForm(f => ({...f, ollama_mode: e.target.value}))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm">
              <option value="full">Full Mode</option>
              <option value="light">Light Mode</option>
            </select>
          </div>
          {form.ollama_mode === 'full' && (
            <div>
              <label className="text-xs text-[#a3a3a3] mb-1 block">Thinking Model</label>
              <select value={form.ollama_thinking_model || 'phi4-mini'} onChange={e => setForm(f => ({...f, ollama_thinking_model: e.target.value}))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm">
                <option value="phi4-mini">Phi-4 Mini</option>
                <option value="gemma3:4b">Gemma 3 4B</option>
              </select>
            </div>
          )}
        </div>
      </section>

      <div className="flex gap-3">
        <button onClick={save} className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-6 py-2 rounded text-sm font-medium">Save Settings</button>
      </div>

      {/* Danger Zone */}
      <section className="bg-[#dc2626]/10 border border-[#dc2626]/30 rounded-lg p-5 mt-8">
        <h3 className="font-semibold text-[#dc2626] mb-3">Danger Zone</h3>
        <button onClick={deleteProject} className="bg-[#dc2626] hover:bg-[#ef4444] text-white px-4 py-2 rounded text-sm font-medium">Delete Project</button>
      </section>
    </div>
  );
}
