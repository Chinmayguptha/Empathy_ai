'use server';
/**
 * @fileOverview An AI agent that generates empathetic responses based on detected emotion.
 *
 * - generateEmpatheticResponse - A function that generates an empathetic response.
 * - EmpatheticResponseInput - The input type for the generateEmpatheticResponse function.
 * - EmpatheticResponseOutput - The return type for the generateEmpatheticResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EmpatheticResponseInputSchema = z.object({
  emotion: z
    .string()
    .describe('The emotion detected from the user\'s speech or text (e.g., happy, sad, angry).'),
});
export type EmpatheticResponseInput = z.infer<typeof EmpatheticResponseInputSchema>;

const EmpatheticResponseOutputSchema = z.object({
  response: z.string().describe('An empathetic response based on the detected emotion.'),
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
  prompt: `You are an AI assistant designed to provide empathetic responses to users based on their detected emotion.

  Emotion: {{{emotion}}}

  Based on the emotion above, generate a brief, supportive, and comforting message.
  The message should be tailored to the specific emotion and offer words of encouragement or understanding.
  Consider offering helpful suggestions or resources if appropriate.
  Keep the response concise and easy to understand, suitable for elderly users.
  Responses should embody a gentle blue (#89B4FA) to evoke calm and trust. Always add an emoji at the end of the response. Focus on these emotions: Joy, Sadness, Anger, Anxiety, Loneliness.
  If the emotion is Joy, respond with a positive and uplifting message, expressing shared happiness.
  If the emotion is Sadness, respond with a comforting and supportive message, offering empathy and understanding. Use soft lavender (#C4A7E7) highlights.
  If the emotion is Anger, respond with a calming and reassuring message, suggesting ways to manage frustration.
  If the emotion is Anxiety, respond with a soothing and grounding message, promoting relaxation and stress relief. Use simple, easily recognizable icons, especially for actions like 'Talk' or emotional states.
  If the emotion is Loneliness, respond with a message expressing companionship and offering connection or distraction.
  Be concise. Use a sans-serif font.
  Make sure the response is in a single paragraph.
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
