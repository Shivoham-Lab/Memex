```
                              ╔═══════════════════════════════════════════════════════════════════════╗
                              ║                                                                       ║
                              ║    ███████╗██╗  ██╗██╗██╗   ██╗ ██████╗ ██╗  ██╗ █████╗ ███╗   ███╗   ║
                              ║    ██╔════╝██║  ██║██║██║   ██║██╔═══██╗██║  ██║██╔══██╗████╗ ████║   ║
                              ║    ███████╗███████║██║██║   ██║██║   ██║███████║███████║██╔████╔██║   ║
                              ║    ╚════██║██╔══██║██║╚██╗ ██╔╝██║   ██║██╔══██║██╔══██║██║╚██╔╝██║   ║
                              ║    ███████║██║  ██║██║ ╚████╔╝ ╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║   ║
                              ║    ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝   ║
                              ║                                                                       ║
                              ║              L  A  B  S  ·  शिवोऽहम्  ·  Independent                    ║
                              ║                                                                       ║
                              ╚═══════════════════════════════════════════════════════════════════════╝
```

<div align="center">

**Building at the edge of AI, systems, and real-world problems.**

*Shivoham (शिवोऽहम्) — "I am that." Sanskrit. Identity. Intent. Purpose.*

[![Website](https://img.shields.io/badge/website-shivoham--lab.github.io-e8a045?style=flat-square&logo=github)](https://shivoham-lab.github.io)
[![LinkedIn](https://img.shields.io/badge/linkedin-Shivoham_Labs-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/company/shivoham-labs)
[![GitHub Org](https://img.shields.io/badge/github-Shivoham--Lab-181717?style=flat-square&logo=github)](https://github.com/Shivoham-Lab)

</div>

---

# Index 
1) Introduction
   - What is Memex
   - How it Works ?
   - Prerequisites
   - Light Mode vs Full Mode
2) Installation Step by Step guide
   - Basic installation
   - Tunnel Setup
   - Connecting AI Tools
3) Basic Quick Start Guide
4) Available Commands
5) Rollback
6) Troubleshooting
7) Ollama Setup
8) Scope Profiles
9) Environment Variables


---

# What is Memex

Locally hosted MCP server with web dashboard for multi AI development. Your code never leaves your machine. Stop copy pasting context between AI tools Memex gives Claude, Cursor and Continue.dev shared memory of your project, tracks every change they make and keeps a full audit trail with git backed rollback. One codebase, multiple AIs, full control.
  

## How it works

- **Three Layer Record System** : Every project has `memex_snapshot.md` (30-second overview), `memex_changelog.md` (append only audit log), and `memex_files.md` (file summaries with gotchas). AIs read these instead of raw code.

- **Ollama Integration **: Two local AI models power intelligent file summarization, changelog generation and semantic search all free, all private.

- **Git Safety Net** : Every file write creates a git checkpoint before and commit after. Any change can be rolled back from the dashboard.

  
## Prerequisites

- Node.js 18+
- Git
- Cloudflare or Tailscale or localtunnel (for remote access)
- Ollama (auto-installed by setup script)
  

## Light Mode vs Full Mode

| Feature                   | Light Mode               | Full Mode                          |
| ------------------------- | ------------------------ | ---------------------------------- |
| Semantic file search      | ✓                        | ✓                                  |
| Auto file summaries       | ✗                        | ✓                                  |
| Auto changelog enrichment | ✗                        | ✓                                  |
| Smart snapshot updates    | ✗                        | ✓                                  |
| RAM required              | ~2GB                     | ~6GB                               |
| Models                    | nomic-embed-text (274MB) | nomic-embed-text + phi4-mini (3GB) |

---

## Installation

```bash

# Clone or navigate to the memex directory

cd memex

  

# Install dependencies

npm install

  

# Run init script (creates .env, configures Ollama mode)

node scripts/init.js

  

# Install Ollama + download models (one command)

npm run setup-ollama

  

# Build the dashboard

npm run build

  

# Start Memex

npm start

```

  

## Tunnel Setup


MCP endpoints are open — the tunnel URL is private and unguessable, so no auth headers needed.

Dashboard login works through all tunnel types (cookies are set with `secure` flag for HTTPS tunnels).

  

Run the interactive setup script to choose a tunnel:


```bash

npm run setup-tunnel

```


Or set up manually:

  

### Option 1 — Cloudflare Tunnel (recommended)

  

