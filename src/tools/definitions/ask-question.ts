import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ConversationLibrary } from "../../library/conversation-library.js";

/**
 * Build dynamic tool description for ask_question based on active conversation or library
 */
export function buildAskQuestionDescription(library: ConversationLibrary): string {
  const active = library.getActiveConversation();
  const bt = "`"; // Backtick helper to avoid template literal issues

  if (active) {
    const topics = active.topics.join(", ");
    const useCases = active.use_cases.map((uc) => `  - ${uc}`).join("\n");

    return `# Conversational Research Partner (Gemini App • Gemini 2.5 • Session RAG)

**Active Conversation:** ${active.name}
**Content:** ${active.description}
**Topics:** ${topics}

> Auth tip: If login is required, use the prompt 'conversationlm.auth-setup' and then verify with the 'get_health' tool. If authentication later fails (e.g., expired cookies), use the prompt 'conversationlm.auth-repair'.

## What This Tool Is
- Full conversational research with Gemini (LLM) grounded on your conversation sources
- Session-based: each follow-up uses prior context for deeper, more precise answers
- Source-cited responses designed to minimize hallucinations

## When To Use
${useCases}

## Rules (Important)
- Always prefer continuing an existing session for the same task
- If you start a new thread, create a new session and keep its session_id
- Ask clarifying questions before implementing; do not guess missing details
- If multiple conversations could apply, propose the top 1–2 and ask which to use
- If task context changes, ask to reset the session or switch conversations
- If authentication fails, use the prompts 'conversationlm.auth-repair' (or 'conversationlm.auth-setup') and verify with 'get_health'
- After every Gemini App answer: pause, compare with the user's goal, and only respond if you are 100% sure the information is complete. Otherwise, plan the next Gemini App question in the same session.

## Session Flow (Recommended)
${bt}${bt}${bt}javascript
// 1) Start broad (no session_id → creates one)
ask_question({ question: "Give me an overview of [topic]" })
// ← Save: result.session_id

// 2) Go specific (same session)
ask_question({ question: "Key APIs/methods?", session_id })

// 3) Cover pitfalls (same session)
ask_question({ question: "Common edge cases + gotchas?", session_id })

// 4) Ask for production example (same session)
ask_question({ question: "Show a production-ready example", session_id })
${bt}${bt}${bt}

## Automatic Multi-Pass Strategy (Host-driven)
- Simple prompts return once-and-done answers.
- For complex prompts, the host should issue follow-up calls:
  1. Implementation plan (APIs, dependencies, configuration, authentication).
  2. Pitfalls, gaps, validation steps, missing prerequisites.
- Keep the same session_id for all follow-ups, review Gemini App's answer, and ask more questions until the problem is fully resolved.
- Before replying to the user, double-check: do you truly have everything? If not, queue another ask_question immediately.

## 🔥 REAL EXAMPLE

Task: "Implement error handling in n8n workflow"

Bad (shallow):
${bt}${bt}${bt}
Q: "How do I handle errors in n8n?"
A: [basic answer]
→ Implement → Probably missing edge cases!
${bt}${bt}${bt}

Good (deep):
${bt}${bt}${bt}
Q1: "What are n8n's error handling mechanisms?" (session created)
A1: [Overview of error handling]

Q2: "What's the recommended pattern for API errors?" (same session)
A2: [Specific patterns, uses context from Q1]

Q3: "How do I handle retry logic and timeouts?" (same session)
A3: [Detailed approach, builds on Q1+Q2]

Q4: "Show me a production example with all these patterns" (same session)
A4: [Complete example with full context]

→ NOW implement with confidence!
${bt}${bt}${bt}
    
## Conversation Selection
- Default: active conversation (${active.id})
- Or set conversation_id to use a library conversation
- Or set gemini_url for ad-hoc conversations (not in library)
- If ambiguous which conversation fits, ASK the user which to use`;
  } else {
    return `# Conversational Research Partner (Gemini App • Gemini 2.5 • Session RAG)

## No Active Conversation
- Visit https://conversationlm.google to create a conversation and get a share link
- Use **add_conversation** to add it to your library (explains how to get the link)
- Use **list_conversations** to show available sources
- Use **select_conversation** to set one active

> Auth tip: If login is required, use the prompt 'conversationlm.auth-setup' and then verify with the 'get_health' tool. If authentication later fails (e.g., expired cookies), use the prompt 'conversationlm.auth-repair'.

Tip: Tell the user you can manage Gemini App library and ask which conversation to use for the current task.`;
  }
}

export const askQuestionTool: Tool = {
  name: "ask_question",
  // Description will be set dynamically using buildAskQuestionDescription
  description: "Dynamic description placeholder", 
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "The question to ask Gemini App",
      },
      session_id: {
        type: "string",
        description:
          "Optional session ID for contextual conversations. If omitted, a new session is created.",
      },
      conversation_id: {
        type: "string",
        description:
          "Optional conversation ID from your library. If omitted, uses the active conversation. " +
          "Use list_conversations to see available conversations.",
      },
      gemini_url: {
        type: "string",
        description:
          "Optional conversation URL (overrides conversation_id). Use this for ad-hoc queries to conversations not in your library.",
      },
      show_browser: {
        type: "boolean",
        description:
          "Show browser window for debugging (simple version). " +
          "For advanced control (typing speed, stealth, etc.), use browser_options instead.",
      },
      browser_options: {
        type: "object",
        description:
          "Optional browser behavior settings. Claude can control everything: " +
          "visibility, typing speed, stealth mode, timeouts. Useful for debugging or fine-tuning.",
        properties: {
          show: {
            type: "boolean",
            description: "Show browser window (default: from ENV or false)",
          },
          headless: {
            type: "boolean",
            description: "Run browser in headless mode (default: true)",
          },
          timeout_ms: {
            type: "number",
            description: "Browser operation timeout in milliseconds (default: 30000)",
          },
          stealth: {
            type: "object",
            description: "Human-like behavior settings to avoid detection",
            properties: {
              enabled: {
                type: "boolean",
                description: "Master switch for all stealth features (default: true)",
              },
              random_delays: {
                type: "boolean",
                description: "Random delays between actions (default: true)",
              },
              human_typing: {
                type: "boolean",
                description: "Human-like typing patterns (default: true)",
              },
              mouse_movements: {
                type: "boolean",
                description: "Realistic mouse movements (default: true)",
              },
              typing_wpm_min: {
                type: "number",
                description: "Minimum typing speed in WPM (default: 160)",
              },
              typing_wpm_max: {
                type: "number",
                description: "Maximum typing speed in WPM (default: 240)",
              },
              delay_min_ms: {
                type: "number",
                description: "Minimum delay between actions in ms (default: 100)",
              },
              delay_max_ms: {
                type: "number",
                description: "Maximum delay between actions in ms (default: 400)",
              },
            },
          },
          viewport: {
            type: "object",
            description: "Browser viewport size",
            properties: {
              width: {
                type: "number",
                description: "Viewport width in pixels (default: 1920)",
              },
              height: {
                type: "number",
                description: "Viewport height in pixels (default: 1080)",
              },
            },
          },
        },
      },
    },
    required: ["question"],
  },
};
