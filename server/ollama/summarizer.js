import { generate } from './client.js';
import { FILE_SUMMARY_PROMPT } from './prompts.js';
import { updateFileSummary } from '../records/fileSummaries.js';
import { createOllamaJob, updateOllamaJob } from '../db.js';

/** Generate file summary using Phi-4 Mini (non-blocking) */
export async function summarizeFile(projectId, projectPath, filePath, content, thinkingModel) {
  const jobId = createOllamaJob(projectId, 'file_summary', filePath).lastInsertRowid;

  try {
    updateOllamaJob(jobId, 'processing');

    const prompt = FILE_SUMMARY_PROMPT
      .replace('{path}', filePath)
      .replace('{content}', content.slice(0, 4000));

    const response = await generate(thinkingModel || 'phi4-mini', prompt);

    let summary;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      summary = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      summary = null;
    }

    if (summary) {
      updateFileSummary(projectPath, filePath, {
        purpose: summary.purpose,
        exports: summary.exports || [],
        dependsOn: summary.depends_on || [],
        gotchas: summary.gotchas || [],
        ollamaEnhanced: true
      });
    }

    updateOllamaJob(jobId, 'done', JSON.stringify(summary));
    return summary;
  } catch (error) {
    updateOllamaJob(jobId, 'failed', error.message);
    console.error(`Ollama summarization failed for ${filePath}:`, error.message);
    return null;
  }
}
