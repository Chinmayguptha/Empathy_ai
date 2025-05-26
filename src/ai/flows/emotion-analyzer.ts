
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
  languageCode: z.string().optional().describe('The BCP-47 language code of the input text (e.g., en-US, hi-IN). If not provided, the AI will attempt to auto-detect.'),
});
export type AnalyzeEmotionInput = z.infer<typeof AnalyzeEmotionInputSchema>;

const AnalyzeEmotionOutputSchema = z.object({
  emotion: z
    .string()
    .describe(
      'The predominant emotion detected in the text (e.g., happiness, sadness, anger, neutral). This should be an English term.'
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
  prompt: `You are an AI emotion analyzer. Your task is to carefully analyze the following text to identify the underlying emotion, even if no explicit emotion words (like "happy", "sad", "angry") are used.
The input text might be in any language, if a languageCode is provided ({{{languageCode}}}), use that as a hint.
Consider the phrasing, implications, and subtle cues within the text to determine the most likely predominant emotion.
If the text is purely factual or a question without clear emotional tone, classify it as "neutral".
Also, provide a confidence level (0 to 1) for your analysis.
Output the detected emotion as an English word (e.g., happiness, sadness, anger, neutral).

Text: {{{text}}}`,
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