Free, custom domain support, automatic HTTPS.

  

```bash

# Install cloudflared

brew install cloudflare/cloudflare/cloudflared  # macOS

# or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

  

# Quick tunnel (no account needed)

cloudflared tunnel --url http://localhost:3000

  

# Or with account (custom domain)

cloudflared tunnel login

cloudflared tunnel create memex

cloudflared tunnel run memex

```

  

### Option 2 — Tailscale

  

Free, private network, works on your devices.

  

```bash

# Install Tailscale

brew install tailscale          # macOS

curl -fsSL https://tailscale.com/install.sh | sh  # Linux

# or download from https://tailscale.com/download

  

# Login and start funnel

tailscale login

tailscale funnel 3000

```

  

### Option 3 — localtunnel

  

Free, quick public URL, no account needed.

  

```bash

# Install

npm install -g localtunnel

  

# Start tunnel

lt --port 3000

  

# With custom subdomain

lt --port 3000 --subdomain my-memex

```

  

## Connecting AI Tools

  

Visit `YOUR_TUNNEL_URL/mcp` in a browser to see all available endpoints.

  

### Claude (claude.ai)

1. Open claude.ai

2. Settings → Connectors → Add MCP server and name it Memex

3. Paste your tunnel URL + `/mcp/browser`

4. Now create a artifact for this choose 'App & Website' then copy and paste this exact prompt

  

```prompt

Connect with Memex mcp in connectors

  

```

5. Claude calls `list_projects()` then `select_project("myapp")`

  

### Cursor

Add to `.cursor/mcp.json`:

```json

{

  "mcpServers": {

    "memex": {

      "url": "YOUR_TUNNEL_URL/mcp/ide/sse"

    }

  }

}

```

  

### Continue.dev / Open Code

Add to `config.json`:

```json

{

  "mcpServers": {

    "memex": {

      "url": "YOUR_TUNNEL_URL/mcp/ide/sse"

    }

  }

}

```

  

---

## Quick Start Guide


### Step 1: Create a Project in the Dashboard

  

1. Start Memex: `npm start`

2. Open the dashboard: `http://localhost:3000`

3. Log in with your password

4. Click **"Add Project"** (or go to Settings)

