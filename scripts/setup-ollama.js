import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

const EMBED_MODEL = 'nomic-embed-text';
const THINK_MODEL = 'phi4-mini';
const OLLAMA_URL = 'http://localhost:11434';

console.log('\n╔══════════════════════════════════════╗');
console.log('║       Memex Ollama Setup             ║');
console.log('╚══════════════════════════════════════╝\n');

// Step 1: Check if Ollama is installed
let ollamaInstalled = false;
try {
  execSync('ollama --version', { stdio: 'ignore' });
  ollamaInstalled = true;
  console.log('✓ Ollama is installed');
} catch {
  console.log('✗ Ollama is not installed');
}

// Step 2: Install Ollama if not installed
if (!ollamaInstalled) {
  console.log('\nInstalling Ollama...');

  const platform = process.platform;

  try {
    if (platform === 'win32') {
      console.log('Downloading Ollama for Windows...');
      execSync('curl -fsSL https://ollama.com/download/OllamaSetup.exe -o OllamaSetup.exe', { stdio: 'inherit' });
      console.log('Running installer...');
      execSync('start OllamaSetup.exe', { stdio: 'ignore', shell: true });
      console.log('\n✓ Ollama installer launched.');
      console.log('  Please complete the installation, then run this script again.');
      rl.close();
      process.exit(0);
    } else if (platform === 'darwin') {
      console.log('Installing via Homebrew...');
      execSync('brew install ollama', { stdio: 'inherit' });
    } else {
      console.log('Installing via curl...');
      execSync('curl -fsSL https://ollama.com/install.sh | sh', { stdio: 'inherit' });
    }
    console.log('✓ Ollama installed');
  } catch (e) {
    console.error('Failed to install Ollama automatically.');
    console.error('Please install manually: https://ollama.com/download');
    rl.close();
    process.exit(1);
  }
}

// Step 3: Start Ollama server if not running
let ollamaRunning = false;
try {
  const res = await fetch(`${OLLAMA_URL}/api/tags`);
  ollamaRunning = res.ok;
} catch {}

if (!ollamaRunning) {
  console.log('\nStarting Ollama server...');
  const ollamaProcess = spawn('ollama', ['serve'], {
    detached: true,
    stdio: 'ignore'
  });
  ollamaProcess.unref();

  // Wait for server to start
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`);
      if (res.ok) { ollamaRunning = true; break; }
    } catch {}
  }

  if (ollamaRunning) {
    console.log('✓ Ollama server started');
  } else {
    console.log('⚠ Ollama server may still be starting. Try again in a moment.');
  }
} else {
  console.log('✓ Ollama server is running');
}

// Step 4: Check and pull models
console.log('\nChecking models...\n');

async function checkModel(name) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.models?.some(m => m.name === name || m.name.startsWith(name)) || false;
  } catch {
    return false;
  }
}

async function pullModel(name) {
  console.log(`  Pulling ${name}...`);
  try {
    execSync(`ollama pull ${name}`, { stdio: 'inherit' });
    console.log(`  ✓ ${name} ready`);
  } catch (e) {
    console.error(`  ✗ Failed to pull ${name}: ${e.message}`);
  }
}

const hasEmbed = await checkModel(EMBED_MODEL);
const hasThink = await checkModel(THINK_MODEL);

console.log(`  nomic-embed-text: ${hasEmbed ? '✓ already downloaded' : '✗ needs download'}`);
console.log(`  phi4-mini: ${hasThink ? '✓ already downloaded' : '✗ needs download'}`);

if (!hasEmbed) {
  await pullModel(EMBED_MODEL);
}

const mode = await ask('\nUse Full Mode with phi4-mini? (recommended) [Y/n]: ');
if (mode.toLowerCase() !== 'n' && !hasThink) {
  await pullModel(THINK_MODEL);
}

console.log('\n╔══════════════════════════════════════╗');
console.log('║       Setup complete!                ║');
console.log('╚══════════════════════════════════════╝\n');
console.log('You can now start Memex:');
console.log('  npm run build');
console.log('  npm start\n');

rl.close();
