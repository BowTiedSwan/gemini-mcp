import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Tool definition for using Gemini's specialized tools
 */
export const useGeminiToolTool: Tool = {
  name: "use_gemini_tool",
  description: `Use one of Gemini's specialized tools for specific tasks.

Available tools:
- **deep_research**: Conduct comprehensive research on a topic using multiple sources
- **create_video**: Create videos using Veo 3.1 (Google's video generation model)
- **create_image**: Generate images using Imagen (Google's image generation model)

Each tool has different capabilities:
- Deep Research: Multi-source synthesis, fact-checking, comprehensive overviews
- Create Video: Text-to-video generation, scene descriptions, motion
- Create Image: Text-to-image generation, artistic styles, photo-realistic outputs

Example:
\`\`\`
use_gemini_tool({
  tool: "deep_research",
  prompt: "Latest developments in quantum computing 2025",
  session_id: "abc123"
})
\`\`\``,
  inputSchema: {
    type: "object",
    properties: {
      tool: {
        type: "string",
        enum: ["deep_research", "create_video", "create_image"],
        description: "Which Gemini tool to use: 'deep_research', 'create_video', or 'create_image'",
      },
      prompt: {
        type: "string",
        description: "The prompt/query to send to the selected tool",
      },
      session_id: {
        type: "string",
        description: "Optional session ID to use the tool in (uses current session if not provided)",
      },
    },
    required: ["tool", "prompt"],
  },
};
