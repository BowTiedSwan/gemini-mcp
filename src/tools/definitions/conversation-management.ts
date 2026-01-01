import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const conversationManagementTools: Tool[] = [
  {
    name: "add_conversation",
    description:
      `PERMISSION REQUIRED — Only when user explicitly asks to add a conversation.

## Conversation Workflow (Mandatory)
When the user says: "I have a Gemini App with X"

1) Ask URL: "What is the Gemini App URL?"
2) Ask content: "What knowledge is inside?" (1–2 sentences)
3) Ask topics: "Which topics does it cover?" (3–5)
4) Ask use cases: "When should we consult it?"
5) Propose metadata and confirm:
   - Name: [suggested]
   - Description: [from user]
   - Topics: [list]
   - Use cases: [list]
   "Add it to your library now?"
6) Only after explicit "Yes" → call this tool

## Rules
- Do not add without user permission
- Do not guess metadata — ask concisely
- Confirm summary before calling the tool

## Example
User: "I have a conversation with n8n docs"
You: Ask URL → content → topics → use cases; propose summary
User: "Yes"
You: Call add_conversation

## How to Get a Gemini App Share Link

Visit https://conversationlm.google/ → Login (free: 100 conversations, 50 sources each, 500k words, 50 daily queries)
1) Click "+ New" (top right) → Upload sources (docs, knowledge)
2) Click "Share" (top right) → Select "Anyone with the link"
3) Click "Copy link" (bottom left) → Give this link to Claude

(Upgraded: Google AI Pro/Ultra gives 5x higher limits)`,
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The Gemini App conversation URL",
        },
        name: {
          type: "string",
          description: "Display name for the conversation (e.g., 'n8n Documentation')",
        },
        description: {
          type: "string",
          description: "What knowledge/content is in this conversation",
        },
        topics: {
          type: "array",
          items: { type: "string" },
          description: "Topics covered in this conversation",
        },
        content_types: {
          type: "array",
          items: { type: "string" },
          description:
            "Types of content (e.g., ['documentation', 'examples', 'best practices'])",
        },
        use_cases: {
          type: "array",
          items: { type: "string" },
          description: "When should Claude use this conversation (e.g., ['Implementing n8n workflows'])",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags for organization",
        },
      },
      required: ["url", "name", "description", "topics"],
    },
  },
  {
    name: "list_conversations",
    description:
      "List all library conversations with metadata (name, topics, use cases, URL). " +
      "Use this to present options, then ask which conversation to use for the task.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_conversation",
    description: "Get detailed information about a specific conversation by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The conversation ID",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "select_conversation",
    description:
      `Set a conversation as the active default (used when ask_question has no conversation_id).

## When To Use
- User switches context: "Let's work on React now"
- User asks explicitly to activate a conversation
- Obvious task change requires another conversation

## Auto-Switching
- Safe to auto-switch if the context is clear and you announce it:
  "Switching to React conversation for this task..."
- If ambiguous, ask: "Switch to [conversation] for this task?"

## Example
User: "Now let's build the React frontend"
You: "Switching to React conversation..." (call select_conversation)`,
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The conversation ID to activate",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "update_conversation",
    description:
      `Update conversation metadata based on user intent.

## Pattern
1) Identify target conversation and fields (topics, description, use_cases, tags, url)
2) Propose the exact change back to the user
3) After explicit confirmation, call this tool

## Examples
- User: "React conversation also covers Next.js 14"
  You: "Add 'Next.js 14' to topics for React?"
  User: "Yes" → call update_conversation

- User: "Include error handling in n8n description"
  You: "Update the n8n description to mention error handling?"
  User: "Yes" → call update_conversation

Tip: You may update multiple fields at once if requested.`,
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The conversation ID to update",
        },
        name: {
          type: "string",
          description: "New display name",
        },
        description: {
          type: "string",
          description: "New description",
        },
        topics: {
          type: "array",
          items: { type: "string" },
          description: "New topics list",
        },
        content_types: {
          type: "array",
          items: { type: "string" },
          description: "New content types",
        },
        use_cases: {
          type: "array",
          items: { type: "string" },
          description: "New use cases",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "New tags",
        },
        url: {
          type: "string",
          description: "New conversation URL",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "remove_conversation",
    description:
      `Dangerous — requires explicit user confirmation.

## Confirmation Workflow
1) User requests removal ("Remove the React conversation")
2) Look up full name to confirm
3) Ask: "Remove '[conversation_name]' from your library? (Does not delete the actual Gemini App conversation)"
4) Only on explicit "Yes" → call remove_conversation

Never remove without permission or based on assumptions.

Example:
User: "Delete the old React conversation"
You: "Remove 'React Best Practices' from your library?"
User: "Yes" → call remove_conversation`,
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The conversation ID to remove",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "search_conversations",
    description:
      "Search library by query (name, description, topics, tags). " +
      "Use to propose relevant conversations for the task and then ask which to use.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_library_stats",
    description: "Get statistics about your conversation library (total conversations, usage, etc.)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];
