/**
 * Gemini API Client Usage Examples
 *
 * This file contains practical examples of how to use the GeminiClient
 * for various use cases in the SWARM-LLM application.
 *
 * To use these examples:
 * 1. Install the required package: npm install @google/generative-ai
 * 2. Set GEMINI_API_KEY in your .env file
 * 3. Import and use the functions as needed
 */

import { GeminiClient, createGeminiClient, ChatMessage } from './gemini-client';
import { AIAssistantInstructions } from './rta-rules';

/**
 * Example 1: Basic text generation
 * Simple prompt-response interaction
 */
export async function exampleBasicGeneration() {
  // Create a client instance
  const client = createGeminiClient();

  // Generate text from a prompt
  const response = await client.generateText(
    'What is the best strategy for RTA draft in Summoners War?'
  );

  console.log('Generated text:', response.text);
  console.log('Tokens used:', response.usage?.totalTokens);

  return response.text;
}

/**
 * Example 2: Draft recommendation with system instructions
 * Uses system instructions to set the AI's role and behavior
 */
export async function exampleDraftRecommendation(
  playerAPicks: number[],
  playerBPicks: number[],
  currentPhase: 'picking' | 'banning' | 'completed'
) {
  const client = createGeminiClient({
    temperature: 0.7, // Balanced creativity
    maxOutputTokens: 1500, // Longer responses for detailed analysis
  });

  // Build the draft context
  const draftContext = `
Current RTA draft state:
- Phase: ${currentPhase}
- Player A picks: ${playerAPicks.length}/5 - [${playerAPicks.join(', ')}]
- Player B picks: ${playerBPicks.length}/5 - [${playerBPicks.join(', ')}]
- Already selected monsters: [${[...playerAPicks, ...playerBPicks].join(', ')}]
  `.trim();

  // User prompt for recommendations
  const userPrompt = `
${draftContext}

Analyze the current situation and provide strategic recommendations:
- If in picking phase: which monsters do you recommend for the next pick? Why?
- If in banning phase: which monster do you recommend to ban? Why?
- Analyze synergies, counter-picks, and win conditions
- Provide concrete and actionable advice

Respond in French, concisely but in detail.
  `.trim();

  // Generate with system instructions
  const response = await client.generateWithSystem(
    AIAssistantInstructions, // System instructions from rta-rules
    userPrompt
  );

  return response.text;
}

/**
 * Example 3: Conversation with chat history
 * Maintains context across multiple interactions
 */
export async function exampleChatConversation() {
  const client = createGeminiClient();

  // Build conversation history
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: 'What is RTA in Summoners War?'
    },
    {
      role: 'model',
      content: 'RTA stands for Real Time Arena, a competitive PvP mode in Summoners War where players draft teams and battle in real-time.'
    },
    {
      role: 'user',
      content: 'What are the draft rules?'
    }
  ];

  // Generate response with conversation context
  const response = await client.generateFromChat(messages);

  console.log('AI Response:', response.text);

  return response.text;
}

/**
 * Example 4: Streaming response for real-time updates
 * Useful for displaying responses as they are generated
 */
export async function exampleStreamingResponse(prompt: string) {
  const client = createGeminiClient();

  // Array to collect chunks
  const chunks: string[] = [];

  // Stream the response
  await client.streamText(prompt, (chunk) => {
    chunks.push(chunk);
    // In a real application, you might update the UI here
    process.stdout.write(chunk);
  });

  // Combine all chunks into full text
  const fullText = chunks.join('');

  return fullText;
}

/**
 * Example 5: Custom configuration for specific use cases
 * Adjusts parameters for different response styles
 */
export async function exampleCustomConfig(prompt: string) {
  // Creative mode: higher temperature for more varied responses
  const creativeClient = createGeminiClient({
    temperature: 0.9,
    topP: 0.95,
    topK: 50,
    maxOutputTokens: 2000,
  });

  // Precise mode: lower temperature for more deterministic responses
  const preciseClient = createGeminiClient({
    temperature: 0.2,
    topP: 0.8,
    topK: 20,
    maxOutputTokens: 500,
  });

  // Generate with both configurations
  const creativeResponse = await creativeClient.generateText(prompt);
  const preciseResponse = await preciseClient.generateText(prompt);

  return {
    creative: creativeResponse.text,
    precise: preciseResponse.text,
  };
}

/**
 * Example 6: Error handling
 * Demonstrates proper error handling patterns
 */
export async function exampleWithErrorHandling(prompt: string) {
  try {
    const client = createGeminiClient();
    const response = await client.generateText(prompt);
    return response.text;
  } catch (error) {
    // Handle different types of errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.error('Authentication error: Check your GEMINI_API_KEY');
      } else if (error.message.includes('quota')) {
        console.error('Quota exceeded: Check your API usage limits');
      } else {
        console.error('Generation error:', error.message);
      }
    } else {
      console.error('Unknown error:', error);
    }

    // Return a fallback response
    return 'Unable to generate response at this time. Please try again later.';
  }
}

/**
 * Example 7: Integration with draft recommendation API
 * Shows how to integrate Gemini into the existing API route
 */
export async function integrateWithDraftAPI(
  playerAPicks: number[],
  playerBPicks: number[],
  playerABans: number[],
  playerBBans: number[],
  currentPhase: 'picking' | 'banning' | 'completed',
  currentTurn: number,
  firstPlayer: 'A' | 'B'
) {
  const client = createGeminiClient({
    temperature: 0.7,
    maxOutputTokens: 1500,
  });

  // Build the full draft context
  const draftContext = `
Current RTA draft state:
- Phase: ${currentPhase}
- Turn: ${currentTurn + 1}
- First player: ${firstPlayer}
- Player A picks: ${playerAPicks.length}/5 - [${playerAPicks.join(', ')}]
- Player B picks: ${playerBPicks.length}/5 - [${playerBPicks.join(', ')}]
- Already selected monsters: [${[...playerAPicks, ...playerBPicks].join(', ')}]

${currentPhase === 'banning' ? `
- Banning phase in progress
- Player A bans: ${playerABans.length > 0 ? `[${playerABans.join(', ')}]` : 'Not yet banned'}
- Player B bans: ${playerBBans.length > 0 ? `[${playerBBans.join(', ')}]` : 'Not yet banned'}
` : ''}
${currentPhase === 'completed' ? `
- Draft completed, final team analysis
- Player A bans: [${playerABans.join(', ')}]
- Player B bans: [${playerBBans.join(', ')}]
- Final monsters Player A: [${playerAPicks.filter(id => !playerBBans.includes(id)).join(', ')}]
- Final monsters Player B: [${playerBPicks.filter(id => !playerABans.includes(id)).join(', ')}]
` : ''}
  `.trim();

  // Build the full prompt
  const prompt = `${AIAssistantInstructions}

${draftContext}

Analyze the current situation and provide strategic recommendations:
- If in picking phase: which monsters do you recommend for the next pick? Why?
- If in banning phase: which monster do you recommend to ban? Why?
- Analyze synergies, counter-picks, and win conditions
- Provide concrete and actionable advice

Respond in French, concisely but in detail.`;

  // Generate recommendation
  const response = await client.generateText(prompt);

  return response.text;
}

