import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Todos from './pages/Todos';
import Activity from './pages/Activity';
import Changelog from './pages/Changelog';
import Files from './pages/Files';
import Visual from './pages/Visual';
import Connections from './pages/Connections';
import Settings from './pages/Settings';
import Sidebar from './components/Sidebar';
import { api } from './lib/api';

export default function App() {
  const [authEnabled, setAuthEnabled] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  useEffect(() => {
    api.get('/api/auth/check').then(data => {
      setAuthEnabled(data.auth_enabled);
      setLoggedIn(data.authenticated);
    }).catch(() => setAuthEnabled(false));
  }, []);

  if (authEnabled === null) return <div className="flex items-center justify-center h-screen text-[#a3a3a3]">Loading...</div>;

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar currentProject={currentProject} setCurrentProject={setCurrentProject} />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Overview setCurrentProject={setCurrentProject} />} />
            <Route path="/project/:id/todos" element={<Todos projectId={currentProject} />} />
            <Route path="/project/:id/activity" element={<Activity projectId={currentProject} />} />
            <Route path="/project/:id/changelog" element={<Changelog projectId={currentProject} />} />
            <Route path="/project/:id/files" element={<Files projectId={currentProject} />} />
            <Route path="/project/:id/visual" element={<Visual projectId={currentProject} />} />
            <Route path="/project/:id/connections" element={<Connections projectId={currentProject} />} />
            <Route path="/project/:id/settings" element={<Settings projectId={currentProject} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
