/**
 * MCP Tool Handlers
 *
 * Implements the logic for all MCP tools.
 */

import { SessionManager } from "../session/session-manager.js";
import { AuthManager } from "../auth/auth-manager.js";
import { ConversationLibrary } from "../library/conversation-library.js";
import type { AddConversationInput, UpdateConversationInput } from "../library/types.js";
import { CONFIG, applyBrowserOptions, type BrowserOptions } from "../config.js";
import { log } from "../utils/logger.js";
import type {
  AskQuestionResult,
  ToolResult,
  ProgressCallback,
} from "../types.js";
import { RateLimitError } from "../errors.js";
import { CleanupManager } from "../utils/cleanup-manager.js";
import { randomDelay } from "../utils/stealth-utils.js";

const FOLLOW_UP_REMINDER =
  "\n\nEXTREMELY IMPORTANT: Is that ALL you need to know? You can always ask another question using the same session ID! Think about it carefully: before you reply to the user, review their original request and this answer. If anything is still unclear or missing, ask me another question first.";

/**
 * MCP Tool Handlers
 */
export class ToolHandlers {
  private sessionManager: SessionManager;
  private authManager: AuthManager;
  private library: ConversationLibrary;

  constructor(sessionManager: SessionManager, authManager: AuthManager, library: ConversationLibrary) {
    this.sessionManager = sessionManager;
    this.authManager = authManager;
    this.library = library;
  }

