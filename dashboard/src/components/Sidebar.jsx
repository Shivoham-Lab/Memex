import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';

const NAV_ITEMS = [
  { key: 'todos', label: 'TODOs', icon: '☑' },
  { key: 'activity', label: 'Activity', icon: '⚡' },
  { key: 'changelog', label: 'Changelog', icon: '📋' },
  { key: 'files', label: 'Files', icon: '📁' },
  { key: 'visual', label: 'Visual', icon: '🔗' },
  { key: 'connections', label: 'Connections', icon: '🔌' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
];

export default function Sidebar({ currentProject, setCurrentProject }) {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api.get('/api/projects').then(data => setProjects(data.projects));
  }, []);

  const currentId = currentProject || location.pathname.match(/\/project\/([^/]+)/)?.[1];

  const selectProject = (id) => {
    setCurrentProject(id);
    navigate(`/project/${id}/todos`);
  };

  return (
    <aside className="w-60 bg-[#0d0d0d] border-r border-[#222] flex flex-col h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-[#222]">
        <h1 className="text-lg font-bold text-[#7c3aed]">Memex</h1>
      </div>

      {/* Projects */}
      <div className="p-3 border-b border-[#222]">
        <h2 className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-2 px-2">Projects</h2>
        <div className="space-y-0.5">
          {projects.map(p => (
            <button key={p.id} onClick={() => selectProject(p.id)}
              className={`w-full text-left px-3 py-1.5 rounded text-sm truncate ${currentId === p.id ? 'bg-[#7c3aed]/20 text-[#7c3aed]' : 'text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white'}`}>
              {p.name}
            </button>
          ))}
        </div>
        <button onClick={() => navigate('/')}
          className="w-full text-left px-3 py-1.5 rounded text-sm text-[#737373] hover:text-[#a3a3a3] hover:bg-[#1a1a1a] mt-1">
          + All Projects
        </button>
      </div>

      {/* Nav */}
      {currentId && (
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => navigate(`/project/${currentId}/${item.key}`)}
              className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 ${location.pathname.includes(item.key) ? 'bg-[#7c3aed]/20 text-[#7c3aed]' : 'text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white'}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-[#222]">
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-xs text-[#737373] hover:text-[#a3a3a3]">
          Memex v1.0.0
        </a>
      </div>
    </aside>
  );
}
