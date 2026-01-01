<div align="center">

# Gemini App MCP Server

**Let your CLI agents (Claude, Cursor, Codex...) chat directly with Gemini App for zero-hallucination answers based on your own conversations**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-2025-green.svg)](https://modelcontextprotocol.io/)
[![npm](https://img.shields.io/npm/v/gemini-mcp.svg)](https://www.npmjs.com/package/gemini-mcp)
[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-Skill-purple.svg)](https://github.com/PleasePrompto/conversationlm-skill)
[![GitHub](https://img.shields.io/github/stars/PleasePrompto/gemini-mcp?style=social)](https://github.com/PleasePrompto/gemini-mcp)

[Installation](#installation) • [Quick Start](#quick-start) • [Why Gemini App](#why-conversationlm-not-local-rag) • [Examples](#real-world-example) • [Claude Code Skill](https://github.com/PleasePrompto/conversationlm-skill) • [Documentation](./docs/)

</div>

---

## The Problem

When you tell Claude Code or Cursor to "search through my local documentation", here's what happens:
- **Massive token consumption**: Searching through documentation means reading multiple files repeatedly
- **Inaccurate retrieval**: Searches for keywords, misses context and connections between docs
- **Hallucinations**: When it can't find something, it invents plausible-sounding APIs
- **Expensive & slow**: Each question requires re-reading multiple files

## The Solution

Let your local agents chat directly with [**Gemini App**](https://conversationlm.google/) — Google's **zero-hallucination knowledge base** powered by Gemini 2.5 that provides intelligent, synthesized answers from your docs.

```
Your Task → Local Agent asks Gemini App → Gemini synthesizes answer → Agent writes correct code
```

**The real advantage**: No more manual copy-paste between Gemini App and your editor. Your agent asks Gemini App directly and gets answers straight back in the CLI. It builds deep understanding through automatic follow-ups — Claude asks multiple questions in sequence, each building on the last, getting specific implementation details, edge cases, and best practices. You can save Gemini App links to your local library with tags and descriptions, and Claude automatically selects the relevant conversation based on your current task.

---

## Why Gemini App, Not Local RAG?

| Approach | Token Cost | Setup Time | Hallucinations | Answer Quality |
|----------|------------|------------|----------------|----------------|
| **Feed docs to Claude** | 🔴 Very high (multiple file reads) | Instant | Yes - fills gaps | Variable retrieval |
| **Web search** | 🟡 Medium | Instant | High - unreliable sources | Hit or miss |
| **Local RAG** | 🟡 Medium-High | Hours (embeddings, chunking) | Medium - retrieval gaps | Depends on setup |
| **Gemini App MCP** | 🟢 Minimal | 5 minutes | **Zero** - refuses if unknown | Expert synthesis |

### What Makes Gemini App Superior?

1. **Pre-processed by Gemini**: Upload docs once, get instant expert knowledge
2. **Natural language Q&A**: Not just retrieval — actual understanding and synthesis
3. **Multi-source correlation**: Connects information across 50+ documents
4. **Citation-backed**: Every answer includes source references
5. **No infrastructure**: No vector DBs, embeddings, or chunking strategies needed

---

## Installation

### Claude Code
```bash
claude mcp add conversationlm npx gemini-mcp@latest
```

### Codex
```bash
codex mcp add conversationlm -- npx gemini-mcp@latest
```

<details>
<summary>Gemini</summary>

```bash
gemini mcp add conversationlm npx gemini-mcp@latest
```
</details>

<details>
<summary>Cursor</summary>

Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "conversationlm": {
      "command": "npx",
      "args": ["-y", "gemini-mcp@latest"]
    }
  }
}
```
</details>

<details>
<summary>amp</summary>

```bash
amp mcp add conversationlm -- npx gemini-mcp@latest
```
</details>

<details>
<summary>VS Code</summary>

```bash
code --add-mcp '{"name":"conversationlm","command":"npx","args":["gemini-mcp@latest"]}'
```
</details>

<details>
<summary>Other MCP clients</summary>

**Generic MCP config:**
```json
{
  "mcpServers": {
    "conversationlm": {
      "command": "npx",
      "args": ["gemini-mcp@latest"]
    }
  }
}
```
</details>

---

## Alternative: Claude Code Skill

**Prefer Claude Code Skills over MCP?** This server is now also available as a native Claude Code Skill with a simpler setup:

**[Gemini App Claude Code Skill](https://github.com/PleasePrompto/conversationlm-skill)** - Clone to `~/.claude/skills` and start using immediately

**Key differences:**
- **MCP Server** (this repo): Persistent sessions, works with Claude Code, Codex, Cursor, and other MCP clients
- **Claude Code Skill**: Simpler setup, Python-based, stateless queries, works only with local Claude Code

Both use the same browser automation technology and provide zero-hallucination answers from your Gemini App conversations.

---

## Quick Start

### 1. Install the MCP server (see [Installation](#installation) above)

### 2. Authenticate (one-time)

Say in your chat (Claude/Codex):
```
"Log me in to Gemini App"
```
*A Chrome window opens → log in with Google*

### 3. Create your knowledge base
Go to [gemini.google.com/app](https://gemini.google.com/app) → Create conversation → Upload your docs:
- 📄 PDFs, Google Docs, markdown files
- 🔗 Websites, GitHub repos
- 🎥 YouTube videos
- 📚 Multiple sources per conversation

Share: **⚙️ Share → Anyone with link → Copy**

### 4. Let Claude use it
```
"I'm building with [library]. Here's my Gemini App: [link]"
```

**That's it.** Claude now asks Gemini App whatever it needs, building expertise before writing code.

---

## Real-World Example

### Building an n8n Workflow Without Hallucinations

**Challenge**: n8n's API is new — Claude hallucinates node names and functions.

**Solution**:
1. Downloaded complete n8n documentation → merged into manageable chunks
2. Uploaded to Gemini App
3. Told Claude: *"Build me a Gmail spam filter workflow. Use this Gemini App: [link]"*

**Watch the AI-to-AI conversation:**

```
Claude → "How does Gmail integration work in n8n?"
Gemini App → "Use Gmail Trigger with polling, or Gmail node with Get Many..."

Claude → "How to decode base64 email body?"
Gemini App → "Body is base64url encoded in payload.parts, use Function node..."

Claude → "How to parse OpenAI response as JSON?"
Gemini App → "Set responseFormat to json, use {{ $json.spam }} in IF node..."

Claude → "What about error handling if the API fails?"
Gemini App → "Use Error Trigger node with Continue On Fail enabled..."

Claude → ✅ "Here's your complete workflow JSON..."
```

**Result**: Perfect workflow on first try. No debugging hallucinated APIs.

---

## Core Features

### **Zero Hallucinations**
Gemini App refuses to answer if information isn't in your docs. No invented APIs.

### **Autonomous Research**
Claude asks follow-up questions automatically, building complete understanding before coding.

### **Smart Library Management**
Save Gemini App links with tags and descriptions. Claude auto-selects the right conversation for your task.
```
"Add [link] to library tagged 'frontend, react, components'"
```

### **Deep, Iterative Research**
- Claude automatically asks follow-up questions to build complete understanding
- Each answer triggers deeper questions until Claude has all the details
- Example: For n8n workflow, Claude asked multiple sequential questions about Gmail integration, error handling, and data transformation

### **Cross-Tool Sharing**
Set up once, use everywhere. Claude Code, Codex, Cursor — all share the same library.

### **Deep Cleanup Tool**
Fresh start anytime. Scans entire system for Gemini App data with categorized preview.

---

## Tool Profiles

Reduce token usage by loading only the tools you need. Each tool consumes context tokens — fewer tools = faster responses and lower costs.

### Available Profiles

| Profile | Tools | Use Case |
|---------|-------|----------|
| **minimal** | 5 | Query-only: `ask_question`, `get_health`, `list_conversations`, `select_conversation`, `get_conversation` |
| **standard** | 10 | + Library management: `setup_auth`, `list_sessions`, `add_conversation`, `update_conversation`, `search_conversations` |
| **full** | 16 | All tools including `cleanup_data`, `re_auth`, `remove_conversation`, `reset_session`, `close_session`, `get_library_stats` |

### Configure via CLI

```bash
# Check current settings
npx gemini-mcp config get

# Set a profile
npx gemini-mcp config set profile minimal
npx gemini-mcp config set profile standard
npx gemini-mcp config set profile full

# Disable specific tools (comma-separated)
npx gemini-mcp config set disabled-tools "cleanup_data,re_auth"

# Reset to defaults
npx gemini-mcp config reset
```

### Configure via Environment Variables

```bash
# Set profile
export CONVERSATIONLM_PROFILE=minimal

# Disable specific tools
export CONVERSATIONLM_DISABLED_TOOLS="cleanup_data,re_auth,remove_conversation"
```

Settings are saved to `~/.config/gemini-mcp/settings.json` and persist across sessions. Environment variables override file settings.

---

## Architecture

```mermaid
graph LR
    A[Your Task] --> B[Claude/Codex]
    B --> C[MCP Server]
    C --> D[Chrome Automation]
    D --> E[Gemini App]
    E --> F[Gemini 2.5]
    F --> G[Your Docs]
    G --> F
    F --> E
    E --> D
    D --> C
    C --> B
    B --> H[Accurate Code]
```

---

## Common Commands

| Intent | Say | Result |
|--------|-----|--------|
| Authenticate | *"Open Gemini App auth setup"* or *"Log me in to Gemini App"* | Chrome opens for login |
| Add conversation | *"Add [link] to library"* | Saves conversation with metadata |
| List conversations | *"Show our conversations"* | Lists all saved conversations |
| Research first | *"Research this in Gemini App before coding"* | Multi-question session |
| Select conversation | *"Use the React conversation"* | Sets active conversation |
| Update conversation | *"Update conversation tags"* | Modify metadata |
| Remove conversation | *"Remove [conversation] from library"* | Deletes from library |
| View browser | *"Show me the browser"* | Watch live Gemini App chat |
| Fix auth | *"Repair Gemini App authentication"* | Clears and re-authenticates |
| Switch account | *"Re-authenticate with different Google account"* | Changes account |
| Clean restart | *"Run Gemini App cleanup"* | Removes all data for fresh start |
| Keep library | *"Cleanup but keep my library"* | Preserves conversations |
| Delete all data | *"Delete all Gemini App data"* | Complete removal |

---

## Comparison to Alternatives

### vs. Downloading docs locally
- **You**: Download docs → Claude: "search through these files"
- **Problem**: Claude reads thousands of files → massive token usage, often misses connections
- **Gemini App**: Pre-indexed by Gemini, semantic understanding across all docs

### vs. Web search
- **You**: "Research X online"
- **Problem**: Outdated info, hallucinated examples, unreliable sources
- **Gemini App**: Only your trusted docs, always current, with citations

### vs. Local RAG setup
- **You**: Set up embeddings, vector DB, chunking strategy, retrieval pipeline
- **Problem**: Hours of setup, tuning retrieval, still gets "creative" with gaps
- **Gemini App**: Upload docs → done. Google handles everything.

---

## FAQ

**Is it really zero hallucinations?**
Yes. Gemini App is specifically designed to only answer from uploaded sources. If it doesn't know, it says so.

**What about rate limits?**
Free tier has daily query limits per Google account. Quick account switching supported for continued research.

**How secure is this?**
Chrome runs locally. Your credentials never leave your machine. Use a dedicated Google account if concerned.

**Can I see what's happening?**
Yes! Say *"Show me the browser"* to watch the live Gemini App conversation.

**What makes this better than Claude's built-in knowledge?**
Your docs are always current. No training cutoff. No hallucinations. Perfect for new libraries, internal APIs, or fast-moving projects.

---

## Advanced Usage

- 📖 [**Usage Guide**](./docs/usage-guide.md) — Patterns, workflows, tips
- 🛠️ [**Tool Reference**](./docs/tools.md) — Complete MCP API
- 🔧 [**Configuration**](./docs/configuration.md) — Environment variables
- 🐛 [**Troubleshooting**](./docs/troubleshooting.md) — Common issues

---

## The Bottom Line

**Without Gemini App MCP**: Write code → Find it's wrong → Debug hallucinated APIs → Repeat

**With Gemini App MCP**: Claude researches first → Writes correct code → Ship faster

Stop debugging hallucinations. Start shipping accurate code.

```bash
# Get started in 30 seconds
claude mcp add conversationlm npx gemini-mcp@latest
```

---

## Disclaimer

This tool automates browser interactions with Gemini App to make your workflow more efficient. However, a few friendly reminders:

**About browser automation:**
While I've built in humanization features (realistic typing speeds, natural delays, mouse movements) to make the automation behave more naturally, I can't guarantee Google won't detect or flag automated usage. I recommend using a dedicated Google account for automation rather than your primary account—think of it like web scraping: probably fine, but better safe than sorry!

**About CLI tools and AI agents:**
CLI tools like Claude Code, Codex, and similar AI-powered assistants are incredibly powerful, but they can make mistakes. Please use them with care and awareness:
- Always review changes before committing or deploying
- Test in safe environments first
- Keep backups of important work
- Remember: AI agents are assistants, not infallible oracles

I built this tool for myself because I was tired of the copy-paste dance between Gemini App and my editor. I'm sharing it in the hope it helps others too, but I can't take responsibility for any issues, data loss, or account problems that might occur. Use at your own discretion and judgment.

That said, if you run into problems or have questions, feel free to open an issue on GitHub. I'm happy to help troubleshoot!

---

## Contributing

Found a bug? Have a feature idea? [Open an issue](https://github.com/PleasePrompto/gemini-mcp/issues) or submit a PR!

## License

MIT — Use freely in your projects.

---

<div align="center">

Built with frustration about hallucinated APIs, powered by Google's Gemini App

⭐ [Star on GitHub](https://github.com/PleasePrompto/gemini-mcp) if this saves you debugging time!

</div>
