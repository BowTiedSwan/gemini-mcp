import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  CompleteRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ConversationLibrary } from "../library/conversation-library.js";
import { log } from "../utils/logger.js";

/**
 * Handlers for MCP Resource-related requests
 */
export class ResourceHandlers {
  private library: ConversationLibrary;

  constructor(library: ConversationLibrary) {
    this.library = library;
  }

  /**
   * Register all resource handlers to the server
   */
  public registerHandlers(server: Server): void {
    // List available resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      log.info("📚 [MCP] list_resources request received");

      const conversations = this.library.listConversations();
      const resources: any[] = [
        {
          uri: "conversationlm://library",
          name: "Conversation Library",
          description:
            "Complete conversation library with all available knowledge sources. " +
            "Read this to discover what conversations are available. " +
            "⚠️ If you think a conversation might help with the user's task, " +
            "ASK THE USER FOR PERMISSION before consulting it: " +
            "'Should I consult the [conversation] for this task?'",
          mimeType: "application/json",
        },
      ];

      // Add individual conversation resources
      for (const conversation of conversations) {
        resources.push({
          uri: `conversationlm://library/${conversation.id}`,
          name: conversation.name,
          description:
            `${conversation.description} | Topics: ${conversation.topics.join(", ")} | ` +
            `💡 Use ask_question to query this conversation (ask user permission first if task isn't explicitly about these topics)`,
          mimeType: "application/json",
        });
      }

      // Add legacy metadata resource for backwards compatibility
      const active = this.library.getActiveConversation();
      if (active) {
        resources.push({
          uri: "conversationlm://metadata",
          name: "Active Conversation Metadata (Legacy)",
          description:
            "Information about the currently active conversation. " +
            "DEPRECATED: Use conversationlm://library instead for multi-conversation support. " +
            "⚠️ Always ask user permission before using conversations for tasks they didn't explicitly mention.",
          mimeType: "application/json",
        });
      }

      return { resources };
    });

    // List resource templates
    server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      log.info("📑 [MCP] list_resource_templates request received");

      return {
        resourceTemplates: [
          {
            uriTemplate: "conversationlm://library/{id}",
            name: "Conversation by ID",
            description:
              "Access a specific conversation from your library by ID. " +
              "Provides detailed metadata about the conversation including topics, use cases, and usage statistics. " +
              "💡 Use the 'id' parameter from list_conversations to access specific conversations.",
            mimeType: "application/json",
          },
        ],
      };
    });

    // Read resource content
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      log.info(`📖 [MCP] read_resource request: ${uri}`);

      // Handle library resource
      if (uri === "conversationlm://library") {
        const conversations = this.library.listConversations();
        const stats = this.library.getStats();
        const active = this.library.getActiveConversation();

        const libraryData = {
          active_conversation: active
            ? {
                id: active.id,
                name: active.name,
                description: active.description,
                topics: active.topics,
              }
            : null,
          conversations: conversations.map((nb) => ({
            id: nb.id,
            name: nb.name,
            description: nb.description,
            topics: nb.topics,
            content_types: nb.content_types,
            use_cases: nb.use_cases,
            url: nb.url,
            use_count: nb.use_count,
            last_used: nb.last_used,
            tags: nb.tags,
          })),
          stats,
        };

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(libraryData, null, 2),
            },
          ],
        };
      }

      // Handle individual conversation resource
      if (uri.startsWith("conversationlm://library/")) {
        const prefix = "conversationlm://library/";
        const encodedId = uri.slice(prefix.length);
        if (!encodedId) {
          throw new Error(
            "Conversation resource requires an ID (e.g. conversationlm://library/{id})"
          );
        }

        let id: string;
        try {
          id = decodeURIComponent(encodedId);
        } catch {
          throw new Error(`Invalid conversation identifier encoding: ${encodedId}`);
        }

        if (!/^[a-z0-9][a-z0-9-]{0,62}$/i.test(id)) {
          throw new Error(
            `Invalid conversation identifier: ${encodedId}. Conversation IDs may only contain letters, numbers, and hyphens.`
          );
        }

        const conversation = this.library.getConversation(id);

        if (!conversation) {
          throw new Error(`Conversation not found: ${id}`);
        }

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(conversation, null, 2),
            },
          ],
        };
      }

      // Legacy metadata resource (backwards compatibility)
      if (uri === "conversationlm://metadata") {
        const active = this.library.getActiveConversation();

        if (!active) {
          throw new Error(
            "No active conversation. Use conversationlm://library to see all conversations."
          );
        }

        const metadata = {
          description: active.description,
          topics: active.topics,
          content_types: active.content_types,
          use_cases: active.use_cases,
          gemini_url: active.url,
          conversation_id: active.id,
          last_used: active.last_used,
          use_count: active.use_count,
          note: "DEPRECATED: Use conversationlm://library or conversationlm://library/{id} instead",
        };

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(metadata, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });

    // Argument completions (for prompt arguments and resource templates)
    server.setRequestHandler(CompleteRequestSchema, async (request) => {
      const { ref, argument } = request.params as any;
      try {
        if (ref?.type === "ref/resource") {
          // Complete variables for resource templates
          const uri = String(ref.uri || "");
          // Conversation by ID template
          if (uri === "conversationlm://library/{id}" && argument?.name === "id") {
            const values = this.completeConversationIds(argument?.value);
            return this.buildCompletion(values) as any;
          }
        }
      } catch (e) {
        log.warning(`⚠️  [MCP] completion error: ${e}`);
      }
      return { completion: { values: [], total: 0 } } as any;
    });
  }

  /**
   * Return conversation IDs matching the provided input (case-insensitive contains)
   */
  private completeConversationIds(input: unknown): string[] {
    const query = String(input ?? "").toLowerCase();
    return this.library
      .listConversations()
      .map((nb) => nb.id)
      .filter((id) => id.toLowerCase().includes(query))
      .slice(0, 50);
  }

  /**
   * Build a completion payload for MCP responses
   */
  private buildCompletion(values: string[]) {
    return {
      completion: {
        values,
        total: values.length,
      },
    };
  }
}
