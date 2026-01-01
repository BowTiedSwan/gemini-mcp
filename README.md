# Gemini MCP Server

**Control Google Gemini App directly from your CLI agents (Claude Code, Cursor, etc.) via Model Context Protocol**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-2025-green.svg)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Overview

This MCP server enables your local AI agents (Claude Code, Cursor, etc.) to interact with Google's Gemini App at https://gemini.google.com/app through browser automation. Ask questions, get responses, and maintain conversation context - all from your terminal.

**Adapted from [notebooklm-mcp](https://github.com/PleasePrompto/notebooklm-mcp)** - full credit to Gérôme Dexheimer for the original implementation.

---

## Features

- 🤖 **Browser Automation**: Uses Patchright (Playwright fork) for stealth browser control
- 💬 **Session Management**: Maintain multiple conversation sessions
- ⌨️ **Human-like Typing**: Natural typing speed and behavior to avoid detection
- 🔐 **Authentication**: Automatic Google login with saved session state
- 🎯 **Conversation Context**: Keep track of ongoing conversations

---

## Installation

### Claude Code

```bash
claude mcp add gemini npx gemini-mcp@latest
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "gemini-mcp@latest"]
    }
  }
}
```

---

## Quick Start

### 1. Install the MCP server (see Installation above)

### 2. Authenticate (one-time)

In your AI agent chat:

```
"Log me in to Gemini"
```

A Chrome window will open → log in with your Google account

### 3. Start asking questions

```
"Ask Gemini: What are the latest features in JavaScript?"
```

That's it! Your agent now communicates directly with Gemini.

---

## Available Tools

- `ask_question` - Ask Gemini a question
- `setup_auth` - Set up Google authentication
- `re_auth` - Re-authenticate with a different account
- `list_sessions` - List active conversation sessions
- `close_session` - Close a specific session
- `reset_session` - Reset conversation history
- `get_health` - Check server health

---

## Configuration

Environment variables (optional):

```bash
# Browser Settings
export HEADLESS=true
export BROWSER_TIMEOUT=30000

# Authentication (for auto-login)
export AUTO_LOGIN_ENABLED=false
export LOGIN_EMAIL=your@email.com
export LOGIN_PASSWORD=yourpassword

# Session Management
export MAX_SESSIONS=10
export SESSION_TIMEOUT=900
```

---

## Credits

**Original Implementation**: [notebooklm-mcp](https://github.com/PleasePrompto/notebooklm-mcp) by Gérôme Dexheimer

This project is a fork adapted for Google Gemini App.

---

## License

MIT - Use freely in your projects.

---

⭐ [Star on GitHub](https://github.com/BowTiedSwan/gemini-mcp) if this helps your workflow!
