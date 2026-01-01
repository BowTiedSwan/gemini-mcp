/**
 * Gemini App Library Manager
 *
 * Manages a persistent library of Gemini App conversations.
 * Allows Claude to autonomously add, remove, and switch between
 * multiple conversations based on the task at hand.
 */

import fs from "fs";
import path from "path";
import { CONFIG } from "../config.js";
import { log } from "../utils/logger.js";
import type {
  ConversationEntry,
  Library,
  AddConversationInput,
  UpdateConversationInput,
  LibraryStats,
} from "./types.js";

export class ConversationLibrary {
  private libraryPath: string;
  private library: Library;

  constructor() {
    this.libraryPath = path.join(CONFIG.dataDir, "library.json");
    this.library = this.loadLibrary();

    log.info("📚 ConversationLibrary initialized");
    log.info(`  Library path: ${this.libraryPath}`);
    log.info(`  Conversations: ${this.library.conversations.length}`);
    if (this.library.active_conversation_id) {
      log.info(`  Active: ${this.library.active_conversation_id}`);
    }
  }

  /**
   * Load library from disk, or create default if not exists
   */
  private loadLibrary(): Library {
    try {
      if (fs.existsSync(this.libraryPath)) {
        const data = fs.readFileSync(this.libraryPath, "utf-8");
        const library = JSON.parse(data) as Library;
        log.success(`  ✅ Loaded library with ${library.conversations.length} conversations`);
        return library;
      }
    } catch (error) {
      log.warning(`  ⚠️  Failed to load library: ${error}`);
    }

    // Create default library with current CONFIG as first entry
    log.info("  🆕 Creating new library...");
    const defaultLibrary = this.createDefaultLibrary();
    this.saveLibrary(defaultLibrary);
    return defaultLibrary;
  }

  /**
   * Create default library from current CONFIG
   */
  private createDefaultLibrary(): Library {
    const hasConfig =
      CONFIG.geminiUrl &&
      CONFIG.conversationDescription &&
      CONFIG.conversationDescription !== "General knowledge base - configure CONVERSATION_DESCRIPTION to help Claude understand what's in this conversation";

    const conversations: ConversationEntry[] = [];

    if (hasConfig) {
      // Create first entry from CONFIG
      const id = this.generateId(CONFIG.conversationDescription);
      conversations.push({
        id,
        url: CONFIG.geminiUrl,
        name: CONFIG.conversationDescription.substring(0, 50), // First 50 chars as name
        description: CONFIG.conversationDescription,
        topics: CONFIG.conversationTopics,
        content_types: CONFIG.conversationContentTypes,
        use_cases: CONFIG.conversationUseCases,
        added_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        use_count: 0,
        tags: [],
      });

      log.success(`  ✅ Created default conversation: ${id}`);
    }

    return {
      conversations,
      active_conversation_id: conversations.length > 0 ? conversations[0].id : null,
      last_modified: new Date().toISOString(),
      version: "1.0.0",
    };
  }

  /**
   * Save library to disk
   */
  private saveLibrary(library: Library): void {
    try {
      library.last_modified = new Date().toISOString();
      const data = JSON.stringify(library, null, 2);
      fs.writeFileSync(this.libraryPath, data, "utf-8");
      this.library = library;
      log.success(`  💾 Library saved (${library.conversations.length} conversations)`);
    } catch (error) {
      log.error(`  ❌ Failed to save library: ${error}`);
      throw error;
    }
  }

  /**
   * Generate a unique ID from a string (slug format)
   */
  private generateId(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 30);

    // Ensure uniqueness
    let id = base;
    let counter = 1;
    while (this.library.conversations.some((n) => n.id === id)) {
      id = `${base}-${counter}`;
      counter++;
    }

