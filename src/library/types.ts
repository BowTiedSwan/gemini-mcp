/**
 * Gemini App Library Types
 *
 * Defines the structure for managing multiple Gemini App conversations
 * in a persistent library that Claude can manage autonomously.
 */

/**
 * Single conversation entry in the library
 */
export interface ConversationEntry {
  // Identification
  id: string; // Unique identifier (slug format, e.g., "n8n-docs")
  url: string; // Gemini App URL
  name: string; // Display name (e.g., "n8n Workflow Automation")

  // Metadata for Claude's autonomous decision-making
  description: string; // What knowledge is in this conversation
  topics: string[]; // Topics covered
  content_types: string[]; // Types of content (docs, examples, etc.)
  use_cases: string[]; // When to use this conversation

  // Usage tracking
  added_at: string; // ISO timestamp when added
  last_used: string; // ISO timestamp of last use
  use_count: number; // How many times used

  // Optional tags for organization
  tags?: string[]; // Custom tags for filtering
}

/**
 * The complete conversation library
 */
export interface Library {
  conversations: ConversationEntry[]; // All conversations in library
  active_conversation_id: string | null; // Currently selected conversation
  last_modified: string; // ISO timestamp of last modification
  version: string; // Library format version (for future migrations)
}

/**
 * Input for adding a new conversation
 */
export interface AddConversationInput {
  url: string; // Required: Gemini App URL
  name: string; // Required: Display name
  description: string; // Required: What's in it
  topics: string[]; // Required: Topics covered
  content_types?: string[]; // Optional: defaults to ["documentation", "examples"]
  use_cases?: string[]; // Optional: defaults based on description
  tags?: string[]; // Optional: custom tags
}

/**
 * Input for updating a conversation
 */
export interface UpdateConversationInput {
  id: string; // Required: which conversation to update
  name?: string;
  description?: string;
  topics?: string[];
  content_types?: string[];
  use_cases?: string[];
  tags?: string[];
  url?: string; // Allow changing URL
}

/**
 * Statistics about library usage
 */
export interface LibraryStats {
  total_conversations: number;
  active_conversation: string | null;
  most_used_conversation: string | null;
  total_queries: number;
  last_modified: string;
}
