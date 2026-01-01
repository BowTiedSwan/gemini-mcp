/**
 * MCP Tool Definitions
 *
 * Aggregates tool definitions from sub-modules.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ConversationLibrary } from "../library/conversation-library.js";
import {
  askQuestionTool,
  buildAskQuestionDescription,
} from "./definitions/ask-question.js";
import { conversationManagementTools } from "./definitions/conversation-management.js";
import { sessionManagementTools } from "./definitions/session-management.js";
import { systemTools } from "./definitions/system.js";

/**
 * Build Tool Definitions with ConversationLibrary context
 */
export function buildToolDefinitions(library: ConversationLibrary): Tool[] {
  // Update the description for ask_question based on the library state
  const dynamicAskQuestionTool = {
    ...askQuestionTool,
    description: buildAskQuestionDescription(library),
  };

  return [
    dynamicAskQuestionTool,
    ...conversationManagementTools,
    ...sessionManagementTools,
    ...systemTools,
  ];
}