
'use server';
/**
 * @fileOverview An AI agent that summarizes conversations.
 *
 * - summarizeConversation - A function that generates a summary of the conversation.
 * - SummarizeConversationInput - The input type for the summarizeConversation function.
 * - SummarizeConversationOutput - The return type for the summarizeConversation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConversationMessageSchema = z.object({
  sender: z.enum(['user', 'ai']).describe("The sender of the message, either 'user' or 'ai'."),
  text: z.string().describe('The text content of the message.'),
});

const SummarizeConversationInputSchema = z.object({
  messages: z.array(ConversationMessageSchema).min(1).describe('A list of conversation messages to be summarized.'),
});
export type SummarizeConversationInput = z.infer<typeof SummarizeConversationInputSchema>;

const SummarizeConversationOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the conversation.'),
});
export type SummarizeConversationOutput = z.infer<typeof SummarizeConversationOutputSchema>;

export async function summarizeConversation(
  input: SummarizeConversationInput
): Promise<SummarizeConversationOutput> {
  return summarizeConversationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeConversationPrompt',
  input: {schema: SummarizeConversationInputSchema},
  output: {schema: SummarizeConversationOutputSchema},
  prompt: `You are an AI assistant tasked with summarizing a conversation.
The conversation messages are provided below. Please generate a brief, neutral summary highlighting the key topics discussed and any outcomes if apparent.

Conversation:
{{#each messages}}
{{sender}}: {{{text}}}
{{/each}}

Provide only the summary.`,
});

const summarizeConversationFlow = ai.defineFlow(
  {
    name: 'summarizeConversationFlow',
    inputSchema: SummarizeConversationInputSchema,
    outputSchema: SummarizeConversationOutputSchema,
  },
  async input => {
    if (input.messages.length === 0) {
      return { summary: "The conversation is empty, nothing to summarize." };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
