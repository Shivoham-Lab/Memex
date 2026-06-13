import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

console.log('\n╔══════════════════════════════════════╗');
console.log('║     Memex Tunnel Setup               ║');
console.log('╚══════════════════════════════════════╝\n');
console.log('Choose a tunnel service to expose Memex to the internet:\n');
console.log('  [1] Cloudflare Tunnel  — free, custom domain, HTTPS');
console.log('  [2] Tailscale          — free, private network, no HTTPS');
console.log('  [3] localtunnel        — free, quick public URL\n');

const choice = await ask('Choose [1/2/3]: ');

async function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

async function checkPort(port) {
  try {
    if (process.platform === 'win32') {
      const result = await run(`netstat -ano | findstr :${port}`);
      return result && result.includes('LISTENING');
    } else {
      await run(`lsof -i:${port}`);
      return false;
    }
  } catch {
    return false;
  }
}

if (choice === '1') {
  // Cloudflare Tunnel
  console.log('\n--- Cloudflare Tunnel Setup ---\n');

  const installed = await run('cloudflared --version');
  if (!installed) {
    console.log('cloudflared not found. Installing...');
    if (process.platform === 'darwin') {
      execSync('brew install cloudflare/cloudflare/cloudflared', { stdio: 'inherit' });
    } else if (process.platform === 'win32') {
      console.log('Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/');
      console.log('Install manually, then re-run this script.');
      rl.close();
      process.exit(0);
    } else {
      execSync('curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null && echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list && sudo apt update && sudo apt install -y cloudflared', { stdio: 'inherit' });
    }
    console.log('✓ cloudflared installed');
  } else {
    console.log('✓ cloudflared found');
  }

  console.log('\nStarting quick tunnel (no account needed)...\n');
  console.log('Press Ctrl+C to stop.\n');

  const port = process.env.PORT || 3000;
  const tunnel = execSync(`cloudflared tunnel --url http://localhost:${port}`, {
    stdio: 'inherit',
    shell: true
  });

} else if (choice === '2') {
  // Tailscale
  console.log('\n--- Tailscale Setup ---\n');

  const installed = await run('tailscale --version');
  if (!installed) {
    console.log('Tailscale not found. Installing...');
    if (process.platform === 'darwin') {
      execSync('brew install tailscale', { stdio: 'inherit' });
    } else if (process.platform === 'win32') {
      console.log('Download from: https://tailscale.com/download');
      console.log('Install manually, then re-run this script.');
      rl.close();
      process.exit(0);
    } else {
      execSync('curl -fsSL https://tailscale.com/install.sh | sh', { stdio: 'inherit' });
    }
    console.log('✓ Tailscale installed');
  } else {
    console.log('✓ Tailscale found');
  }

  // Check if logged in
  const status = await run('tailscale status');
  if (!status || status.includes('Logged out')) {
    console.log('\nLogging in to Tailscale...');
    execSync('tailscale login', { stdio: 'inherit' });
  }

  const port = process.env.PORT || 3000;
  console.log('\nStarting Tailscale funnel...\n');
  console.log('Your Memex will be available at your Tailscale hostname.');
  console.log('Press Ctrl+C to stop.\n');

  execSync(`tailscale funnel ${port}`, {
    stdio: 'inherit',
    shell: true
  });

} else if (choice === '3') {
  // localtunnel
  console.log('\n--- localtunnel Setup ---\n');

  let ltInstalled = false;
  try {
    execSync('lt --version', { stdio: 'ignore' });
    ltInstalled = true;
  } catch {}

  if (!ltInstalled) {
    console.log('Installing localtunnel...');
    execSync('npm install -g localtunnel', { stdio: 'inherit' });
    console.log('✓ localtunnel installed');
  } else {
    console.log('✓ localtunnel found');
  }

  const port = process.env.PORT || 3000;
  const subdomain = await ask(`Subdomain (optional, press Enter to skip): `);

  console.log('\nStarting localtunnel...\n');

  const cmd = subdomain ? `lt --port ${port} --subdomain ${subdomain}` : `lt --port ${port}`;
  execSync(cmd, {
    stdio: 'inherit',
    shell: true
  });

} else {
  console.log('Invalid choice.');
}

rl.close();
