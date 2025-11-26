import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mic, MicOff, Volume2, VolumeX, Loader } from "lucide-react";
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
  const [transcript, setTranscript] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const recognitionCompleteRef = useRef<boolean>(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize Web Speech API for transcription
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            transcriptRef.current += text + ' ';
            setTranscript(transcriptRef.current);
          } else {
            interim += text;
          }
        }
      };

      recognitionRef.current.onend = () => {
        recognitionCompleteRef.current = true;
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        recognitionCompleteRef.current = true;
        toast({
          title: "Error",
          description: "Failed to process speech",
          variant: "destructive",
        });
      };
    }
  }, [toast]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Wait a bit for speech recognition to finalize
        setTimeout(() => {
          if (transcriptRef.current.trim()) {
            processAudio(audioBlob);
          } else {
            toast({
              title: "Error",
              description: "No speech detected. Please try again.",
              variant: "destructive",
            });
            setIsRecording(false);
          }
        }, 500);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    const finalTranscript = transcriptRef.current.trim();
    
    if (!finalTranscript) {
      toast({
        title: "Error",
        description: "No speech detected",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: finalTranscript,
    };

    setMessages(prev => [...prev, userMessage]);
    transcriptRef.current = "";
    setTranscript("");

    try {
      // Get AI response
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalTranscript }),
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

      // Synthesize speech response
      await synthesizeAndPlay(data.response);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to process request",
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
        description: "Failed to synthesize speech",
        variant: "destructive",
      });
    }
  };

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
            <h1 className="text-lg font-semibold">AI Voice Chat</h1>
            <p className="text-sm text-muted-foreground">Speak with AI - powered by Gemini & ElevenLabs</p>
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
                <h2 className="text-xl font-semibold mb-2">Start Talking</h2>
                <p className="text-sm text-muted-foreground">
                  Press the microphone button to speak with AI. Your voice will be transcribed and answered.
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
          {transcript && (
            <div className="p-3 bg-secondary rounded-lg text-sm">
              <p className="text-muted-foreground mb-1">Listening:</p>
              <p className="text-foreground">{transcript}</p>
            </div>
          )}

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
              ? 'Processing your request...'
              : isSpeaking
              ? 'AI is speaking...'
              : 'Click the microphone to start'}
          </p>
        </div>
      </div>
    </div>
  );
}
