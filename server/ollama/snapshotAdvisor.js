import { generate } from './client.js';
import { SNAPSHOT_UPDATE_PROMPT } from './prompts.js';
import { readSnapshot, updateSnapshotFileMap } from '../records/snapshot.js';
import { getRecentChangelog } from '../records/changelog.js';
import { createOllamaJob, updateOllamaJob, createSnapshotSuggestion } from '../db.js';

/** Suggest snapshot updates based on recent changes (non-blocking) */
export async function suggestSnapshotUpdate(projectId, projectPath, thinkingModel) {
  const jobId = createOllamaJob(projectId, 'snapshot_update', null).lastInsertRowid;

  try {
    updateOllamaJob(jobId, 'processing');

    const snapshot = readSnapshot(projectPath) || '(no snapshot yet)';
    const recentChanges = getRecentChangelog(projectPath, 5) || '(no changes yet)';

    const prompt = SNAPSHOT_UPDATE_PROMPT
      .replace('{snapshot}', snapshot.slice(0, 3000))
      .replace('{recent_changes}', recentChanges.slice(0, 2000));

    const response = await generate(thinkingModel || 'phi4-mini', prompt);

    let suggestion;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      suggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      suggestion = null;
    }

    if (suggestion) {
      createSnapshotSuggestion(projectId, JSON.stringify(suggestion));

      if (suggestion.file_map_additions) {
        for (const addition of suggestion.file_map_additions) {
          updateSnapshotFileMap(projectPath, addition.path, addition.description);
        }
      }
    }

    updateOllamaJob(jobId, 'done', JSON.stringify(suggestion));
    return suggestion;
  } catch (error) {
    updateOllamaJob(jobId, 'failed', error.message);
    console.error(`Ollama snapshot update failed:`, error.message);
    return null;
  }
}
