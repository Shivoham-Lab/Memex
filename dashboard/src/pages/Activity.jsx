import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, timeAgo } from '../lib/api';
import { connectWs, subscribe } from '../lib/ws';

const AI_COLORS = { Claude: '#7c3aed', Cursor: '#2563eb', Continue: '#16a34a', Antigravity: '#ea580c' };
const ACTION_COLORS = { write_file: '#16a34a', read_file: '#2563eb', connected: '#7c3aed', completed_todo: '#d97706', rollback: '#dc2626' };

export default function Activity() {
  const { id } = useParams();
  const [activities, setActivities] = useState([]);
  const [filters, setFilters] = useState({ ai_name: '', action: '', search: '' });

  useEffect(() => {
    if (!id) return;
    loadActivities();
    connectWs(id);
    const unsub = subscribe(id, (event) => {
      setActivities(prev => [event, ...prev].slice(0, 100));
    });
    return unsub;
  }, [id]);

  const loadActivities = async () => {
    if (!id) return;
    const params = new URLSearchParams(filters).toString();
    const data = await api.get(`/api/projects/${id}/activity?${params}`);
    setActivities(data.activities);
  };

  useEffect(() => { loadActivities(); }, [filters]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Activity Feed</h1>

      <div className="flex gap-3 mb-6">
        <select value={filters.ai_name} onChange={e => setFilters(f => ({...f, ai_name: e.target.value}))}
          className="bg-[#111] border border-[#222] rounded px-3 py-1.5 text-sm">
          <option value="">All AIs</option>
          <option value="Claude">Claude</option>
          <option value="Cursor">Cursor</option>
          <option value="Continue">Continue</option>
          <option value="Antigravity">Antigravity</option>
        </select>
        <select value={filters.action} onChange={e => setFilters(f => ({...f, action: e.target.value}))}
          className="bg-[#111] border border-[#222] rounded px-3 py-1.5 text-sm">
          <option value="">All Actions</option>
          <option value="write_file">write_file</option>
          <option value="read_file">read_file</option>
          <option value="connected">connected</option>
          <option value="completed_todo">completed_todo</option>
          <option value="rollback">rollback</option>
        </select>
        <input value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} placeholder="Search..."
          className="bg-[#111] border border-[#222] rounded px-3 py-1.5 text-sm flex-1" />
      </div>

      <div className="space-y-1">
        {activities.map(a => (
          <div key={a.id} className="flex items-start gap-3 py-3 border-b border-[#1a1a1a]">
            <div className="w-1 h-8 rounded-full mt-1" style={{ background: AI_COLORS[a.ai_name] || '#555' }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: (AI_COLORS[a.ai_name] || '#555') + '22', color: AI_COLORS[a.ai_name] || '#aaa' }}>
                  {a.ai_name || 'system'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: (ACTION_COLORS[a.action] || '#555') + '22', color: ACTION_COLORS[a.action] || '#aaa' }}>
                  {a.action}
                </span>
                <span className="text-xs text-[#737373]">{timeAgo(a.timestamp)}</span>
              </div>
              <p className="text-sm text-[#a3a3a3] mt-1 truncate">{a.details}</p>
            </div>
          </div>
        ))}
        {activities.length === 0 && <p className="text-[#737373] text-center py-8">No activity yet</p>}
      </div>
    </div>
  );
}
