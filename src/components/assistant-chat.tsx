
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mic, MicOff, MessageSquare, Brain, Smile, Frown, Angry, AlertCircle, Bot, Loader2, FileText, Info } from 'lucide-react';
import { analyzeEmotion } from '@/ai/flows/emotion-analyzer';
import { generateEmpatheticResponse } from '@/ai/flows/empathetic-response-generator';
import { summarizeConversation, SummarizeConversationInput } from '@/ai/flows/conversation-summarizer';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ConversationMessage {
  id: string;
  sender: 'user' | 'ai' | 'system-emotion' | 'system-status';
  text: string;
  timestamp: string;
  emotion?: string;
}

interface CustomSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface CustomSpeechRecognition extends SpeechRecognition {
  onresult: (event: CustomSpeechRecognitionEvent) => void;
}

const MAX_LOG_LENGTH = 20;

export default function AssistantChat() {
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Tap the microphone to talk");
  const [conversationLog, setConversationLog] = useState<ConversationMessage[]>([]);
  const [conversationSummary, setConversationSummary] = useState<string | null>(null);
  const speechRecognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const addMessageToLog = useCallback((message: Omit<ConversationMessage, 'id' | 'timestamp'>) => {
    setConversationLog(prevLog => {
      const newLog = [
        ...prevLog,
        { ...message, id: Date.now().toString() + Math.random(), timestamp: new Date().toISOString() }
      ];
      // Clear summary when new messages are added
      setConversationSummary(null);
      if (newLog.length > MAX_LOG_LENGTH) {
        return newLog.slice(newLog.length - MAX_LOG_LENGTH);
      }
      return newLog;
    });
  }, []);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport="true"]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [conversationLog]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        setStatusMessage("Speech recognition not supported in this browser.");
        toast({
          title: "Browser Compatibility",
          description: "Speech recognition is not available in your browser. Please try Chrome or Edge.",
          variant: "destructive",
        });
        return;
      }

      const recognition = new SpeechRecognitionAPI() as CustomSpeechRecognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage("Listening...");
        addMessageToLog({ sender: 'system-status', text: "Listening started..." });
      };

      recognition.onresult = (event: CustomSpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (interimTranscript) setStatusMessage(`Listening... ${interimTranscript}`);
        if (finalTranscript) {
          handleTranscription(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        let errorMsg = "An error occurred during speech recognition.";
        if (event.error === 'no-speech') {
          errorMsg = "No speech detected. Please try again.";
        } else if (event.error === 'audio-capture') {
          errorMsg = "Audio capture error. Check your microphone.";
        } else if (event.error === 'not-allowed') {
          errorMsg = "Microphone access denied. Please enable microphone permissions.";
        }
        setStatusMessage(errorMsg);
        addMessageToLog({ sender: 'system-status', text: `Error: ${errorMsg}`});
        toast({ title: "Speech Recognition Error", description: errorMsg, variant: "destructive" });
      };

      recognition.onend = () => {
        setIsListening(false);
        if (!isLoading && !isSummarizing) setStatusMessage("Tap the microphone to talk");
      };

      speechRecognitionRef.current = recognition;
    }

    return () => {
      speechRecognitionRef.current?.stop();
    };
  }, [toast, addMessageToLog, isLoading, isSummarizing]);

  const handleTranscription = async (text: string) => {
    if (!text) {
      setStatusMessage("No speech detected. Tap to try again.");
      setIsListening(false);
      return;
    }

    addMessageToLog({ sender: 'user', text });
    setIsLoading(true);
    setStatusMessage("Analyzing emotion...");
    addMessageToLog({ sender: 'system-status', text: "Analyzing emotion..."});

    try {
      const emotionResult = await analyzeEmotion({ text });
      addMessageToLog({
        sender: 'system-emotion',
        text: `Detected Emotion: ${emotionResult.emotion} (Confidence: ${(emotionResult.confidence * 100).toFixed(0)}%)`,
        emotion: emotionResult.emotion,
      });
      setStatusMessage("Generating response...");
      addMessageToLog({ sender: 'system-status', text: "Generating empathetic response..."});

      const empatheticResponseResult = await generateEmpatheticResponse({ 
        emotion: emotionResult.emotion,
        userInputText: text 
      });
      addMessageToLog({ sender: 'ai', text: empatheticResponseResult.response, emotion: emotionResult.emotion });
      
    } catch (error) {
      console.error("AI processing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addMessageToLog({ sender: 'system-status', text: `Error generating response: ${errorMessage}` });
      toast({
        title: "AI Error",
        description: "Could not get response from AI.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setStatusMessage("Tap the microphone to talk");
    }
  };

  const handleSummarizeConversation = async () => {
    const messagesToSummarize: SummarizeConversationInput['messages'] = conversationLog
      .filter(msg => msg.sender === 'user' || msg.sender === 'ai')
      .map(msg => ({ sender: msg.sender as 'user' | 'ai', text: msg.text }));

    if (messagesToSummarize.length === 0) {
      toast({
        title: "Cannot Summarize",
        description: "There are no messages in the conversation to summarize.",
        variant: "default"
      });
      return;
    }

    setIsSummarizing(true);
    setStatusMessage("Summarizing conversation...");
    setConversationSummary(null); 
    addMessageToLog({ sender: 'system-status', text: "Summarizing conversation..."});

    try {
      const summaryResult = await summarizeConversation({ messages: messagesToSummarize });
      setConversationSummary(summaryResult.summary);
      addMessageToLog({ sender: 'system-status', text: "Summarization complete."});
      toast({
        title: "Summary Generated",
        description: "Conversation summary has been created.",
        variant: "default"
      });
    } catch (error) {
      console.error("Summarization error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error during summarization";
      addMessageToLog({ sender: 'system-status', text: `Error summarizing: ${errorMessage}`});
      toast({
        title: "Summarization Error",
        description: "Could not summarize the conversation.",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
      setStatusMessage("Tap the microphone to talk");
    }
  };

  const toggleListening = () => {
    if (!speechRecognitionRef.current) {
      toast({ title: "Error", description: "Speech recognition is not initialized.", variant: "destructive" });
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          speechRecognitionRef.current?.start();
        })
        .catch(err => {
          setStatusMessage("Microphone access denied. Please enable permissions.");
          toast({ title: "Microphone Access", description: "Permission to use microphone was denied. Please enable it in your browser settings.", variant: "destructive" });
          addMessageToLog({ sender: 'system-status', text: "Microphone permission denied."});
        });
    }
  };
  
  const getEmotionIcon = (emotion?: string) => {
    if (!emotion) return <Bot className="w-6 h-6 text-primary" />;
    switch (emotion.toLowerCase()) {
      case 'joy': case 'happy': case 'happiness': return <Smile className="w-6 h-6 text-yellow-500" />;
      case 'sadness': case 'sad': return <Frown className="w-6 h-6 text-blue-500" />;
      case 'anger': case 'angry': return <Angry className="w-6 h-6 text-red-500" />;
      case 'anxiety': case 'anxious': return <AlertCircle className="w-6 h-6 text-orange-500" />;
      case 'loneliness': case 'lonely': return <Bot className="w-6 h-6 text-purple-500" />; // Consider a more specific icon if available
      case 'neutral': return <Info className="w-6 h-6 text-gray-400" />;
      default: return <Brain className="w-6 h-6 text-gray-500" />;
    }
  };

  const canSummarize = conversationLog.some(msg => msg.sender === 'user' || msg.sender === 'ai');

  return (
    <Card className="w-full max-w-2xl shadow-2xl rounded-xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center">
          <MessageSquare className="w-10 h-10 mr-3 text-accent" /> EmpathyAI
        </CardTitle>
        <p className="text-muted-foreground text-lg min-h-[28px]">{statusMessage}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 p-6">
        <ScrollArea className="h-[350px] w-full border rounded-lg p-4 bg-background" ref={scrollAreaRef}>
          {conversationLog.length === 0 && (
            <p className="text-center text-muted-foreground text-lg py-10">
              Your conversation will appear here.
            </p>
          )}
          {conversationLog.map((msg) => (
            <div
              key={msg.id}
              className={`flex mb-3 text-lg ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`p-3 rounded-lg max-w-[80%] shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : msg.sender === 'ai'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-muted text-muted-foreground text-sm italic w-full text-center'
                }`}
              >
                {msg.sender === 'ai' && (
                  <div className="flex items-center mb-1">
                    {getEmotionIcon(msg.emotion)}
                    <span className="font-semibold ml-2">AI Assistant</span>
                  </div>
                )}
                 {msg.sender === 'system-emotion' && (
                  <div className="flex items-center justify-center">
                     {getEmotionIcon(msg.emotion)}
                    <span className="font-semibold ml-2">{msg.text}</span>
                  </div>
                )}
                {msg.sender !== 'system-emotion' && <p className="whitespace-pre-wrap">{msg.text}</p>}
                <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : msg.sender === 'ai' ? 'text-secondary-foreground/70' : 'text-muted-foreground/70'} ${msg.sender === 'system-status' || msg.sender === 'system-emotion' ? 'text-center' : (msg.sender === 'user' ? 'text-right' : 'text-left')}`}>
                  {format(new Date(msg.timestamp), 'p')}
                </p>
              </div>
            </div>
          ))}
        </ScrollArea>

        {conversationSummary && (
          <Alert className="mt-4 shadow">
            <FileText className="h-5 w-5" />
            <AlertTitle className="font-semibold">Conversation Summary</AlertTitle>
            <AlertDescription className="text-base">
              {conversationSummary}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3">
            <Button
                onClick={handleSummarizeConversation}
                disabled={isLoading || isSummarizing || !canSummarize}
                className="w-full sm:w-auto flex-grow text-lg rounded-lg shadow-md"
                variant="outline"
            >
                {isSummarizing ? (
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                ) : (
                    <FileText className="w-6 h-6 mr-2" />
                )}
                {isSummarizing ? 'Summarizing...' : 'Summarize Chat'}
            </Button>
            <Button
                onClick={toggleListening}
                disabled={isLoading || isSummarizing || (typeof window !== 'undefined' && !((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))}
                className="w-full sm:w-auto flex-grow h-16 text-xl rounded-lg shadow-lg transform transition-transform hover:scale-105 active:scale-95"
                aria-label={isListening ? "Stop listening" : "Start listening"}
            >
                {isListening ? (
                    <MicOff className="w-8 h-8 mr-2 animate-pulse" />
                ) : (
                    <Mic className="w-8 h-8 mr-2" />
                )}
                {isListening ? 'Listening...' : (isLoading || isSummarizing ? 'Processing...' : 'Tap to Talk')}
            </Button>
        </div>

      </CardContent>
    </Card>
  );
}
    