5. Fill in:

   - **Name**: `my-app` (this is what you'll use in Claude)

   - **Stack**: `React, Node.js` (optional description)

   - **Local Path**: `C:\Users\you\projects\my-app` (absolute path to your code)

6. Click **Save**

  

Memex will create a git repo in your project directory and initialize the record files (`memex_snapshot.md`, `memex_changelog.md`, `memex_files.md`).

  

### Step 2: Start a Tunnel (for Claude web)

  

Claude web needs a public URL. Start a tunnel in a **separate terminal**:

  

```bash

# Tailscale (recommended — private, HTTPS)

tailscale funnel 3000

  

# Or Cloudflare (free, public)

cloudflared tunnel --url http://localhost:3000

```

  

Copy the URL it gives you (e.g., `https://helios-predator.tail04ac1e.ts.net`).

  

### Step 3: Connect Claude Web

  

1. Go to [claude.ai](https://claude.ai)

2. Click your profile → **Settings** → **Connectors**

3. Click **"Add MCP server"**

4. Enter:

   - **Name**: `Memex`

   - **URL**: `https://YOUR_TUNNEL_URL/mcp/browser`

5. Click **Connect**

  

You should see "Memex" listed as a connected server with 11 tools.

  

### Step 4: Use Memex in Claude

  

Now you can talk to Claude naturally. Here are example conversations:

  

#### List Projects

```

You: What projects do I have in Memex?

Claude: [calls list_projects tool]

Claude: You have 2 projects:

  1. my-app (React, Node.js) — last active 2 hours ago

  2. api-server (Python, FastAPI) — last active yesterday

```

  

#### Select a Project

```

You: Select the my-app project

Claude: [calls select_project with name="my-app"]

Claude: Selected "my-app". Here's the context:

  - Snapshot: React SPA with Express backend...

  - Recent changes: Updated auth middleware...

  - Pending TODOs: 3 items (Add user profile, Fix login bug...)

```

  

#### Read a File

```

You: Show me the contents of src/App.tsx

Claude: [calls read_file with path="src/App.tsx"]

Claude: Here's the file... [displays content]

```

  

#### Write a File (with git tracking)

```

You: Add a loading spinner to the App component

Claude: [calls write_file with path="src/App.tsx", content="...", ai_name="Claude", task_description="Add loading spinner"]

Claude: Done! I've:

  - Created a git checkpoint before the change

  - Updated src/App.tsx with the loading spinner

  - Committed the change

  - Updated the changelog and file summaries

```

  

#### Search Files

```

You: Find files related to user authentication

Claude: [calls search_files with query="user authentication"]

Claude: Found 3 relevant files:

  1. src/auth/login.tsx — Login form component

  2. src/auth/useAuth.ts — Auth hook with JWT handling

  3. server/auth.js — Session validation middleware

```

  

#### Work with TODOs

```

You: Show me the pending TODOs

Claude: [calls get_todos]

Claude: You have 3 pending TODOs:

  1. [high] Add user profile page

  2. [medium] Fix login redirect bug

  3. [low] Add dark mode toggle

  

You: Complete the login redirect bug

Claude: [calls complete_todo with id="todo_abc123", summary="Fixed redirect to use returnTo parameter"]

Claude: Done! The TODO is marked complete and a git commit was created.

```

  

### Step 5: Use in IDE (Cursor, VS Code)

  

For IDEs, use the SSE endpoint and add to your MCP config:

  

```json

{

  "mcpServers": {

    "memex": {

      "url": "http://localhost:3000/mcp/ide/sse"

    }

  }

}

```

  

IDEs auto-detect your project by workspace path — no need to manually select.

  
---

### Available Commands

| Command | Description |

|---------|-------------|

| `list_projects` | List all projects in Memex |

| `select_project` | Select active project, returns context |

| `get_context` | Get snapshot, recent changes, TODOs |

| `read_file` | Read a file from the project |

| `write_file` | Write a file (auto git checkpoint + commit) |

| `list_directory` | List files in a directory |

| `search_files` | Semantic/keyword search across files |

| `get_file_summary` | Get detailed file metadata |

| `get_file_diff` | Compare file to past git version |

| `get_todos` | List pending TODOs |

| `complete_todo` | Mark a TODO as done |

  

## Rollback

1. Go to Changelog page in dashboard

2. Click "Rollback to this point" on any entry

3. Confirm — Memex reverts all files and creates a new checkpoint

  

## Troubleshooting

**Claude can't connect to Memex**

- Make sure your tunnel is running (`tailscale funnel 3000` or `cloudflared tunnel --url http://localhost:3000`)

- Use `/mcp/browser` (not `/sse`) for Claude web — it uses Streamable HTTP

- Test the endpoint: open `https://YOUR_TUNNEL_URL/mcp` in a browser

  

**"No project selected" error**

- You must select a project first: "Select the my-app project"

- Or in IDE mode, it auto-detects from your workspace path

  

**Files not updating**

- Memex only tracks files in your project's `local_path`

- Check the path in Settings → Projects → Edit

  

**Dashboard shows "not authenticated"**

- Make sure you're entering the correct password from your `.env` file

- Cookies work through tunnels — no extra config needed

  

## Ollama Setup

Run the setup script to handle everything automatically:


```bash

npm run setup-ollama

```


This will:

1. Install Ollama if not present (Windows: installer, macOS: brew, Linux: curl)

2. Start the Ollama server

3. Download `nomic-embed-text` (required)

4. Ask if you want Full Mode → downloads `phi4-mini` if yes

  

Or manually:

```bash

# Light Mode

ollama pull nomic-embed-text


# Full Mode

ollama pull nomic-embed-text

ollama pull phi4-mini

```

  
## Scope Profiles

Limit which directories an AI can access:

1. Go to Settings → Scope Profiles

2. Create a profile with allowed paths (e.g., `/src/`, `/api/`)

3. Each profile gets its own MCP URL suffix

4. Use different profiles for different AIs

  

## Environment Variables


```

MEMEX_PASSWORD=yourpassword          # Protects dashboard + sets auth_enabled flag

MEMEX_SECRET_KEY=long-random-string  # Signs JWT tokens (required, min 32 chars)

PORT=3000                            # Server port (default: 3000)

OLLAMA_URL=http://localhost:11434    # Ollama API URL

OLLAMA_MODE=full                     # "light" or "full"

OLLAMA_THINKING_MODEL=phi4-mini      # Thinking model (phi4-mini or gemma3:4b)

```