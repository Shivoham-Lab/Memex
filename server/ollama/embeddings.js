import { embed } from './client.js';

/** Generate embedding for a file and return it */
export async function embedFile(filePath, content) {
  const text = `${filePath}: ${content.slice(0, 2000)}`;
  return embed(text);
}

/** Calculate cosine similarity between two vectors */
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Embed and search files using semantic similarity */
export async function semanticSearch(query, files, topK = 5) {
  const queryEmbedding = await embed(query);

  const results = [];
  for (const file of files) {
    if (!file.embedding) continue;
    const score = cosineSimilarity(queryEmbedding, file.embedding);
    results.push({ ...file, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
