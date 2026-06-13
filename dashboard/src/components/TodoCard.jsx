import React from 'react';
import { api } from '../lib/api';

const PRIORITY_COLORS = { high: '#dc2626', medium: '#d97706', low: '#16a34a' };

export default function TodoCard({ todo, onRefresh }) {
  const updateStatus = async (status) => {
    await api.put(`/api/todos/${todo.id}/status`, { status });
    onRefresh();
  };

  const deleteTodo = async () => {
    if (!confirm('Delete this TODO?')) return;
    await api.delete(`/api/todos/${todo.id}`);
    onRefresh();
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-lg p-4 hover:border-[#333] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-sm">{todo.title}</h3>
        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: PRIORITY_COLORS[todo.priority] + '22', color: PRIORITY_COLORS[todo.priority] }}>
          {todo.priority}
        </span>
      </div>

      {todo.description && (
        <p className="text-xs text-[#a3a3a3] mb-3 line-clamp-3">{todo.description}</p>
      )}

      {todo.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {todo.tags.map(t => (
            <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-[#222] text-[#a3a3a3]">{t}</span>
          ))}
        </div>
      )}

      {todo.hints && (
        <p className="text-xs text-[#737373] mb-3 font-mono">{todo.hints}</p>
      )}

      <div className="flex gap-2">
        {todo.status === 'pending' && (
          <>
            <button onClick={() => updateStatus('in_progress')} className="text-xs px-2 py-1 rounded bg-[#2563eb]/20 text-[#2563eb] hover:bg-[#2563eb]/30">Start</button>
            <button onClick={deleteTodo} className="text-xs px-2 py-1 rounded bg-[#dc2626]/20 text-[#dc2626] hover:bg-[#dc2626]/30">Delete</button>
          </>
        )}
        {todo.status === 'in_progress' && (
          <>
            <button onClick={() => updateStatus('done')} className="text-xs px-2 py-1 rounded bg-[#16a34a]/20 text-[#16a34a] hover:bg-[#16a34a]/30">Complete</button>
            <button onClick={() => updateStatus('pending')} className="text-xs px-2 py-1 rounded bg-[#222] text-[#a3a3a3] hover:bg-[#333]">Back to Pending</button>
          </>
        )}
        {todo.status === 'done' && todo.completed_by && (
          <span className="text-xs text-[#737373]">Completed by {todo.completed_by}</span>
        )}
      </div>
    </div>
  );
}
