import { generate } from './client.js';
import { CHANGELOG_ENRICHMENT_PROMPT } from './prompts.js';
import { appendChangelog } from '../records/changelog.js';
import { createOllamaJob, updateOllamaJob } from '../db.js';

/** Enrich changelog entry with DECISION and WATCH OUT from diff (non-blocking) */
export async function enrichChangelog(projectId, projectPath, diff, entry, thinkingModel) {
  if (!diff || diff.trim() === '') return null;

  const jobId = createOllamaJob(projectId, 'changelog_enrichment', null).lastInsertRowid;

  try {
    updateOllamaJob(jobId, 'processing');

    const prompt = CHANGELOG_ENRICHMENT_PROMPT.replace('{diff}', diff.slice(0, 4000));
    const response = await generate(thinkingModel || 'phi4-mini', prompt);

    let enriched;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      enriched = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      enriched = null;
    }

    if (enriched) {
      const allDecisions = [...(entry.decisions || []), ...(enriched.decisions || [])];
      const allWatchOut = [...(entry.watchOut || []), ...(enriched.watch_out || [])];

      appendChangelog(projectPath, {
        ...entry,
        decisions: allDecisions,
        watchOut: allWatchOut,
        ollamaEnhanced: true
      });
    }

    updateOllamaJob(jobId, 'done', JSON.stringify(enriched));
    return enriched;
  } catch (error) {
    updateOllamaJob(jobId, 'failed', error.message);
    console.error(`Ollama changelog enrichment failed:`, error.message);
    return null;
  }
}
