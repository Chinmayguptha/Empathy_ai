'use server';
/**
 * @fileOverview An AI agent that generates empathetic responses based on detected emotion and user context.
 *
 * - generateEmpatheticResponse - A function that generates an empathetic response.
 * - EmpatheticResponseInput - The input type for the generateEmpatheticResponse function.
 * - EmpatheticResponseOutput - The return type for the generateEmpatheticResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EmpatheticResponseInputSchema = z.object({
  userInputText: z.string().describe("The original text spoken by the user."),
  emotion: z
    .string()
    .describe('The emotion detected from the user\'s speech or text (e.g., happy, sad, angry, neutral).'),
});
export type EmpatheticResponseInput = z.infer<typeof EmpatheticResponseInputSchema>;

const EmpatheticResponseOutputSchema = z.object({
  response: z.string().describe('An empathetic and contextually relevant response.'),
});
export type EmpatheticResponseOutput = z.infer<typeof EmpatheticResponseOutputSchema>;

export async function generateEmpatheticResponse(
  input: EmpatheticResponseInput
): Promise<EmpatheticResponseOutput> {
  return empatheticResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'empatheticResponsePrompt',
  input: {schema: EmpatheticResponseInputSchema},
  output: {schema: EmpatheticResponseOutputSchema},
  prompt: `You are an AI assistant designed to provide empathetic and clear responses to users, especially elderly users.
You will be given the original user's statement and a detected predominant emotion from that statement.

User's statement: {{{userInputText}}}
Detected Emotion: {{{emotion}}}

Based on both the user's statement and the detected emotion, generate a brief, supportive, and comforting message.
- Your response should directly acknowledge or subtly reflect the context of the user's statement.
- Tailor the message to the specific detected emotion, offering words of encouragement, understanding, or appropriate suggestions.
- If the user's statement is a question or implies a need for information, even if an emotion is detected, prioritize providing a clear and helpful answer first, then weave in empathy if appropriate. For example, if the user asks "What's the weather like?" and seems anxious, you might say "The weather is partly cloudy today. I understand you might be feeling a bit anxious, is there anything specific you'd like to talk about regarding that? 🌦️"
- Keep the response concise (1-3 sentences) and easy to understand.
- Always add a relevant emoji at the end of the response.
- Focus on these primary emotions when tailoring empathy: Joy, Sadness, Anger, Anxiety, Loneliness.
  - If Joy: Express shared happiness, acknowledge their positive experience.
  - If Sadness: Offer comfort and understanding, validate their feelings.
  - If Anger: Respond with calm and reassurance, perhaps gently acknowledge their frustration without escalating.
  - If Anxiety: Provide soothing and grounding words, offer reassurance.
  - If Loneliness: Express companionship, offer connection or a listening ear.
- If the emotion is "neutral" or unclear, or if the user's statement is purely factual or a direct question without strong emotional overlay, focus on providing a clear, helpful, and polite response to the content of their statement.
- Ensure the response is in a single paragraph.
`,
});

const empatheticResponseFlow = ai.defineFlow(
  {
    name: 'empatheticResponseFlow',
    inputSchema: EmpatheticResponseInputSchema,
    outputSchema: EmpatheticResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
