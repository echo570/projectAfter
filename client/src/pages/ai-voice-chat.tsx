import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mic, MicOff, Volume2, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function AIVoiceChat() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [pageLoaded, setPageLoaded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");
  const recordingStartTimeRef = useRef<number>(0);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize speech recognition and play greeting
  useEffect(() => {
    const initializeAndGreet = async () => {
      // Initialize Web Speech API
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SpeechRecognition) {
        toast({
          title: "Browser Not Supported",
          description: "Your browser doesn't support voice input. Please use Chrome, Edge, or Safari.",
          variant: "destructive",
        });
        return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        finalTranscriptRef.current = '';
        setInterimTranscript('');
      };

      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += transcript + ' ';
            console.log('Final transcript:', finalTranscriptRef.current);
          } else {
            interim += transcript;
          }
        }
        
        setInterimTranscript(interim);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Microphone Error",
          description: `Error: ${event.error}. Check microphone permissions and try again.`,
          variant: "destructive",
        });
      };

      // Play greeting
      await playGreeting();
      setPageLoaded(true);
    };

    initializeAndGreet();
  }, []);

  const playGreeting = async () => {
    const greetingText = "Hello, I'm Gemma, a Google AI. How can I help you today?";
    
    const greetingMessage: Message = {
      id: 'greeting',
      role: 'assistant',
      content: greetingText,
    };

    setMessages([greetingMessage]);
    setIsSpeaking(true);

    try {
      const audioResponse = await fetch('/api/ai/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: greetingText }),
      });

      if (!audioResponse.ok) {
        throw new Error('Failed to synthesize speech');
      }

      const audioBlob = await audioResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
    } catch (error) {
      console.error('Failed to play greeting:', error);
      setIsSpeaking(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      finalTranscriptRef.current = '';
      setInterimTranscript('');
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        // Wait for speech recognition to finalize
        await new Promise(resolve => setTimeout(resolve, 800));

        const spokenText = finalTranscriptRef.current.trim();
        const recordingDuration = Date.now() - recordingStartTimeRef.current;

        console.log('Recording duration:', recordingDuration);
        console.log('Spoken text:', spokenText);
        console.log('Spoken text length:', spokenText.length);

        if (spokenText && spokenText.length > 0) {
          await processUserMessage(spokenText);
        } else {
          toast({
            title: "No Speech Detected",
            description: "Please speak clearly and try again.",
            variant: "destructive",
          });
          setIsRecording(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Failed to start recognition:', error);
        }
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone. Check permissions and try again.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Failed to stop recognition:', error);
        }
      }
    }
  };

  const processUserMessage = async (userSpeech: string) => {
    setIsProcessing(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userSpeech,
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Get AI response
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userSpeech }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
      };

      setMessages(prev => [...prev, aiMessage]);
      await synthesizeAndPlay(data.response);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const synthesizeAndPlay = async (text: string) => {
    try {
      setIsSpeaking(true);
      const audioResponse = await fetch('/api/ai/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!audioResponse.ok) {
        throw new Error('Failed to synthesize speech');
      }

      const audioBlob = await audioResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
    } catch (error) {
      console.error('Failed to synthesize speech:', error);
      setIsSpeaking(false);
      toast({
        title: "Error",
        description: "Failed to play audio response.",
        variant: "destructive",
      });
    }
  };

  if (!pageLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Gemma - AI Voice Chat</h1>
            <p className="text-sm text-muted-foreground">Voice-powered by Gemini & ElevenLabs</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">Loading...</div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`message-${msg.id}`}
          >
            <div
              className={`max-w-sm px-4 py-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground border border-input'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-3 rounded-lg flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          </div>
        )}

        {interimTranscript && isRecording && (
          <div className="flex justify-end">
            <div className="bg-primary/20 text-primary px-4 py-2 rounded-lg max-w-sm text-sm italic">
              {interimTranscript}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-card/50 backdrop-blur p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex gap-2 justify-center">
            <Button
              size="lg"
              className="rounded-full w-16 h-16"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isSpeaking}
              data-testid="button-microphone"
            >
              {isRecording ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>

            {isSpeaking && (
              <Button
                size="lg"
                variant="outline"
                className="rounded-full w-16 h-16"
                disabled
                data-testid="button-speaker"
              >
                <Volume2 className="w-6 h-6 animate-pulse" />
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {isRecording
              ? 'Listening... Click to stop'
              : isProcessing
              ? 'Processing...'
              : isSpeaking
              ? 'Gemma is speaking...'
              : 'Click the microphone to start'}
          </p>
        </div>
      </div>
    </div>
  );
}
