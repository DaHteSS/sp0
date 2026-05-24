# SSH Panel Zero (SP0)

A self-hosted web SSH workspace built with **Next.js** and **Node.js**. Manage saved hosts, open an interactive terminal, browse remote files over SFTP, and edit them in the browser—without leaving the panel.

<p align="center">
  <strong>Terminal · SFTP file explorer · Monaco editor · Encrypted credential vault</strong>
</p>

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Data & security](#data--security)
- [Production](#production)
- [Docker](#docker)
- [License](#license)

---

## Features

- **Server library** — Add, edit, and remove SSH targets with optional password or private key authentication.
- **Web terminal** — Full PTY session over WebSocket using [xterm.js](https://github.com/xtermjs/xterm.js) and [ssh2](https://github.com/mscdex/ssh2).
- **Remote files** — List directories, read and write files via SFTP from the same SSH connection.
- **In-browser editor** — [Monaco Editor](https://github.com/microsoft/monaco-editor) for editing remote files.
- **Encrypted storage** — Server credentials are stored in SQLite (`better-sqlite3`) as AES-256-GCM ciphertext, not plain text.

---

## Architecture

| Layer | Technology |
|--------|------------|
| UI | Next.js 15 (App Router), React 19, Tailwind CSS |
| HTTP + WebSocket | Custom Node server (`server.ts`) — Next request handler plus `ws` upgrade on `/api/ws` |
| SSH / SFTP | `ssh2` |
| Persistence | SQLite in `./data/servers.db` |

The custom server is required so the browser can upgrade to WebSockets on the same origin as the Next app.

---

## Requirements

- **Node.js** 18.18+ or **20+** (recommended for Next.js 15)
- **npm** (or another compatible package manager)
- Native build toolchain for **`better-sqlite3`** (e.g. Xcode Command Line Tools on macOS, `build-essential` on Debian/Ubuntu)

---

## Getting started

### 1. Clone and install

```bash
git clone <repository-url>
cd sshTerminal
npm install
```

### 2. Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (unless you changed `PORT` or `HOSTNAME`).

### 3. Production build

```bash
npm run build
npm run start
```

`start` runs the same custom server with `NODE_ENV=production` after a successful `next build`.

---

## Configuration

Environment variables are read by `server.ts` and server-side code (vault, DB paths).

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | HTTP port (default: `3000`) |
| `HOSTNAME` | No | Bind address (default: `localhost`) |
| `NODE_ENV` | No | Set automatically by `npm run start` to `production` |
| `SSH_TERMINAL_MASTER_KEY` | No | Base64-encoded **32-byte** key used to encrypt/decrypt stored server credentials. If unset, a key is created at `data/.vault-key` on first use. |

**Example — set a stable master key (recommended for production):**

```bash
# Generates 32 random bytes, base64-encoded
export SSH_TERMINAL_MASTER_KEY="$(openssl rand -base64 32)"
npm run start
```

If you set `SSH_TERMINAL_MASTER_KEY`, it must decode to exactly 32 bytes or the app will fail at startup.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development: custom server + Next dev |
| `npm run build` | `next build` |
| `npm run start` | Production: custom server + Next production |
| `npm run lint` | ESLint |

---

## Data & security

- **`data/servers.db`** — SQLite database with encrypted server records.
- **`data/.vault-key`** — Auto-generated 32-byte key (file mode `0600`) when `SSH_TERMINAL_MASTER_KEY` is not set.

**Important:**

- This application does **not** ship with multi-user authentication. Anyone who can reach the URL can use the UI and stored credentials. Run it on trusted networks, bind to `127.0.0.1`, or put it behind your own reverse proxy and access controls.
- Protect `data/` and any `SSH_TERMINAL_MASTER_KEY` you use; loss or exposure of the key allows decryption of stored secrets.
- SSH host keys and known-hosts behavior follow your environment and `ssh2` defaults—review `ssh2` documentation for strict host key verification if you need it.

---

## Production

1. Set `SSH_TERMINAL_MASTER_KEY` and persist it securely (e.g. secrets manager or systemd environment file).
2. Run `npm run build` then `npm run start`.
3. Prefer binding to `127.0.0.1` and exposing only via HTTPS (e.g. Caddy, nginx) with authentication at the edge if the instance is exposed beyond your machine.

---

## Docker

The image runs the same custom server as `npm run start`, binds to `0.0.0.0`, and persists SQLite and vault data in `/app/data`.

### Quick start (Compose)

```bash
docker compose up -d --build
```

Open [http://localhost:1337](http://localhost:1337) (host port; override with `PORT` in `.env`).

### Master key in Docker

For production, set a stable encryption key (see [Configuration](#configuration)):

```bash
export SSH_TERMINAL_MASTER_KEY="$(openssl rand -base64 32)"
docker compose up -d --build
```

Or add `SSH_TERMINAL_MASTER_KEY` to a `.env` file next to `docker-compose.yml` (see `.env.docker.example`).

### Build image only

```bash
docker build -t sp0 .
docker run -d --name sp0 -p 127.0.0.1:1337:3000 -v sp0-data:/app/data sp0
```

**Security:** SP0 has no built-in login. Do not expose the container port on untrusted networks without a reverse proxy and your own authentication.

---

## License

This project is licensed under the **Apache License 2.0** — see the [`LICENSE`](LICENSE) file for details.
