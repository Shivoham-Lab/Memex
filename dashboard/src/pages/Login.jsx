import React, { useState } from 'react';
import { api } from '../lib/api';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/login', { password });
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#7c3aed]">Memex</h1>
          <p className="text-[#a3a3a3] mt-2 text-sm">Multi-AI Development Workspace</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#111111] border border-[#222222] rounded-lg p-6">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-4 py-3 text-[#fafafa] placeholder-[#737373] focus:outline-none focus:border-[#7c3aed] mb-4"
          />
          {error && <p className="text-[#dc2626] text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium py-3 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
