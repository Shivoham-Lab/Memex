import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import * as d3 from 'd3';

const AI_COLORS = { Claude: '#7c3aed', Cursor: '#2563eb', Continue: '#16a34a', Antigravity: '#ea580c' };
const FOLDER_COLORS = {};

function getFolderColor(path) {
  const folder = path.split('/')[0] || path.split('\\')[0];
  if (!FOLDER_COLORS[folder]) {
    const colors = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#ea580c', '#0891b2'];
    FOLDER_COLORS[folder] = colors[Object.keys(FOLDER_COLORS).length % colors.length];
  }
  return FOLDER_COLORS[folder];
}

export default function Visual() {
  const { id } = useParams();
  const svgRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [mode, setMode] = useState('folder');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (id) api.get(`/api/projects/${id}/files`).then(data => setFiles(data.files));
  }, [id]);

  useEffect(() => {
    if (!files.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Build nodes and links from dependency data
    const nodes = files.map(f => ({
      id: f.path,
      ...f,
      depends: JSON.parse(f.depends_on || '[]'),
    }));

    const links = [];
    nodes.forEach(n => {
      n.depends.forEach(dep => {
        const target = nodes.find(t => t.path === dep);
        if (target) links.push({ source: n.id, target: target.id });
      });
    });

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20));

    const g = svg.append('g');

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#333')
      .attr('stroke-width', 1);

    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', 8)
      .attr('fill', d => {
        if (mode === 'folder') return getFolderColor(d.id);
        if (mode === 'ai') return AI_COLORS[d.last_modified_by] || '#555';
        if (mode === 'health') return d.gotchas?.length > 0 ? '#d97706' : d.ollama_enhanced ? '#16a34a' : '#dc2626';
        return '#7c3aed';
      })
      .attr('stroke', '#0a0a0a')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelected(d);
        // Highlight connected
        node.attr('opacity', n => {
          if (n.id === d.id) return 1;
          const isConnected = links.some(l => (l.source.id === d.id && l.target.id === n.id) || (l.target.id === d.id && l.source.id === n.id));
          return isConnected ? 1 : 0.3;
        });
        link.attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? '#7c3aed' : '#222');
      })
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    node.append('title').text(d => d.path);

    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('cx', d => d.x).attr('cy', d => d.y);
    });

    // Zoom
    const zoom = d3.zoom().scaleExtent([0.3, 4]).on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    return () => simulation.stop();
  }, [files, mode]);

  const modes = [
    { key: 'folder', label: 'Folder' },
    { key: 'ai', label: 'AI' },
    { key: 'health', label: 'Health' },
  ];

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {modes.map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`px-3 py-1 rounded text-xs font-medium ${mode === m.key ? 'bg-[#7c3aed] text-white' : 'bg-[#111] text-[#a3a3a3] hover:bg-[#222]'}`}>
              {m.label}
            </button>
          ))}
        </div>
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {selected && (
        <div className="w-80 border-l border-[#222] p-4 overflow-y-auto">
          <h3 className="font-mono text-sm mb-3">{selected.path}</h3>
          <p className="text-sm text-[#a3a3a3] mb-2">{selected.purpose || 'No summary'}</p>
          {selected.gotchas?.length > 0 && (
            <div className="bg-[#d97706]/10 border border-[#d97706]/30 rounded p-3 mt-3">
              <h4 className="text-xs font-semibold text-[#d97706] mb-1">Gotchas</h4>
              {selected.gotchas.map((g, i) => <p key={i} className="text-xs text-[#d97706]/80">• {g}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
