const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

/** Check if Ollama is running */
export async function healthCheck() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

/** Check if a specific model is available */
export async function checkModel(modelName) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.models?.some(m => m.name === modelName || m.name.startsWith(modelName)) || false;
  } catch {
    return false;
  }
}

/** Generate text completion using Ollama */
export async function generate(model, prompt, options = {}) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxTokens ?? 2048,
        ...options
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Ollama generate failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.response;
}

/** Generate embeddings using nomic-embed-text */
export async function embed(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      prompt: text
    })
  });

  if (!res.ok) {
    throw new Error(`Ollama embedding failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.embedding;
}
