/**
 * Gemini API Client
 *
 * This module provides a client for interacting with Google's Gemini API.
 * It handles authentication, request formatting, and response parsing.
 *
 * Prerequisites:
 * - Install @google/generative-ai package: npm install @google/generative-ai
 * - Set GEMINI_API_KEY environment variable with your API key
 *
 * Usage example:
 * ```typescript
 * import { GeminiClient } from '@/lib/gemini-client';
 *
 * const client = new GeminiClient();
 * const response = await client.generateText('What is the best strategy for RTA draft?');
 * console.log(response);
 * ```
 */

// Import the Google Generative AI library
// Install with: npm install @google/generative-ai
// @ts-ignore - Type definitions may not be available until package is installed
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Helper function to safely access environment variables
 * Works in both Node.js and Next.js environments
 */
function getEnvVar(key: string): string | undefined {
  if (typeof window === "undefined") {
    // Server-side: access process.env directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processEnv = (globalThis as any).process?.env;
    return processEnv?.[key];
  }
  return undefined;
}

/**
 * Configuration interface for Gemini API requests
 */
export interface GeminiConfig {
  /**
   * API key for Google Gemini
   * If not provided, will use GEMINI_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Model name to use (default: 'gemini-pro')
   * Available models: 'gemini-pro', 'gemini-pro-vision', etc.
   */
  model?: string;

  /**
   * Temperature for text generation (0.0 to 1.0)
   * Higher values make output more random, lower values more deterministic
   * Default: 0.7
   */
  temperature?: number;

  /**
   * Maximum number of tokens to generate
   * Default: 1000
   */
  maxOutputTokens?: number;

  /**
   * Top-p sampling parameter (0.0 to 1.0)
   * Controls diversity via nucleus sampling
   * Default: 0.95
   */
  topP?: number;

  /**
   * Top-k sampling parameter
   * Limits the number of highest probability tokens to consider
   * Default: 40
   */
  topK?: number;
}

/**
 * Response structure from Gemini API
 */
export interface GeminiResponse {
  /**
   * Generated text content
   */
  text: string;

  /**
   * Full response object from the API
   */
  rawResponse?: any;

  /**
   * Usage statistics (if available)
   */
  usage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Chat message structure for conversation history
 */
export interface ChatMessage {
  /**
   * Role of the message sender
   */
  role: "user" | "model" | "system";

  /**
   * Message content
   */
  content: string;
}

/**
 * Client class for interacting with Google Gemini API
 */
export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private config: Required<Omit<GeminiConfig, "apiKey" | "model">>;
  private modelName: string;

  /**
   * Initialize the Gemini client
   *
   * @param config Configuration options for the client
   * @throws Error if API key is not provided
   */
  constructor(config: GeminiConfig = {}) {
    // Get API key from config or environment variable
    // In Next.js, environment variables are available via process.env
    // Note: This code runs server-side, so process.env is available
    const apiKey = config.apiKey || getEnvVar("GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is required. " +
          "Set it in your environment variables or pass it in the config."
      );
    }

    // Initialize the Google Generative AI client
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Set default configuration
    this.config = {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxOutputTokens ?? 1000,
      topP: config.topP ?? 0.95,
      topK: config.topK ?? 40,
    };