  /**
   * Handle ask_question tool
   */
  async handleAskQuestion(
    args: {
      question: string;
      session_id?: string;
      conversation_id?: string;
      gemini_url?: string;
      show_browser?: boolean;
      browser_options?: BrowserOptions;
    },
    sendProgress?: ProgressCallback
  ): Promise<ToolResult<AskQuestionResult>> {
    const { question, session_id, conversation_id, gemini_url, show_browser, browser_options } = args;

    log.info(`🔧 [TOOL] ask_question called`);
    log.info(`  Question: "${question.substring(0, 100)}"...`);
    if (session_id) {
      log.info(`  Session ID: ${session_id}`);
    }
    if (conversation_id) {
      log.info(`  Conversation ID: ${conversation_id}`);
    }
    if (gemini_url) {
      log.info(`  Conversation URL: ${gemini_url}`);
    }

    try {
      // Resolve conversation URL
      let resolvedConversationUrl = gemini_url;

      if (!resolvedConversationUrl && conversation_id) {
        const conversation = this.library.incrementUseCount(conversation_id);
        if (!conversation) {
          throw new Error(`Conversation not found in library: ${conversation_id}`);
        }

        resolvedConversationUrl = conversation.url;
        log.info(`  Resolved conversation: ${conversation.name}`);
      } else if (!resolvedConversationUrl) {
        const active = this.library.getActiveConversation();
        if (active) {
          const conversation = this.library.incrementUseCount(active.id);
          if (!conversation) {
            throw new Error(`Active conversation not found: ${active.id}`);
          }
          resolvedConversationUrl = conversation.url;
          log.info(`  Using active conversation: ${conversation.name}`);
        }
      }

      // Progress: Getting or creating session
      await sendProgress?.("Getting or creating browser session...", 1, 5);

      // Apply browser options temporarily
      const originalConfig = { ...CONFIG };
      const effectiveConfig = applyBrowserOptions(browser_options, show_browser);
      Object.assign(CONFIG, effectiveConfig);

      // Calculate overrideHeadless parameter for session manager
      // show_browser takes precedence over browser_options.headless
      let overrideHeadless: boolean | undefined = undefined;
      if (show_browser !== undefined) {
        overrideHeadless = show_browser;
      } else if (browser_options?.show !== undefined) {
        overrideHeadless = browser_options.show;
      } else if (browser_options?.headless !== undefined) {
        overrideHeadless = !browser_options.headless;
      }

      try {
        // Get or create session (with headless override to handle mode changes)
        const session = await this.sessionManager.getOrCreateSession(
          session_id,
          resolvedConversationUrl,
          overrideHeadless
        );

      // Progress: Asking question
      await sendProgress?.("Asking question to Gemini App...", 2, 5);

      // Ask the question (pass progress callback)
      const rawAnswer = await session.ask(question, sendProgress);
      const answer = `${rawAnswer.trimEnd()}${FOLLOW_UP_REMINDER}`;

      // Get session info
      const sessionInfo = session.getInfo();

      const result: AskQuestionResult = {
        status: "success",
        question,
        answer,
        session_id: session.sessionId,
        gemini_url: session.geminiUrl,
        session_info: {
          age_seconds: sessionInfo.age_seconds,
          message_count: sessionInfo.message_count,
          last_activity: sessionInfo.last_activity,
        },
      };

        // Progress: Complete
        await sendProgress?.("Question answered successfully!", 5, 5);

        log.success(`✅ [TOOL] ask_question completed successfully`);
        return {
          success: true,
          data: result,
        };
      } finally {
        // Restore original CONFIG
        Object.assign(CONFIG, originalConfig);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Special handling for rate limit errors
      if (error instanceof RateLimitError || errorMessage.toLowerCase().includes("rate limit")) {
        log.error(`🚫 [TOOL] Rate limit detected`);
        return {
          success: false,
          error:
            "Gemini App rate limit reached (50 queries/day for free accounts).\n\n" +
            "You can:\n" +
            "1. Use the 're_auth' tool to login with a different Google account\n" +
            "2. Wait until tomorrow for the quota to reset\n" +
            "3. Upgrade to Google AI Pro/Ultra for 5x higher limits\n\n" +
            `Original error: ${errorMessage}`,
        };
      }

      log.error(`❌ [TOOL] ask_question failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle list_sessions tool
   */
  async handleListSessions(): Promise<
    ToolResult<{
      active_sessions: number;
      max_sessions: number;
      session_timeout: number;
      oldest_session_seconds: number;
      total_messages: number;
      sessions: Array<{
        id: string;
        created_at: number;
        last_activity: number;
        age_seconds: number;
        inactive_seconds: number;
        message_count: number;
        gemini_url: string;
      }>;
    }> 
  > {
    log.info(`🔧 [TOOL] list_sessions called`);

    try {
      const stats = this.sessionManager.getStats();
      const sessions = this.sessionManager.getAllSessionsInfo();

      const result = {
        active_sessions: stats.active_sessions,
        max_sessions: stats.max_sessions,
        session_timeout: stats.session_timeout,
        oldest_session_seconds: stats.oldest_session_seconds,
        total_messages: stats.total_messages,
        sessions: sessions.map((info) => ({
          id: info.id,
          created_at: info.created_at,
          last_activity: info.last_activity,
          age_seconds: info.age_seconds,
          inactive_seconds: info.inactive_seconds,
          message_count: info.message_count,
          gemini_url: info.gemini_url,
        })),
      };

      log.success(
        `✅ [TOOL] list_sessions completed (${result.active_sessions} sessions)`
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] list_sessions failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle close_session tool
   */
  async handleCloseSession(args: { session_id: string }): Promise<
    ToolResult<{ status: string; message: string; session_id: string }>
  > {
    const { session_id } = args;

    log.info(`🔧 [TOOL] close_session called`);
    log.info(`  Session ID: ${session_id}`);

    try {
      const closed = await this.sessionManager.closeSession(session_id);

      if (closed) {
        log.success(`✅ [TOOL] close_session completed`);
        return {
          success: true,
          data: {
            status: "success",
            message: `Session ${session_id} closed successfully`,
            session_id,
          },
        };
      } else {
        log.warning(`⚠️  [TOOL] Session ${session_id} not found`);
        return {
          success: false,
          error: `Session ${session_id} not found`,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] close_session failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle reset_session tool
   */
  async handleResetSession(args: { session_id: string }): Promise<
    ToolResult<{ status: string; message: string; session_id: string }>
  > {
    const { session_id } = args;

    log.info(`🔧 [TOOL] reset_session called`);
    log.info(`  Session ID: ${session_id}`);

    try {
      const session = this.sessionManager.getSession(session_id);

      if (!session) {
        log.warning(`⚠️  [TOOL] Session ${session_id} not found`);
        return {
          success: false,
          error: `Session ${session_id} not found`,
        };
      }

      await session.reset();

      log.success(`✅ [TOOL] reset_session completed`);
      return {
        success: true,
        data: {
          status: "success",
          message: `Session ${session_id} reset successfully`,
          session_id,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] reset_session failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle get_health tool
   */
  async handleGetHealth(): Promise<
    ToolResult<{
      status: string;
      authenticated: boolean;
      gemini_url: string;
      active_sessions: number;
      max_sessions: number;
      session_timeout: number;
      total_messages: number;
      headless: boolean;
      auto_login_enabled: boolean;
      stealth_enabled: boolean;
      troubleshooting_tip?: string;
    }> 
  > {
    log.info(`🔧 [TOOL] get_health called`);

    try {
      // Check authentication status
      const statePath = await this.authManager.getValidStatePath();
      const authenticated = statePath !== null;

      // Get session stats
      const stats = this.sessionManager.getStats();

      const result = {
        status: "ok",
        authenticated,
        gemini_url: CONFIG.geminiUrl || "not configured",
        active_sessions: stats.active_sessions,
        max_sessions: stats.max_sessions,
        session_timeout: stats.session_timeout,
        total_messages: stats.total_messages,
        headless: CONFIG.headless,
        auto_login_enabled: CONFIG.autoLoginEnabled,
        stealth_enabled: CONFIG.stealthEnabled,
        // Add troubleshooting tip if not authenticated
        ...((!authenticated) && {
          troubleshooting_tip:
            "For fresh start with clean browser session: Close all Chrome instances → " +
            "cleanup_data(confirm=true, preserve_library=true) → setup_auth"
        }),
      };

      log.success(`✅ [TOOL] get_health completed`);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] get_health failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle setup_auth tool
   *
   * Opens a browser window for manual login with live progress updates.
   * The operation waits synchronously for login completion (up to 10 minutes).
   */
  async handleSetupAuth(
    args: {
      show_browser?: boolean;
      browser_options?: BrowserOptions;
    },
    sendProgress?: ProgressCallback
  ): Promise<
    ToolResult<{
      status: string;
      message: string;
      authenticated: boolean;
      duration_seconds?: number;
    }> 
  > {
    const { show_browser, browser_options } = args;

    // CRITICAL: Send immediate progress to reset timeout from the very start
    await sendProgress?.("Initializing authentication setup...", 0, 10);

    log.info(`🔧 [TOOL] setup_auth called`);
    if (show_browser !== undefined) {
      log.info(`  Show browser: ${show_browser}`);
    }

    const startTime = Date.now();

    // Apply browser options temporarily
    const originalConfig = { ...CONFIG };
    const effectiveConfig = applyBrowserOptions(browser_options, show_browser);
    Object.assign(CONFIG, effectiveConfig);

    try {
      // Progress: Starting
      await sendProgress?.("Preparing authentication browser...", 1, 10);

      log.info(`  🌐 Opening browser for interactive login...`);

      // Progress: Opening browser
      await sendProgress?.("Opening browser window...", 2, 10);

      // Perform setup with progress updates (uses CONFIG internally)
      const success = await this.authManager.performSetup(sendProgress);

      const durationSeconds = (Date.now() - startTime) / 1000;

      if (success) {
        // Progress: Complete
        await sendProgress?.("Authentication saved successfully!", 10, 10);

        log.success(`✅ [TOOL] setup_auth completed (${durationSeconds.toFixed(1)}s)`);
        return {
          success: true,
          data: {
            status: "authenticated",
            message: "Successfully authenticated and saved browser state",
            authenticated: true,
            duration_seconds: durationSeconds,
          },
        };
      } else {
        log.error(`❌ [TOOL] setup_auth failed (${durationSeconds.toFixed(1)}s)`);
        return {
          success: false,
          error: "Authentication failed or was cancelled",
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const durationSeconds = (Date.now() - startTime) / 1000;
      log.error(`❌ [TOOL] setup_auth failed: ${errorMessage} (${durationSeconds.toFixed(1)}s)`);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      // Restore original CONFIG
      Object.assign(CONFIG, originalConfig);
    }
  }

  /**
   * Handle re_auth tool
   *
   * Performs a complete re-authentication:
   * 1. Closes all active browser sessions
   * 2. Deletes all saved authentication data (cookies, Chrome profile)
   * 3. Opens browser for fresh Google login
   *
   * Use for switching Google accounts or recovering from rate limits.
   */
  async handleReAuth(
    args: {
      show_browser?: boolean;
      browser_options?: BrowserOptions;
    },
    sendProgress?: ProgressCallback
  ): Promise<
    ToolResult<{
      status: string;
      message: string;
      authenticated: boolean;
      duration_seconds?: number;
    }> 
  > {
    const { show_browser, browser_options } = args;

    await sendProgress?.("Preparing re-authentication...", 0, 12);
    log.info(`🔧 [TOOL] re_auth called`);
    if (show_browser !== undefined) {
      log.info(`  Show browser: ${show_browser}`);
    }

    const startTime = Date.now();

    // Apply browser options temporarily
    const originalConfig = { ...CONFIG };
    const effectiveConfig = applyBrowserOptions(browser_options, show_browser);
    Object.assign(CONFIG, effectiveConfig);

    try {
      // 1. Close all active sessions
      await sendProgress?.("Closing all active sessions...", 1, 12);
      log.info("  🛑 Closing all sessions...");
      await this.sessionManager.closeAllSessions();
      log.success("  ✅ All sessions closed");

      // 2. Clear all auth data
      await sendProgress?.("Clearing authentication data...", 2, 12);
      log.info("  🗑️  Clearing all auth data...");
      await this.authManager.clearAllAuthData();
      log.success("  ✅ Auth data cleared");

      // 3. Perform fresh setup
      await sendProgress?.("Starting fresh authentication...", 3, 12);
      log.info("  🌐 Starting fresh authentication setup...");
      const success = await this.authManager.performSetup(sendProgress);

      const durationSeconds = (Date.now() - startTime) / 1000;

      if (success) {
        await sendProgress?.("Re-authentication complete!", 12, 12);
        log.success(`✅ [TOOL] re_auth completed (${durationSeconds.toFixed(1)}s)`);
        return {
          success: true,
          data: {
            status: "authenticated",
            message:
              "Successfully re-authenticated with new account. All previous sessions have been closed.",
            authenticated: true,
            duration_seconds: durationSeconds,
          },
        };
      } else {
        log.error(`❌ [TOOL] re_auth failed (${durationSeconds.toFixed(1)}s)`);
        return {
          success: false,
          error: "Re-authentication failed or was cancelled",
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationSeconds = (Date.now() - startTime) / 1000;
      log.error(
        `❌ [TOOL] re_auth failed: ${errorMessage} (${durationSeconds.toFixed(1)}s)`
      );
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      // Restore original CONFIG
      Object.assign(CONFIG, originalConfig);
    }
  }

  /**
   * Handle add_conversation tool
   */
  async handleAddConversation(args: AddConversationInput): Promise<ToolResult<{ conversation: any }>> {
    log.info(`🔧 [TOOL] add_conversation called`);
    log.info(`  Name: ${args.name}`);

    try {
      const conversation = this.library.addConversation(args);
      log.success(`✅ [TOOL] add_conversation completed: ${conversation.id}`);
      return {
        success: true,
        data: { conversation },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] add_conversation failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle list_conversations tool
   */
  async handleListConversations(): Promise<ToolResult<{ conversations: any[] }>> {
    log.info(`🔧 [TOOL] list_conversations called`);

    try {
      const conversations = this.library.listConversations();
      log.success(`✅ [TOOL] list_conversations completed (${conversations.length} conversations)`);
      return {
        success: true,
        data: { conversations },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] list_conversations failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle get_conversation tool
   */
  async handleGetConversation(args: { id: string }): Promise<ToolResult<{ conversation: any }>> {
    log.info(`🔧 [TOOL] get_conversation called`);
    log.info(`  ID: ${args.id}`);

    try {
      const conversation = this.library.getConversation(args.id);
      if (!conversation) {
        log.warning(`⚠️  [TOOL] Conversation not found: ${args.id}`);
        return {
          success: false,
          error: `Conversation not found: ${args.id}`,
        };
      }

      log.success(`✅ [TOOL] get_conversation completed: ${conversation.name}`);
      return {
        success: true,
        data: { conversation },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] get_conversation failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle select_conversation tool
   */
  async handleSelectConversation(args: { id: string }): Promise<ToolResult<{ conversation: any }>> {
    log.info(`🔧 [TOOL] select_conversation called`);
    log.info(`  ID: ${args.id}`);

    try {
      const conversation = this.library.selectConversation(args.id);
      log.success(`✅ [TOOL] select_conversation completed: ${conversation.name}`);
      return {
        success: true,
        data: { conversation },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] select_conversation failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle update_conversation tool
   */
  async handleUpdateConversation(args: UpdateConversationInput): Promise<ToolResult<{ conversation: any }>> {
    log.info(`🔧 [TOOL] update_conversation called`);
    log.info(`  ID: ${args.id}`);

    try {
      const conversation = this.library.updateConversation(args);
      log.success(`✅ [TOOL] update_conversation completed: ${conversation.name}`);
      return {
        success: true,
        data: { conversation },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] update_conversation failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle remove_conversation tool
   */
  async handleRemoveConversation(args: { id: string }): Promise<ToolResult<{ removed: boolean; closed_sessions: number }>> {
    log.info(`🔧 [TOOL] remove_conversation called`);
    log.info(`  ID: ${args.id}`);

    try {
      const conversation = this.library.getConversation(args.id);
      if (!conversation) {
        log.warning(`⚠️  [TOOL] Conversation not found: ${args.id}`);
        return {
          success: false,
          error: `Conversation not found: ${args.id}`,
        };
      }

      const removed = this.library.removeConversation(args.id);
      if (removed) {
        const closedSessions = await this.sessionManager.closeSessionsForConversation(
          conversation.url
        );
        log.success(`✅ [TOOL] remove_conversation completed`);
        return {
          success: true,
          data: { removed: true, closed_sessions: closedSessions },
        };
      } else {
        log.warning(`⚠️  [TOOL] Conversation not found: ${args.id}`);
        return {
          success: false,
          error: `Conversation not found: ${args.id}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] remove_conversation failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle search_conversations tool
   */
  async handleSearchConversations(args: { query: string }): Promise<ToolResult<{ conversations: any[] }>> {
    log.info(`🔧 [TOOL] search_conversations called`);
    log.info(`  Query: "${args.query}"`);

    try {
      const conversations = this.library.searchConversations(args.query);
      log.success(`✅ [TOOL] search_conversations completed (${conversations.length} results)`);
      return {
        success: true,
        data: { conversations },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] search_conversations failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle get_library_stats tool
   */
  async handleGetLibraryStats(): Promise<ToolResult<any>> {
    log.info(`🔧 [TOOL] get_library_stats called`);

    try {
      const stats = this.library.getStats();
      log.success(`✅ [TOOL] get_library_stats completed`);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] get_library_stats failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle cleanup_data tool
   *
   * ULTRATHINK Deep Cleanup - scans entire system for ALL Gemini App MCP files
   */
  async handleCleanupData(
    args: { confirm: boolean; preserve_library?: boolean }
  ): Promise<
    ToolResult<{
      status: string;
      mode: string;
      preview?: {
        categories: Array<{ name: string; description: string; paths: string[]; totalBytes: number; optional: boolean }>;
        totalPaths: number;
        totalSizeBytes: number;
      };
      result?: {
        deletedPaths: string[];
        failedPaths: string[];
        totalSizeBytes: number;
        categorySummary: Record<string, { count: number; bytes: number }>;
      };
    }> 
  > {
    const { confirm, preserve_library = false } = args;

    log.info(`🔧 [TOOL] cleanup_data called`);
    log.info(`  Confirm: ${confirm}`);
    log.info(`  Preserve Library: ${preserve_library}`);

    const cleanupManager = new CleanupManager();

    try {
      // Always run in deep mode
      const mode = "deep";

      if (!confirm) {
        // Preview mode - show what would be deleted
        log.info(`  📋 Generating cleanup preview (mode: ${mode})...`);

        const preview = await cleanupManager.getCleanupPaths(mode, preserve_library);
        const platformInfo = cleanupManager.getPlatformInfo();

        log.info(`  Found ${preview.totalPaths.length} items (${cleanupManager.formatBytes(preview.totalSizeBytes)})`);
        log.info(`  Platform: ${platformInfo.platform}`);

        return {
          success: true,
          data: {
            status: "preview",
            mode,
            preview: {
              categories: preview.categories,
              totalPaths: preview.totalPaths.length,
              totalSizeBytes: preview.totalSizeBytes,
            },
          },
        };
      } else {
        // Cleanup mode - actually delete files
        log.info(`  🗑️  Performing cleanup (mode: ${mode})...`);

        const result = await cleanupManager.performCleanup(mode, preserve_library);

        if (result.success) {
          log.success(`✅ [TOOL] cleanup_data completed - deleted ${result.deletedPaths.length} items`);
        } else {
          log.warning(`⚠️  [TOOL] cleanup_data completed with ${result.failedPaths.length} errors`);
        }

        return {
          success: result.success,
          data: {
            status: result.success ? "completed" : "partial",
            mode,
            result: {
              deletedPaths: result.deletedPaths,
              failedPaths: result.failedPaths,
              totalSizeBytes: result.totalSizeBytes,
              categorySummary: result.categorySummary,
            },
          },
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] cleanup_data failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle select_model tool
   */
  async handleSelectModel(
    args: {
      model: string;
      session_id?: string;
    }
  ): Promise<ToolResult<{ status: string; model: string; session_id: string }>> {
    const { model, session_id } = args;

    log.info(`🔧 [TOOL] select_model called`);
    log.info(`  Model: ${model}`);
    if (session_id) {
      log.info(`  Session ID: ${session_id}`);
    }

    try {
      // Get or create session
      const session = await this.sessionManager.getOrCreateSession(
        session_id,
        undefined,
        undefined
      );

      // Get the page from the session
      const sessionPage = (session as any).page;
      if (!sessionPage) {
        throw new Error("Session page not initialized");
      }

      // Map model names to display names
      const modelMap: Record<string, string> = {
        fast: "Gemini 3",
        thinking: "Thinking",
        pro: "Pro",
      };

      const displayName = modelMap[model];
      if (!displayName) {
        throw new Error(`Invalid model: ${model}. Must be one of: fast, thinking, pro`);
      }

      log.info(`  🎯 Selecting model: ${displayName}...`);

      // Click the model selection button (the "Pro" button or model indicator)
      // We'll look for various possible selectors
      const possibleSelectors = [
        'button:has-text("Pro")',
        'button:has-text("Gemini 3")',
        'button:has-text("Thinking")',
        'button[aria-label*="model"]',
        'div[role="button"]:has-text("Pro")',
        'div[role="button"]:has-text("Gemini 3")',
      ];

      let clicked = false;
      for (const selector of possibleSelectors) {
        try {
          const element = await sessionPage.$(selector);
          if (element) {
            await element.click();
            clicked = true;
            log.success(`  ✅ Clicked model selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Try next selector
          continue;
        }
      }

      if (!clicked) {
        throw new Error("Could not find model selection button. The UI may have changed.");
      }

      // Wait for menu to appear
      await randomDelay(500, 1000);

      // Click the selected model option in the menu
      const optionSelectors = [
        `div[role="menuitem"]:has-text("${displayName}")`,
        `button:has-text("${displayName}")`,
        `div[role="option"]:has-text("${displayName}")`,
      ];

      let optionClicked = false;
      for (const selector of optionSelectors) {
        try {
          const element = await sessionPage.$(selector);
          if (element) {
            await element.click();
            optionClicked = true;
            log.success(`  ✅ Selected model: ${displayName}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!optionClicked) {
        throw new Error(`Could not select model option: ${displayName}`);
      }

      // Wait for UI to update
      await randomDelay(1000, 1500);

      log.success(`✅ [TOOL] select_model completed`);
      return {
        success: true,
        data: {
          status: "success",
          model: displayName,
          session_id: session.sessionId,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] select_model failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle use_gemini_tool tool
   */
  async handleUseGeminiTool(
    args: {
      tool: string;
      prompt: string;
      session_id?: string;
    },
    sendProgress?: ProgressCallback
  ): Promise<ToolResult<{ status: string; tool: string; result: string; session_id: string }>> {
    const { tool, prompt, session_id } = args;

    log.info(`🔧 [TOOL] use_gemini_tool called`);
    log.info(`  Tool: ${tool}`);
    log.info(`  Prompt: "${prompt.substring(0, 100)}"...`);
    if (session_id) {
      log.info(`  Session ID: ${session_id}`);
    }

    try {
      // Get or create session
      await sendProgress?.("Getting or creating browser session...", 1, 5);
      const session = await this.sessionManager.getOrCreateSession(
        session_id,
        undefined,
        undefined
      );

      // Get the page from the session
      const sessionPage = (session as any).page;
      if (!sessionPage) {
        throw new Error("Session page not initialized");
      }

      // Map tool names to display names
      const toolMap: Record<string, string> = {
        deep_research: "Deep research",
        create_video: "Create videos",
        create_image: "Create images",
      };

      const displayName = toolMap[tool];
      if (!displayName) {
        throw new Error(
          `Invalid tool: ${tool}. Must be one of: deep_research, create_video, create_image`
        );
      }

      log.info(`  🛠️  Opening Tools menu...`);
      await sendProgress?.("Opening Tools menu...", 2, 5);

      // Click the Tools button
      const toolsButtonSelectors = [
        'button:has-text("Tools")',
        'button[aria-label*="Tools"]',
        'div[role="button"]:has-text("Tools")',
      ];

      let toolsClicked = false;
      for (const selector of toolsButtonSelectors) {
        try {
          const element = await sessionPage.$(selector);
          if (element) {
            await element.click();
            toolsClicked = true;
            log.success(`  ✅ Clicked Tools button`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!toolsClicked) {
        throw new Error("Could not find Tools button. The UI may have changed.");
      }

      // Wait for menu to appear
      await randomDelay(500, 1000);

      // Click the selected tool option
      log.info(`  🎯 Selecting tool: ${displayName}...`);
      await sendProgress?.(`Selecting ${displayName}...`, 3, 5);

      const toolOptionSelectors = [
        `div[role="menuitem"]:has-text("${displayName}")`,
        `button:has-text("${displayName}")`,
        `div[role="option"]:has-text("${displayName}")`,
      ];

      let toolClicked = false;
      for (const selector of toolOptionSelectors) {
        try {
          const element = await sessionPage.$(selector);
          if (element) {
            await element.click();
            toolClicked = true;
            log.success(`  ✅ Selected tool: ${displayName}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!toolClicked) {
        throw new Error(`Could not select tool: ${displayName}`);
      }

      // Wait for tool interface to load
      await randomDelay(1000, 2000);

      // Submit the prompt using the ask method
      log.info(`  📝 Submitting prompt to ${displayName}...`);
      await sendProgress?.(`Submitting prompt to ${displayName}...`, 4, 5);

      const result = await session.ask(prompt, sendProgress);

      log.success(`✅ [TOOL] use_gemini_tool completed`);
      await sendProgress?.("Tool execution complete!", 5, 5);

      return {
        success: true,
        data: {
          status: "success",
          tool: displayName,
          result: result.trimEnd(),
          session_id: session.sessionId,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`❌ [TOOL] use_gemini_tool failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Cleanup all resources (called on server shutdown)
   */
  async cleanup(): Promise<void> {
    log.info(`🧹 Cleaning up tool handlers...`);
    await this.sessionManager.closeAllSessions();
    log.success(`✅ Tool handlers cleanup complete`);
  }
}
