
'use server';
/**
 * @fileOverview An AI agent that generates empathetic responses based on detected emotion and user context, supporting multiple languages.
 *
 * - generateEmpatheticResponse - A function that generates an empathetic response.
 * - EmpatheticResponseInput - The input type for the generateEmpatheticResponse function.
 * - EmpatheticResponseOutput - The return type for the generateEmpatheticResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EmpatheticResponseInputSchema = z.object({
  userInputText: z.string().describe("The original text spoken or typed by the user."),
  emotion: z
    .string()
    .describe('The predominant emotion detected from the user\'s input (e.g., happy, sad, angry, neutral). This will be an English term.'),
  languageCode: z.string().describe('The BCP-47 language code the user is interacting in and expects a response in (e.g., en-US, hi-IN, kn-IN, te-IN).'),
});
export type EmpatheticResponseInput = z.infer<typeof EmpatheticResponseInputSchema>;

const EmpatheticResponseOutputSchema = z.object({
  response: z.string().describe('An empathetic and contextually relevant response, in the specified languageCode.'),
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
  prompt: `You are an AI assistant designed to provide empathetic and clear responses to users, especially elderly users, in their preferred language.
You will be given the original user's statement, a detected predominant emotion (as an English term), and a target languageCode for your response.

User's statement: {{{userInputText}}}
Detected Emotion (English term): {{{emotion}}}
Target Language for Response (BCP-47 code): {{{languageCode}}}

IMPORTANT: Your entire response MUST be in the language specified by '{{{languageCode}}}'.

Based on the user's statement and the detected emotion, generate a brief, supportive, and comforting message in the target language '{{{languageCode}}}'.

Your response structure should be (adapt this structure to be natural in '{{{languageCode}}}'):
1.  Start by explicitly acknowledging the detected emotion, translated appropriately into '{{{languageCode}}}'. For example, if emotion is 'sadness' and language is 'hi-IN', you might start with something like "मुझे सुनके दुःख हुआ कि आप उदास महसूस कर रहे हैं..." (I hear that you're feeling sad...).
2.  Then, briefly paraphrase or directly reference the key part of the user's statement (also in '{{{languageCode}}}') to show you've understood their specific context.
3.  Finally, offer your empathetic remark, encouragement, or clarification in '{{{languageCode}}}'.

- Tailor the message to the specific detected emotion, offering words of encouragement, understanding, or appropriate suggestions, all in '{{{languageCode}}}'.
- If the user's statement is a question or implies a need for information, even if an emotion is detected, prioritize providing a clear and helpful answer first in '{{{languageCode}}}', then weave in empathy if appropriate.
- Keep the response concise (1-3 sentences in total after acknowledgment and paraphrase) and easy to understand in '{{{languageCode}}}'.
- Always add a relevant emoji at the end of the response.
- Focus on these primary emotions when tailoring empathy (these are English terms, translate the *concept* to '{{{languageCode}}}' for your response): Joy, Sadness, Anger, Anxiety, Loneliness.
  - If Joy: Express shared happiness.
  - If Sadness: Offer comfort and understanding.
  - If Anger: Respond with calm and reassurance.
  - If Anxiety: Provide soothing and grounding words.
  - If Loneliness: Express companionship.
- If the emotion is "neutral" or unclear, or if the user's statement is purely factual or a direct question without strong emotional overlay, focus on providing a clear, helpful, and polite response to the content of their statement in '{{{languageCode}}}', still acknowledging the context.
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

