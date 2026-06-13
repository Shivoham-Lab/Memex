import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function Files() {
  const { id } = useParams();
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (id) api.get(`/api/projects/${id}/files`).then(data => setFiles(data.files));
  }, [id]);

  const gotchaFiles = files.filter(f => f.gotchas?.length > 0);
  const enhancingFiles = files.filter(f => f.ollama_enhancing);

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Left: File tree */}
      <div className="w-80 border-r border-[#222] overflow-y-auto pr-4">
        <h2 className="text-sm font-semibold text-[#a3a3a3] mb-3 uppercase tracking-wide">Files ({files.length})</h2>
        <div className="space-y-0.5">
          {files.map(f => (
            <div key={f.id} onClick={() => setSelected(f)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-sm ${selected?.id === f.id ? 'bg-[#7c3aed]/20 text-[#7c3aed]' : 'hover:bg-[#1a1a1a]'}`}>
              <span className="font-mono truncate flex-1">{f.path}</span>
              {f.gotchas?.length > 0 && <span className="w-2 h-2 rounded-full bg-[#d97706]" title="Has gotchas" />}
              {f.ollama_enhancing && <span className="w-2 h-2 rounded-full bg-[#7c3aed] animate-pulse" title="Enhancing..." />}
              {f.last_modified_by && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#7c3aed22', color: '#7c3aed' }}>
                  {f.last_modified_by}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: File detail */}
      <div className="flex-1 pl-6 overflow-y-auto">
        {selected ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-mono text-lg">{selected.path}</h2>
              {selected.ollama_enhanced && <span className="text-xs px-2 py-0.5 rounded bg-[#16a34a]/20 text-[#16a34a]">Ollama Enhanced</span>}
              {selected.ollama_enhancing && <span className="text-xs px-2 py-0.5 rounded bg-[#7c3aed]/20 text-[#7c3aed] animate-pulse">Enhancing...</span>}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-[#a3a3a3] uppercase mb-1">Purpose</h3>
                <p className="text-sm">{selected.purpose || 'No summary yet'}</p>
              </div>

              {selected.exports?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[#a3a3a3] uppercase mb-1">Exports</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.exports.map((e, i) => <span key={i} className="text-xs font-mono bg-[#1a1a1a] px-2 py-1 rounded">{e}</span>)}
                  </div>
                </div>
              )}

              {selected.depends_on?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[#a3a3a3] uppercase mb-1">Depends On</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.depends_on.map((d, i) => <span key={i} className="text-xs font-mono bg-[#1a1a1a] px-2 py-1 rounded">{d}</span>)}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold text-[#a3a3a3] uppercase mb-1">Last Modified By</h3>
                <p className="text-sm">{selected.last_modified_by || 'Unknown'} — {selected.last_modified_at}</p>
              </div>

              {selected.gotchas?.length > 0 && (
                <div className="bg-[#d97706]/10 border border-[#d97706]/30 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-[#d97706] uppercase mb-2">Gotchas</h3>
                  {selected.gotchas.map((g, i) => <p key={i} className="text-sm text-[#d97706]/80">• {g}</p>)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[#737373]">
            <p>Select a file to view its summary</p>
          </div>
        )}
      </div>
    </div>
  );
}
