import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, timeAgo } from '../lib/api';

export default function Overview({ setCurrentProject }) {
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', stack: '', local_path: '', ollama_mode: 'full' });
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/projects').then(data => setProjects(data.projects));
  }, []);

  const createProject = async (e) => {
    e.preventDefault();
    try {
      const result = await api.post('/api/projects', form);
      setProjects([{ id: result.project.id, name: result.project.name, ...form, file_source: 'local', ollama_mode: form.ollama_mode }, ...projects]);
      setShowCreate(false);
      setForm({ name: '', description: '', stack: '', local_path: '', ollama_mode: 'full' });
    } catch (err) {
      alert(err.message);
    }
  };

  const openProject = (project) => {
    setCurrentProject(project.id);
    navigate(`/project/${project.id}/todos`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-[#a3a3a3] text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded font-medium text-sm transition-colors">
          New Project
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Create Project</h2>
            <form onSubmit={createProject} className="space-y-3">
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Project name" required className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed]" />
              <input value={form.stack} onChange={e => setForm({...form, stack: e.target.value})} placeholder="Stack (e.g. React + Node.js)" className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed]" />
              <input value={form.local_path} onChange={e => setForm({...form, local_path: e.target.value})} placeholder="Local path (e.g. /home/user/projects/myapp)" className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed]" />
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" rows={2} className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed]" />
              <select value={form.ollama_mode} onChange={e => setForm({...form, ollama_mode: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed]">
                <option value="full">Full Mode (Ollama AI)</option>
                <option value="light">Light Mode (no AI)</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-[#a3a3a3] hover:text-white">Cancel</button>
                <button type="submit" className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded text-sm font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => (
          <div key={p.id} className="bg-[#111111] border border-[#222222] rounded-lg p-5 hover:border-[#7c3aed] transition-colors cursor-pointer" onClick={() => openProject(p)}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-lg">{p.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${p.ollama_mode === 'full' ? 'bg-[#7c3aed]/20 text-[#7c3aed]' : 'bg-[#333] text-[#a3a3a3]'}`}>
                {p.ollama_mode === 'full' ? 'Full' : 'Light'}
              </span>
            </div>
            {p.stack && <p className="text-[#a3a3a3] text-sm mb-2">{p.stack}</p>}
            <div className="text-xs text-[#737373]">
              {p.local_path && <span className="font-mono">{p.local_path}</span>}
              {!p.local_path && p.github_repo && <span className="font-mono">{p.github_repo}</span>}
            </div>
            <div className="mt-3 text-xs text-[#737373]">Updated {timeAgo(p.updated_at)}</div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full text-center py-16">
            <p className="text-[#a3a3a3] mb-4">No projects yet</p>
            <button onClick={() => setShowCreate(true)} className="text-[#7c3aed] hover:text-[#6d28d9] text-sm font-medium">Create your first project</button>
          </div>
        )}
      </div>
    </div>
  );
}
