
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, MessageSquare, Brain, Smile, Frown, Angry, AlertCircle, Bot, Loader2, Info, Volume2, VolumeX, SendHorizonal, Languages } from 'lucide-react';
import { analyzeEmotion } from '@/ai/flows/emotion-analyzer';
import { generateEmpatheticResponse } from '@/ai/flows/empathetic-response-generator';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

const MAX_LOG_LENGTH = 20;

const SUPPORTED_LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'hi-IN', label: 'हिंदी (Hindi)' },
  { value: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'te-IN', label: 'తెలుగు (Telugu)' },
];

export default function AssistantChat() {
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Tap the microphone or type your message");
  const [conversationLog, setConversationLog] = useState<ConversationMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const speechRecognitionRef = useRef<CustomSpeechRecognition | null>(null);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState(true);
  const [isSpeechSynthesisSupported, setIsSpeechSynthesisSupported] = useState(false);
  const [isSpeechRecognitionAvailable, setIsSpeechRecognitionAvailable] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(SUPPORTED_LANGUAGES[0].value);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setIsSpeechSynthesisSupported(true);
    } else if (typeof window !== 'undefined') {
      setIsSpeechSynthesisSupported(false);
      if (isAudioPlaybackEnabled) setIsAudioPlaybackEnabled(false);
    }
  }, [hasMounted, isAudioPlaybackEnabled]);

  const playTextAsAudio = useCallback((text: string, lang: string) => {
    if (!isAudioPlaybackEnabled || !isSpeechSynthesisSupported || typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel(); 
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang; // Use selected language for speech
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
      toast({
        title: "Audio Playback Error",
        description: `Could not play audio response: ${event.error}`,
        variant: "destructive",
      });
    };
    window.speechSynthesis.speak(utterance);
  }, [isAudioPlaybackEnabled, isSpeechSynthesisSupported, toast]);

  const addMessageToLog = useCallback((message: Omit<ConversationMessage, 'id' | 'timestamp'>) => {
    setConversationLog(prevLog => {
      const newLog = [
        ...prevLog,
        { ...message, id: Date.now().toString() + Math.random(), timestamp: new Date().toISOString() }
      ];
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

  const processUserInput = useCallback(async (text: string) => {
    if (!text.trim()) {
      setStatusMessage("No input detected. Tap microphone or type and send.");
      setIsListening(false); 
      return;
    }

    addMessageToLog({ sender: 'user', text });
    setIsLoading(true);
    setStatusMessage("Thinking..."); 

    try {
      const emotionResult = await analyzeEmotion({ text, languageCode: selectedLanguage });
      addMessageToLog({
        sender: 'system-emotion',
        text: `Detected Emotion: ${emotionResult.emotion} (Confidence: ${(emotionResult.confidence * 100).toFixed(0)}%)`,
        emotion: emotionResult.emotion,
      });

      const empatheticResponseResult = await generateEmpatheticResponse({ 
        emotion: emotionResult.emotion,
        userInputText: text,
        languageCode: selectedLanguage
      });
      addMessageToLog({ sender: 'ai', text: empatheticResponseResult.response, emotion: emotionResult.emotion });

      if (isAudioPlaybackEnabled && isSpeechSynthesisSupported) {
        playTextAsAudio(empatheticResponseResult.response, selectedLanguage);
      }
      
    } catch (error) {
      console.error("AI processing error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addMessageToLog({ sender: 'system-status', text: `Error generating response: ${errorMessage}` });
      toast({
        title: "AI Error",
        description: `Could not get response from AI: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setStatusMessage("Tap the microphone or type your message");
    }
  }, [addMessageToLog, toast, playTextAsAudio, isAudioPlaybackEnabled, isSpeechSynthesisSupported, selectedLanguage]);

  useEffect(() => {
    if (!hasMounted) return;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSpeechRecognitionAvailable(false);
      if (isListening) setIsListening(false);
      return;
    }
    setIsSpeechRecognitionAvailable(true);

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current.onstart = null;
      speechRecognitionRef.current.onresult = null;
      speechRecognitionRef.current.onerror = null;
      speechRecognitionRef.current.onend = null;
    }
    
    const recognition = new SpeechRecognitionAPI() as CustomSpeechRecognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage; // Use selected language

    recognition.onstart = () => {
      setIsListening(true);
      setStatusMessage("Listening...");
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
      
      if (interimTranscript) setStatusMessage('Listening... ' + interimTranscript);
      if (finalTranscript) {
        processUserInput(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      let errorMsg = "An error occurred during speech recognition.";
      if (event.error === 'no-speech') {
        errorMsg = "No speech detected. Please try again or type your message.";
      } else if (event.error === 'audio-capture') {
        errorMsg = "Audio capture error. Check your microphone.";
      } else if (event.error === 'not-allowed') {
        errorMsg = "Microphone access denied. Please enable microphone permissions.";
      } else if (event.error === 'language-not-supported') {
        errorMsg = `The selected language (${selectedLanguage}) is not supported by your browser's speech recognition.`;
      }
      setStatusMessage(errorMsg);
      addMessageToLog({ sender: 'system-status', text: `Error: ${errorMsg}`});
      toast({ title: "Speech Recognition Error", description: errorMsg, variant: "destructive" });
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!isLoading) {
        setStatusMessage("Tap the microphone or type your message");
      }
    };

    speechRecognitionRef.current = recognition;

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
    };
  }, [hasMounted, toast, addMessageToLog, isLoading, processUserInput, selectedLanguage]);

  // Effect for component unmount cleanup for speech synthesis
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel(); 
      }
    };
  }, []);

  useEffect(() => {
      if (!hasMounted || isSpeechRecognitionAvailable) return;
      if (typeof window !== 'undefined' && !((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) {
          setStatusMessage("Speech recognition not supported. You can still type messages.");
          toast({
            title: "Browser Compatibility",
            description: "Speech recognition is not available in your browser. Please try Chrome or Edge. You can still type messages.",
            variant: "default",
          });
      }
  }, [hasMounted, isSpeechRecognitionAvailable, toast]);

  useEffect(() => {
      if (!hasMounted || isSpeechSynthesisSupported) return;
      if (typeof window !== 'undefined' && !window.speechSynthesis) {
          toast({
              title: "Audio Playback Not Supported",
              description: "Your browser does not support speech synthesis for AI responses. Audio playback will be disabled.",
              variant: "default",
          });
      }
  }, [hasMounted, isSpeechSynthesisSupported, toast]);


  const handleSendTextMessage = () => {
    if (textInput.trim()) {
      processUserInput(textInput.trim());
      setTextInput(""); 
    }
  };

  const toggleListening = () => {
    if (!hasMounted || !isSpeechRecognitionAvailable || !speechRecognitionRef.current) {
      if(hasMounted && !isSpeechRecognitionAvailable) {
        toast({ title: "Feature Not Supported", description: "Speech recognition is not available in your browser.", variant: "destructive" });
      } else if (hasMounted && !speechRecognitionRef.current) {
        toast({ title: "Error", description: "Speech recognition is not initialized. Please refresh or check console.", variant: "destructive" });
      }
      return;
    }
    if (isListening) {
      speechRecognitionRef.current?.stop();
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          try {
            speechRecognitionRef.current?.start();
          } catch (err) {
            console.error("Error starting recognition:", err);
             let errorMsg = "Could not start speech recognition.";
             if (err instanceof DOMException && err.name === 'NotAllowedError') {
                 errorMsg = "Microphone access was denied by the browser or system."
             } else if (err instanceof DOMException && err.name === 'InvalidStateError') {
                 errorMsg = "Speech recognition is already active. Please wait."
             }
            setStatusMessage(errorMsg);
            toast({ title: "Speech Recognition Error", description: errorMsg, variant: "destructive" });
            addMessageToLog({ sender: 'system-status', text: errorMsg});
            setIsListening(false); // Ensure state is reset
          }
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
      case 'loneliness': case 'lonely': return <Bot className="w-6 h-6 text-purple-500" />; 
      case 'neutral': return <Info className="w-6 h-6 text-gray-400" />;
      default: return <Brain className="w-6 h-6 text-gray-500" />; 
    }
  };

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
        
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 items-stretch">
            <Input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow text-lg rounded-lg shadow-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault(); 
                  handleSendTextMessage();
                }
              }}
              disabled={!hasMounted || isLoading || isListening}
            />
            <Button
              onClick={handleSendTextMessage}
              disabled={!hasMounted || isLoading || isListening || !textInput.trim()}
              className="text-lg rounded-lg shadow-md px-4"
              aria-label="Send message"
            >
              <SendHorizonal className="w-6 h-6" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
             <div className="flex items-center justify-center sm:justify-start space-x-2 p-2 border rounded-lg bg-card shadow-md ">
                {!hasMounted ? (
                  <>
                    <Switch id="audio-playback-switch-disabled" disabled checked={isAudioPlaybackEnabled} />
                    <Label htmlFor="audio-playback-switch-disabled" className="flex items-center text-muted-foreground cursor-not-allowed text-sm sm:text-base">
                      <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="ml-1.5 hidden sm:inline">Audio</span>
                    </Label>
                  </>
                ) : (
                  <>
                    <Switch
                      id="audio-playback-switch"
                      checked={isAudioPlaybackEnabled}
                      onCheckedChange={setIsAudioPlaybackEnabled}
                      disabled={!isSpeechSynthesisSupported}
                      aria-label={isAudioPlaybackEnabled ? "Disable audio response" : "Enable audio response"}
                    />
                    <Label htmlFor="audio-playback-switch" className="flex items-center text-muted-foreground cursor-pointer text-sm sm:text-base">
                      {isAudioPlaybackEnabled ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
                      <span className="ml-1.5 hidden sm:inline">Audio</span>
                    </Label>
                  </>
                )}
              </div>
            
            {!hasMounted ? (
                 <Button
                    disabled={true}
                    className="w-full h-14 text-lg rounded-lg shadow-lg"
                    aria-label="Loading microphone"
                >
                    <Loader2 className="w-7 h-7 mr-2 animate-spin" />
                    Mic...
                </Button>
            ) : (
                <Button
                    onClick={toggleListening}
                    disabled={isLoading || !isSpeechRecognitionAvailable}
                    className="w-full h-14 text-lg rounded-lg shadow-lg transform transition-transform hover:scale-105 active:scale-95"
                    aria-label={isListening ? "Stop listening" : "Start listening"}
                    variant={isListening ? "destructive" : "default"}
                >
                    {isLoading && !isListening ? ( 
                        <Loader2 className="w-7 h-7 mr-2 animate-spin" />
                    ) : isListening ? (
                        <MicOff className="w-7 h-7 mr-2 animate-pulse" />
                    ) : (
                        <Mic className="w-7 h-7 mr-2" />
                    )}
                    {isLoading && !isListening ? 'Processing...' : (isListening ? 'Listening...' : 'Tap to Talk')}
                </Button>
            )}

            <div className="flex items-center justify-center sm:justify-end">
              {!hasMounted ? (
                <div className="flex items-center space-x-2 p-2 border rounded-lg bg-card shadow-md text-muted-foreground cursor-not-allowed text-sm sm:text-base h-14 w-full">
                  <Languages className="w-5 h-5 sm:w-6 sm:h-6 mr-1.5" /> Language...
                </div>
              ) : (
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={isLoading || isListening}>
                  <SelectTrigger className="w-full h-14 text-lg rounded-lg shadow-md">
                    <div className="flex items-center">
                      <Languages className="w-5 h-5 sm:w-6 sm:h-6 mr-1.5" />
                      <SelectValue placeholder="Select language" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <SelectItem key={lang.value} value={lang.value} className="text-lg">
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

