/**
 * Gemini API Client
 *
 * This module provides a client for interacting with Google's Gemini API.
 * It handles authentication, request formatting, and response parsing.
 *
 * Prerequisites:
 * - Install @google/genai package: npm install @google/genai
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
// Install with: npm install @google/genai
// @ts-ignore - Type definitions may not be available until package is installed
import { GoogleGenAI } from "@google/genai";

/**
 * Helper function to safely access environment variables
 * Works in both Node.js and Next.js environments
 */
function getEnvVar(key: string): string | undefined {
  if (typeof window === "undefined") {
    // Server-side: access process.env directly
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
   * Model name to use (default: 'gemini-1.5-flash')
   * Available models: 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', etc.
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
  private genAI: GoogleGenAI;
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
    // According to official docs: const ai = new GoogleGenAI({});
    // The client gets the API key from the environment variable GEMINI_API_KEY
    // If apiKey is provided in config, we can pass it, otherwise it uses env var
    this.genAI = new GoogleGenAI(apiKey ? { apiKey } : {});

    // Set default configuration
    this.config = {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxOutputTokens ?? 1000,
      topP: config.topP ?? 0.95,
      topK: config.topK ?? 40,
    };

    // Set model name (default: gemini-2.5-flash according to official docs)
    // Available models: gemini-2.5-flash, gemini-1.5-flash, gemini-1.5-pro, etc.
    this.modelName = config.model ?? "gemini-2.5-flash";
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
      // Generate content using the new API
      // According to official docs: ai.models.generateContent({ model, contents })
      const response = await this.genAI.models.generateContent({
        model: options?.model ?? this.modelName,
        contents: prompt,
      });

      // Handle response.text which might be undefined or in different structure
      let text: string;
      if (typeof response.text === "string") {
        text = response.text;
      } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
      } else if (typeof response === "string") {
        text = response;
      } else {
        console.warn("Unexpected response structure:", Object.keys(response));
        text = JSON.stringify(response);
      }

      if (!text || text.trim().length === 0) {
        throw new Error("No text content in response");
      }

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
      // The new API structure might be different for chat
      // For now, combine all messages into a single prompt
      const conversationText = messages
        .map((msg) => {
          const role = msg.role === "model" ? "Assistant" : "User";
          return `${role}: ${msg.content}`;
        })
        .join("\n\n");

      // Use generateContent for now (chat API might need different structure)
      const response = await this.genAI.models.generateContent({
        model: options?.model ?? this.modelName,
        contents: conversationText,
      });

      // Handle response.text which might be undefined or in different structure
      let text: string;
      if (typeof response.text === "string") {
        text = response.text;
      } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
      } else if (typeof response === "string") {
        text = response;
      } else {
        console.warn("Unexpected response structure:", Object.keys(response));
        text = JSON.stringify(response);
      }

      if (!text || text.trim().length === 0) {
        throw new Error("No text content in response");
      }

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
      // Generate content with system instruction using the new API
      // According to official docs: ai.models.generateContent({ model: "...", contents: "..." })
      const modelToUse = options?.model ?? this.modelName;
      console.log(`[GeminiClient] Calling API with model: ${modelToUse}`);

      // Combine system instruction with user prompt if systemInstruction is provided
      // The API might not support systemInstruction parameter directly
      const contents = systemInstruction
        ? `${systemInstruction}\n\n${userPrompt}`
        : userPrompt;

      // Call the API according to official documentation
      const response = await this.genAI.models.generateContent({
        model: modelToUse,
        contents: contents,
      });

      // According to official docs, response has .text property
      // Handle response.text which might be undefined or in different structure
      let text: string;
      if (typeof response.text === "string") {
        text = response.text;
      } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
      } else if (typeof response === "string") {
        text = response;
      } else {
        console.warn("Unexpected response structure:", Object.keys(response));
        text = JSON.stringify(response);
      }

      if (!text || text.trim().length === 0) {
        throw new Error("No text content in response");
      }

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
      console.error("Model used:", options?.model ?? this.modelName);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to generate text with system instruction: ${errorMessage}`
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
      // The new API might have different streaming structure
      // For now, use generateContent and simulate streaming
      // TODO: Implement proper streaming when API structure is confirmed
      const response = await this.genAI.models.generateContent({
        model: options?.model ?? this.modelName,
        contents: prompt,
      });

      // Handle response.text which might be undefined or in different structure
      let text: string;
      if (typeof response.text === "string") {
        text = response.text;
      } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
      } else {
        throw new Error("No text content in response for streaming");
      }

      if (!text || text.trim().length === 0) {
        throw new Error("No text content in response");
      }

      // Simulate streaming by sending the text in chunks
      // In production, use proper streaming API if available
      const chunkSize = 50;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        onChunk(chunk);
        // Small delay to simulate streaming
        await new Promise((resolve) => setTimeout(resolve, 10));
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
