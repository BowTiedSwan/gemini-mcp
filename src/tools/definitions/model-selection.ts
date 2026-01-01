import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Tool definition for selecting Gemini model
 */
export const selectModelTool: Tool = {
  name: "select_model",
  description: `Select which Gemini model to use for responses.

Available models:
- **fast**: Gemini 3 - Answers quickly, best for simple questions
- **thinking**: Solves complex problems with deeper reasoning
- **pro**: Thinks longer for advanced math & code

Use this before asking questions to optimize response quality vs speed.

Example:
\`\`\`
select_model({ model: "thinking" })
\`\`\``,
  inputSchema: {
    type: "object",
    properties: {
      model: {
        type: "string",
        enum: ["fast", "thinking", "pro"],
        description: "The model to switch to: 'fast' for quick answers, 'thinking' for complex problems, or 'pro' for advanced reasoning",
      },
      session_id: {
        type: "string",
        description: "Optional session ID to switch model for (uses current session if not provided)",
      },
    },
    required: ["model"],
  },
};