    // Set model name (default: gemini-pro)
    this.modelName = config.model ?? "gemini-pro";
  }

  /**
   * Generate text from a single prompt
   *
   * @param prompt The text prompt to send to the model
   * @param options Optional configuration override for this request
   * @returns Promise resolving to the generated text response
   *
   * @example
   * const client = new GeminiClient();
   * const response = await client.generateText('Explain RTA draft strategy');
   * console.log(response.text);
   */
  async generateText(
    prompt: string,
    options?: Partial<GeminiConfig>
  ): Promise<GeminiResponse> {
    try {
      // Get the model instance
      const model = this.genAI.getGenerativeModel({
        model: options?.model ?? this.modelName,
        generationConfig: {
          temperature: options?.temperature ?? this.config.temperature,
          maxOutputTokens:
            options?.maxOutputTokens ?? this.config.maxOutputTokens,
          topP: options?.topP ?? this.config.topP,
          topK: options?.topK ?? this.config.topK,
        },
      });

      // Generate content
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract usage information if available
      const usage = response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            candidatesTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          }
        : undefined;

      return {
        text,
        rawResponse: response,
        usage,
      };
    } catch (error) {
      console.error("Error generating text with Gemini:", error);
      throw new Error(
        `Failed to generate text: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate text from a conversation history
   *
   * @param messages Array of chat messages (conversation history)
   * @param options Optional configuration override for this request
   * @returns Promise resolving to the generated text response
   *
   * @example
   * const client = new GeminiClient();
   * const messages = [
   *   { role: 'user', content: 'What is RTA?' },
   *   { role: 'model', content: 'RTA is Real Time Arena...' },
   *   { role: 'user', content: 'What are the draft rules?' }
   * ];
   * const response = await client.generateFromChat(messages);
   */
  async generateFromChat(
    messages: ChatMessage[],
    options?: Partial<GeminiConfig>
  ): Promise<GeminiResponse> {
    try {
      // Get the model instance
      const model = this.genAI.getGenerativeModel({
        model: options?.model ?? this.modelName,
        generationConfig: {
          temperature: options?.temperature ?? this.config.temperature,
          maxOutputTokens:
            options?.maxOutputTokens ?? this.config.maxOutputTokens,
          topP: options?.topP ?? this.config.topP,
          topK: options?.topK ?? this.config.topK,
        },
      });

      // Start a chat session
      const chat = model.startChat({
        history: messages
          .filter((msg) => msg.role !== "user") // Filter out user messages from history
          .map((msg) => ({
            role: msg.role === "model" ? "model" : "user",
            parts: [{ text: msg.content }],
          })),
      });

      // Get the last user message
      const lastUserMessage = messages
        .filter((msg) => msg.role === "user")
        .pop();
      if (!lastUserMessage) {
        throw new Error("No user message found in the conversation history");
      }

      // Send the message and get response
      const result = await chat.sendMessage(lastUserMessage.content);
      const response = await result.response;
      const text = response.text();

      // Extract usage information if available
      const usage = response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            candidatesTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          }
        : undefined;

      return {
        text,
        rawResponse: response,
        usage,
      };
    } catch (error) {
      console.error("Error generating text from chat with Gemini:", error);
      throw new Error(
        `Failed to generate text from chat: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate text with system instructions and user prompt
   *
   * @param systemInstruction System-level instructions for the model
   * @param userPrompt User's prompt/question
   * @param options Optional configuration override for this request
   * @returns Promise resolving to the generated text response
   *
   * @example
   * const client = new GeminiClient();
   * const systemInstruction = 'You are an expert in Summoners War RTA strategy.';
   * const userPrompt = 'What is the best draft strategy?';
   * const response = await client.generateWithSystem(systemInstruction, userPrompt);
   */
  async generateWithSystem(
    systemInstruction: string,
    userPrompt: string,
    options?: Partial<GeminiConfig>
  ): Promise<GeminiResponse> {
    try {
      // Get the model instance with system instruction
      const model = this.genAI.getGenerativeModel({
        model: options?.model ?? this.modelName,
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: options?.temperature ?? this.config.temperature,
          maxOutputTokens:
            options?.maxOutputTokens ?? this.config.maxOutputTokens,
          topP: options?.topP ?? this.config.topP,
          topK: options?.topK ?? this.config.topK,
        },
      });

      // Generate content
      const result = await model.generateContent(userPrompt);
      const response = await result.response;
      const text = response.text();

      // Extract usage information if available
      const usage = response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            candidatesTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          }
        : undefined;

      return {
        text,
        rawResponse: response,
        usage,
      };
    } catch (error) {
      console.error("Error generating text with system instruction:", error);
      throw new Error(
        `Failed to generate text with system instruction: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Stream text generation (for real-time responses)
   *
   * @param prompt The text prompt to send to the model
   * @param onChunk Callback function called for each chunk of generated text
   * @param options Optional configuration override for this request
   * @returns Promise resolving when streaming is complete
   *
   * @example
   * const client = new GeminiClient();
   * await client.streamText('Explain RTA draft', (chunk) => {
   *   process.stdout.write(chunk);
   * });
   */
  async streamText(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: Partial<GeminiConfig>
  ): Promise<void> {
    try {
      // Get the model instance
      const model = this.genAI.getGenerativeModel({
        model: options?.model ?? this.modelName,
        generationConfig: {
          temperature: options?.temperature ?? this.config.temperature,
          maxOutputTokens:
            options?.maxOutputTokens ?? this.config.maxOutputTokens,
          topP: options?.topP ?? this.config.topP,
          topK: options?.topK ?? this.config.topK,
        },
      });

      // Generate content with streaming
      const result = await model.generateContentStream(prompt);

      // Process each chunk
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        onChunk(chunkText);
      }
    } catch (error) {
      console.error("Error streaming text with Gemini:", error);
      throw new Error(
        `Failed to stream text: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

/**
 * Convenience function to create a Gemini client instance
 *
 * @param config Optional configuration for the client
 * @returns New GeminiClient instance
 *
 * @example
 * const client = createGeminiClient({ temperature: 0.5 });
 * const response = await client.generateText('Hello');
 */
export function createGeminiClient(config?: GeminiConfig): GeminiClient {
  return new GeminiClient(config);
}

/**
 * Default export for convenience
 */
export default GeminiClient;
