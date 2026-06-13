import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, timeAgo } from '../lib/api';

const AI_COLORS = { Claude: '#7c3aed', Cursor: '#2563eb', Continue: '#16a34a', Antigravity: '#ea580c' };

export default function Changelog() {
  const { id } = useParams();
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (id) api.get(`/api/projects/${id}/changelog`).then(data => setEntries(data.entries));
  }, [id]);

  const rollback = async (checkpoint) => {
    if (!confirm(`Revert all files to their state at checkpoint ${checkpoint}?`)) return;
    try {
      await api.post(`/api/projects/${id}/rollback`, { checkpoint_hash: checkpoint });
      alert('Rollback successful');
      api.get(`/api/projects/${id}/changelog`).then(data => setEntries(data.entries));
    } catch (e) {
      alert('Rollback failed: ' + e.message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Changelog</h1>
      <div className="space-y-4">
        {entries.map(e => (
          <div key={e.id} className="bg-[#111] border border-[#222] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: (AI_COLORS[e.ai_name] || '#555') + '22', color: AI_COLORS[e.ai_name] || '#aaa' }}>
                  {e.ai_name}
                </span>
                <span className="font-medium">{e.task_description}</span>
              </div>
              <span className="text-xs text-[#737373]">{timeAgo(e.timestamp)}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {e.files_changed.map((f, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded font-mono ${f.action === 'CREATED' ? 'bg-[#16a34a]/20 text-[#16a34a]' : f.action === 'MODIFIED' ? 'bg-[#2563eb]/20 text-[#2563eb]' : 'bg-[#dc2626]/20 text-[#dc2626]'}`}>
                  {f.action} {f.path}
                </span>
              ))}
            </div>

            {e.decisions.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-[#2563eb] mb-1">Decisions</h4>
                {e.decisions.map((d, i) => <p key={i} className="text-sm text-[#a3a3a3]">• {d}</p>)}
              </div>
            )}

            {e.watch_out.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-[#d97706] mb-1">Watch Out</h4>
                {e.watch_out.map((w, i) => <p key={i} className="text-sm text-[#a3a3a3]">• {w}</p>)}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a1a1a]">
              <span className="text-xs font-mono text-[#737373]">checkpoint: {e.git_checkpoint}</span>
              <button onClick={() => rollback(e.git_checkpoint)} className="text-xs text-[#dc2626] hover:text-[#ef4444]">Rollback to this point</button>
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-[#737373] text-center py-8">No changes recorded yet</p>}
      </div>
    </div>
  );
}
