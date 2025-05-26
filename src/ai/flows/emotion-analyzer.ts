// Emotion analyzer
'use server';

/**
 * @fileOverview Emotion analysis AI agent.
 *
 * - analyzeEmotion - A function that analyzes the emotion from the text.
 * - AnalyzeEmotionInput - The input type for the analyzeEmotion function.
 * - AnalyzeEmotionOutput - The return type for the analyzeEmotion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeEmotionInputSchema = z.object({
  text: z.string().describe('The text to analyze for emotion.'),
});
export type AnalyzeEmotionInput = z.infer<typeof AnalyzeEmotionInputSchema>;

const AnalyzeEmotionOutputSchema = z.object({
  emotion: z
    .string()
    .describe(
      'The predominant emotion detected in the text (e.g., happiness, sadness, anger).'      
    ),
  confidence: z
    .number()
    .describe('The confidence level of the emotion detection (0 to 1).'),
});
export type AnalyzeEmotionOutput = z.infer<typeof AnalyzeEmotionOutputSchema>;

export async function analyzeEmotion(input: AnalyzeEmotionInput): Promise<AnalyzeEmotionOutput> {
  return analyzeEmotionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeEmotionPrompt',
  input: {schema: AnalyzeEmotionInputSchema},
  output: {schema: AnalyzeEmotionOutputSchema},
  prompt: `You are an AI emotion analyzer. Analyze the following text and determine the predominant emotion.  Also, provide a confidence level (0 to 1) for your analysis.\n\nText: {{{text}}}`,
});

const analyzeEmotionFlow = ai.defineFlow(
  {
    name: 'analyzeEmotionFlow',
    inputSchema: AnalyzeEmotionInputSchema,
    outputSchema: AnalyzeEmotionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