    return id;
  }

  /**
   * Add a new conversation to the library
   */
  addConversation(input: AddConversationInput): ConversationEntry {
    log.info(`📝 Adding conversation: ${input.name}`);

    // Generate ID
    const id = this.generateId(input.name);

    // Create entry
    const conversation: ConversationEntry = {
      id,
      url: input.url,
      name: input.name,
      description: input.description,
      topics: input.topics,
      content_types: input.content_types || ["documentation", "examples"],
      use_cases: input.use_cases || [
        `Learning about ${input.name}`,
        `Implementing features with ${input.name}`,
      ],
      added_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
      use_count: 0,
      tags: input.tags || [],
    };

    // Add to library
    const updated = { ...this.library };
    updated.conversations.push(conversation);

    // Set as active if it's the first conversation
    if (updated.conversations.length === 1) {
      updated.active_conversation_id = id;
    }

    this.saveLibrary(updated);
    log.success(`✅ Conversation added: ${id}`);

    return conversation;
  }

  /**
   * List all conversations in library
   */
  listConversations(): ConversationEntry[] {
    return this.library.conversations;
  }

  /**
   * Get a specific conversation by ID
   */
  getConversation(id: string): ConversationEntry | null {
    return this.library.conversations.find((n) => n.id === id) || null;
  }

  /**
   * Get the currently active conversation
   */
  getActiveConversation(): ConversationEntry | null {
    if (!this.library.active_conversation_id) {
      return null;
    }
    return this.getConversation(this.library.active_conversation_id);
  }

  /**
   * Select a conversation as active
   */
  selectConversation(id: string): ConversationEntry {
    const conversation = this.getConversation(id);
    if (!conversation) {
      throw new Error(`Conversation not found: ${id}`);
    }

    log.info(`🎯 Selecting conversation: ${id}`);

    const updated = { ...this.library };
    updated.active_conversation_id = id;

    // Update last_used
    const conversationIndex = updated.conversations.findIndex((n) => n.id === id);
    updated.conversations[conversationIndex] = {
      ...conversation,
      last_used: new Date().toISOString(),
    };

    this.saveLibrary(updated);
    log.success(`✅ Active conversation: ${id}`);

    return updated.conversations[conversationIndex];
  }

  /**
   * Update conversation metadata
   */
  updateConversation(input: UpdateConversationInput): ConversationEntry {
    const conversation = this.getConversation(input.id);
    if (!conversation) {
      throw new Error(`Conversation not found: ${input.id}`);
    }

    log.info(`📝 Updating conversation: ${input.id}`);

    const updated = { ...this.library };
    const index = updated.conversations.findIndex((n) => n.id === input.id);

    updated.conversations[index] = {
      ...conversation,
      ...(input.name && { name: input.name }),
      ...(input.description && { description: input.description }),
      ...(input.topics && { topics: input.topics }),
      ...(input.content_types && { content_types: input.content_types }),
      ...(input.use_cases && { use_cases: input.use_cases }),
      ...(input.tags && { tags: input.tags }),
      ...(input.url && { url: input.url }),
    };

    this.saveLibrary(updated);
    log.success(`✅ Conversation updated: ${input.id}`);

    return updated.conversations[index];
  }

  /**
   * Remove conversation from library
   */
  removeConversation(id: string): boolean {
    const conversation = this.getConversation(id);
    if (!conversation) {
      return false;
    }

    log.info(`🗑️  Removing conversation: ${id}`);

    const updated = { ...this.library };
    updated.conversations = updated.conversations.filter((n) => n.id !== id);

    // If we removed the active conversation, select another one
    if (updated.active_conversation_id === id) {
      updated.active_conversation_id =
        updated.conversations.length > 0 ? updated.conversations[0].id : null;
    }

    this.saveLibrary(updated);
    log.success(`✅ Conversation removed: ${id}`);

    return true;
  }

  /**
   * Increment use count for a conversation
   */
  incrementUseCount(id: string): ConversationEntry | null {
    const conversationIndex = this.library.conversations.findIndex((n) => n.id === id);
    if (conversationIndex === -1) {
      return null;
    }

    const conversation = this.library.conversations[conversationIndex];
    const updated = { ...this.library };
    const updatedConversation: ConversationEntry = {
      ...conversation,
      use_count: conversation.use_count + 1,
      last_used: new Date().toISOString(),
    };

    updated.conversations[conversationIndex] = updatedConversation;
    this.saveLibrary(updated);

    return updatedConversation;
  }

  /**
   * Get library statistics
   */
  getStats(): LibraryStats {
    const totalQueries = this.library.conversations.reduce(
      (sum, n) => sum + n.use_count,
      0
    );

    const mostUsed = this.library.conversations.reduce((max, n) =>
      n.use_count > (max?.use_count || 0) ? n : max
    , null as ConversationEntry | null);

    return {
      total_conversations: this.library.conversations.length,
      active_conversation: this.library.active_conversation_id,
      most_used_conversation: mostUsed?.id || null,
      total_queries: totalQueries,
      last_modified: this.library.last_modified,
    };
  }

  /**
   * Search conversations by query (searches name, description, topics)
   */
  searchConversations(query: string): ConversationEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.library.conversations.filter(
      (n) =>
        n.name.toLowerCase().includes(lowerQuery) ||
        n.description.toLowerCase().includes(lowerQuery) ||
        n.topics.some((t) => t.toLowerCase().includes(lowerQuery)) ||
        n.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }
}
