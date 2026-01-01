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
- 🎨 **Gemini Tools**: Access Deep Research, Video Creation (Veo 3.1), and Image Generation
- 🧠 **Model Selection**: Switch between Fast (Gemini 3), Thinking, and Pro models

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

### Core Chat Tools
- `ask_question` - Ask Gemini a question in any conversation
- `select_model` - Switch between Gemini models (fast, thinking, pro)
- `use_gemini_tool` - Use specialized Gemini tools (deep_research, create_video, create_image)

### Authentication
- `setup_auth` - Set up Google authentication (one-time)
- `re_auth` - Re-authenticate with a different account

### Session Management
- `list_sessions` - List active conversation sessions
- `close_session` - Close a specific session
- `reset_session` - Reset conversation history

### System
- `get_health` - Check server health and authentication status

### Conversation Library (Optional)
- `add_conversation` - Add a conversation URL to your library
- `list_conversations` - List saved conversations
- `select_conversation` - Set the active conversation
- `search_conversations` - Search your conversation library

---

## Usage Examples

### Switching Models

Switch between different Gemini models based on your needs:

```
"Switch to Gemini Fast model for quick answers"
# → Uses select_model with model: "fast"

"Use the Thinking model for this complex problem"
# → Uses select_model with model: "thinking"

"Switch to Pro model for advanced reasoning"
# → Uses select_model with model: "pro"
```

**Available Models:**
- `fast` - Gemini 3: Quick answers for simple questions
- `thinking` - Deeper reasoning for complex problems
- `pro` - Advanced math and code with extended thinking

### Using Gemini Tools

Access specialized Gemini capabilities:

#### Deep Research
```
"Use Gemini's deep research to investigate quantum computing developments in 2025"
# → Uses use_gemini_tool with tool: "deep_research"
```

Deep Research provides:
- Multi-source synthesis
- Fact-checking
- Comprehensive topic overviews

#### Video Generation (Veo 3.1)
```
"Create a video showing a sunset over mountains"
# → Uses use_gemini_tool with tool: "create_video"
```

Video creation features:
- Text-to-video generation
- Scene descriptions
- Motion and camera controls

#### Image Generation
```
"Generate an image of a futuristic city at night"
# → Uses use_gemini_tool with tool: "create_image"
```

Image generation features:
- Text-to-image generation
- Artistic styles
- Photo-realistic outputs

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
