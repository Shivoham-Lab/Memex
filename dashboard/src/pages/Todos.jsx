import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import TodoCard from '../components/TodoCard';

export default function Todos() {
  const { id } = useParams();
  const [todos, setTodos] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', tags: [], hints: '' });
  const allTags = ['frontend', 'backend', 'database', 'config', 'testing', 'docs'];

  const loadTodos = () => {
    if (id) api.get(`/api/projects/${id}/todos`).then(data => setTodos(data.todos));
  };

  useEffect(() => { loadTodos(); }, [id]);

  const createTodo = async (e) => {
    e.preventDefault();
    await api.post(`/api/projects/${id}/todos`, form);
    setForm({ title: '', description: '', priority: 'medium', tags: [], hints: '' });
    setShowCreate(false);
    loadTodos();
  };

  const toggleTag = (tag) => {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));
  };

  const pending = todos.filter(t => t.status === 'pending');
  const inProgress = todos.filter(t => t.status === 'in_progress');
  const done = todos.filter(t => t.status === 'done');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">TODOs</h1>
        <button onClick={() => setShowCreate(true)} className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded text-sm font-medium">New TODO</button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-[#111111] border border-[#222222] rounded-lg p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Create TODO</h2>
            <form onSubmit={createTodo} className="space-y-3">
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Title" required className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed]" />
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description — more detail = better AI output" rows={3} className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed]" />
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm">
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded text-xs ${form.tags.includes(tag) ? 'bg-[#7c3aed] text-white' : 'bg-[#222] text-[#a3a3a3] hover:bg-[#333]'}`}>
                    {tag}
                  </button>
                ))}
              </div>
              <input value={form.hints} onChange={e => setForm({...form, hints: e.target.value})} placeholder="Hints (optional file paths or notes)" className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed]" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-[#a3a3a3]">Cancel</button>
                <button type="submit" className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded text-sm font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#a3a3a3] mb-3 uppercase tracking-wide">Pending ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map(t => <TodoCard key={t.id} todo={t} onRefresh={loadTodos} />)}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#a3a3a3] mb-3 uppercase tracking-wide">In Progress ({inProgress.length})</h2>
          <div className="space-y-3">
            {inProgress.map(t => <TodoCard key={t.id} todo={t} onRefresh={loadTodos} />)}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#a3a3a3] mb-3 uppercase tracking-wide">Done ({done.length})</h2>
          <div className="space-y-3">
            {done.map(t => <TodoCard key={t.id} todo={t} onRefresh={loadTodos} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
