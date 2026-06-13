import { z } from 'zod';
import { readFileSummaries, parseFileSummaries } from '../records/fileSummaries.js';
import { embed } from '../ollama/client.js';
import { semanticSearch } from '../ollama/embeddings.js';
import { logAndBroadcast } from '../activity.js';
import { getCurrentProject } from './browserMode.js';

/** Register search tools */
export function registerSearchTools(server) {
  server.tool('search_files', 'Find the most relevant files for a task using semantic or keyword search', {
    query: z.string().describe('Natural language description of what you need')
  }, async ({ query }) => {
    const project = getCurrentProject();
    if (!project) return { content: [{ type: 'text', text: 'No project selected.' }], isError: true };

    try {
      const content = readFileSummaries(project.local_path);
      const entries = parseFileSummaries(content);

      if (project.ollama_mode === 'full') {
        const filesWithEmbeddings = [];
        for (const entry of entries) {
          try {
            const text = `${entry.path}: ${entry.purpose} ${entry.gotchas.join(' ')}`;
            const embedding = await embed(text);
            filesWithEmbeddings.push({ ...entry, embedding });
          } catch {
            filesWithEmbeddings.push({ ...entry, embedding: null });
          }
        }

        const results = await semanticSearch(query, filesWithEmbeddings, 5);
        logAndBroadcast(project.id, null, 'search_files', `Semantic search: ${query}`);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              results: results.map(r => ({
                path: r.path,
                summary: r.purpose,
                score: r.score,
                has_gotchas: r.gotchas.length > 0
              })),
              search_type: 'semantic',
              model: 'nomic-embed-text'
            }, null, 2)
          }]
        };
      } else {
        const queryLower = query.toLowerCase();
        const results = entries
          .map(e => ({
            ...e,
            score: calculateKeywordScore(e, queryLower)
          }))
          .filter(e => e.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        logAndBroadcast(project.id, null, 'search_files', `Keyword search: ${query}`);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              results: results.map(r => ({
                path: r.path,
                summary: r.purpose,
                score: r.score,
                has_gotchas: r.gotchas.length > 0
              })),
              search_type: 'keyword',
              model: null
            }, null, 2)
          }]
        };
      }
    } catch (error) {
      return { content: [{ type: 'text', text: `Search error: ${error.message}` }], isError: true };
    }
  });
}

function calculateKeywordScore(entry, query) {
  let score = 0;
  const text = `${entry.path} ${entry.purpose} ${entry.exports.join(' ')} ${entry.dependsOn.join(' ')} ${entry.gotchas.join(' ')}`.toLowerCase();
  const words = query.split(/\s+/);
  for (const word of words) {
    if (text.includes(word)) score += 1;
    if (entry.path.toLowerCase().includes(word)) score += 2;
  }
  return score / words.length;
}
