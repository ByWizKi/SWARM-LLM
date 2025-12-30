# Gemini API Client Documentation

This module provides a TypeScript client for interacting with Google's Gemini API. It is designed for use in the SWARM-LLM application to generate AI-powered draft recommendations.

## Installation

First, install the required package:

```bash
npm install @google/generative-ai
```

## Setup

1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
```

## Basic Usage

### Simple Text Generation

```typescript
import { GeminiClient } from "@/lib/gemini-client";

const client = new GeminiClient();
const response = await client.generateText("What is RTA draft strategy?");
console.log(response.text);
```

### With Custom Configuration

```typescript
const client = new GeminiClient({
  temperature: 0.7, // Creativity level (0.0-1.0)
  maxOutputTokens: 1500, // Maximum response length
  topP: 0.95, // Nucleus sampling
  topK: 40, // Top-k sampling
  model: "gemini-pro", // Model to use
});

const response = await client.generateText("Your prompt here");
```

### With System Instructions

```typescript
const client = new GeminiClient();

const response = await client.generateWithSystem(
  "You are an expert in Summoners War RTA strategy.",
  "What is the best draft strategy?"
);
```

### Conversation with History

```typescript
const client = new GeminiClient();

const messages = [
  { role: "user", content: "What is RTA?" },
  { role: "model", content: "RTA is Real Time Arena..." },
  { role: "user", content: "What are the draft rules?" },
];

const response = await client.generateFromChat(messages);
```

### Streaming Responses

```typescript
const client = new GeminiClient();

await client.streamText("Explain RTA draft strategy", (chunk) => {
  // Handle each chunk as it arrives
  process.stdout.write(chunk);
});
```

## Integration with Draft Recommendations

Here's how to integrate the Gemini client into the draft recommendation API:

```typescript
import { GeminiClient } from "@/lib/gemini-client";
import { AIAssistantInstructions } from "@/lib/rta-rules";

export async function getLLMRecommendation(prompt: string): Promise<string> {
  const client = new GeminiClient({
    temperature: 0.7,
    maxOutputTokens: 1500,
  });

  const response = await client.generateWithSystem(
    AIAssistantInstructions,
    prompt
  );

  return response.text;
}
```

## API Reference

### GeminiClient Class

#### Constructor

```typescript
new GeminiClient(config?: GeminiConfig)
```

**Parameters:**

- `config.apiKey` (optional): Your Gemini API key. If not provided, uses `GEMINI_API_KEY` from environment.
- `config.model` (optional): Model name. Default: `'gemini-pro'`
- `config.temperature` (optional): Temperature (0.0-1.0). Default: `0.7`
- `config.maxOutputTokens` (optional): Max tokens to generate. Default: `1000`
- `config.topP` (optional): Top-p sampling. Default: `0.95`
- `config.topK` (optional): Top-k sampling. Default: `40`

#### Methods

##### `generateText(prompt: string, options?: Partial<GeminiConfig>): Promise<GeminiResponse>`

Generate text from a single prompt.

**Returns:**

- `text`: Generated text content
- `rawResponse`: Full API response
- `usage`: Token usage statistics

##### `generateWithSystem(systemInstruction: string, userPrompt: string, options?: Partial<GeminiConfig>): Promise<GeminiResponse>`

Generate text with system-level instructions and a user prompt.

##### `generateFromChat(messages: ChatMessage[], options?: Partial<GeminiConfig>): Promise<GeminiResponse>`

Generate text from a conversation history.

**Message format:**

```typescript
{
  role: 'user' | 'model' | 'system',
  content: string
}
```

##### `streamText(prompt: string, onChunk: (chunk: string) => void, options?: Partial<GeminiConfig>): Promise<void>`

Stream text generation, calling `onChunk` for each piece of generated text.

## Configuration Options

### Temperature

Controls randomness in output:

- `0.0`: Very deterministic, focused responses
- `0.7`: Balanced (recommended for most use cases)
- `1.0`: Very creative, varied responses

### Max Output Tokens

Maximum length of the generated response. Adjust based on your needs:

- Short responses: 500 tokens
- Medium responses: 1000 tokens (default)
- Long responses: 2000+ tokens

### Top-P and Top-K

Sampling parameters that control diversity:

- Higher values: More diverse outputs
- Lower values: More focused outputs

## Error Handling

Always wrap API calls in try-catch blocks:

```typescript
try {
  const client = new GeminiClient();
  const response = await client.generateText("Your prompt");
  return response.text;
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("API key")) {
      console.error("Invalid or missing API key");
    } else if (error.message.includes("quota")) {
      console.error("API quota exceeded");
    }
  }
  // Handle error appropriately
  return "Unable to generate response";
}
```

## Examples

See `gemini-example.ts` for complete usage examples including:

- Basic text generation
- Draft recommendations
- Chat conversations
- Streaming responses
- Custom configurations
- Error handling

## Troubleshooting

### "GEMINI_API_KEY is required" Error

Make sure you have:

1. Installed `@google/generative-ai` package
2. Set `GEMINI_API_KEY` in your `.env` file
3. Restarted your development server after adding the env variable

### TypeScript Errors

If you see TypeScript errors about missing types:

1. Make sure `@google/generative-ai` is installed
2. The `@ts-ignore` comment is intentional until the package is installed
3. After installation, types should be available automatically

### Rate Limiting

If you encounter rate limit errors:

- Implement retry logic with exponential backoff
- Consider caching responses for similar prompts
- Monitor your API usage in Google AI Studio

## Additional Resources

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [@google/generative-ai npm package](https://www.npmjs.com/package/@google/generative-ai)
