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

export default function AIVoiceChat() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Play greeting on load
  useEffect(() => {
    const greetingText = "Hello, I'm Gemma, a Google AI. How can I help you today?";
    playGreeting(greetingText);
    setPageLoaded(true);
  }, []);

  const playGreeting = async (text: string) => {
    setIsSpeaking(true);

    try {
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

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play().catch(err => {
        console.error('Failed to play audio:', err);
        setIsSpeaking(false);
      });
    } catch (error) {
      console.error('Failed to play greeting:', error);
      setIsSpeaking(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size < 1000) {
          toast({
            title: "No Speech Detected",
            description: "Please speak clearly and try again.",
            variant: "destructive",
          });
          setIsRecording(false);
          return;
        }

        await transcribeAndProcess(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
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
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const transcribeAndProcess = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Failed to convert audio');
        }

        // Transcribe using ElevenLabs
        const transcribeResponse = await fetch('/api/ai/voice/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio }),
        });

        if (!transcribeResponse.ok) {
          throw new Error('Failed to transcribe');
        }

        const transcribeData = await transcribeResponse.json();
        const userSpeech = transcribeData.text.trim();

        if (!userSpeech) {
          toast({
            title: "No Speech Detected",
            description: "Could not understand your speech. Please try again.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: userSpeech,
        };

        setMessages(prev => [...prev, userMessage]);

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
        await playAIResponse(data.response);
      };
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

  const playAIResponse = async (text: string) => {
    setIsSpeaking(true);

    try {
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

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play().catch(err => {
        console.error('Failed to play audio:', err);
        setIsSpeaking(false);
      });
    } catch (error) {
      console.error('Failed to play response:', error);
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
            <Card className="p-8 max-w-md text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Ready to Chat</h2>
                <p className="text-sm text-muted-foreground">
                  Click the microphone button below to start speaking with Gemma.
                </p>
              </div>
            </Card>
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
