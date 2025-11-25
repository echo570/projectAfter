import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { WaitingScreen } from "@/components/WaitingScreen";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  SkipForward,
  X,
  Send,
  User,
  Flag,
} from "lucide-react";
import type { Message, WebSocketMessage, UserProfile } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "@/lib/i18n";

type ChatStatus = 'waiting' | 'connected' | 'disconnected';

export default function Chat() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  const [chatStatus, setChatStatus] = useState<ChatStatus>('waiting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    connectWebSocket();
    initializeMedia();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const profileStr = sessionStorage.getItem('userProfile');
      if (profileStr) {
        try {
          const profile = JSON.parse(profileStr);
          wsRef.current.send(JSON.stringify({
            type: 'set-profile',
            data: profile,
          }));
          sessionStorage.removeItem('userProfile');
        } catch (error) {
          console.error('Failed to parse profile:', error);
        }
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host || "localhost:5000";
    const wsUrl = `${protocol}//${host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({ type: 'find-match' }));
    };

    ws.onmessage = async (event) => {
      const msg: WebSocketMessage = JSON.parse(event.data);
      handleWebSocketMessage(msg);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive",
      });
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed', event.code, event.reason);
      
      // Show country blocking error
      if (event.code === 4001) {
        toast({
          title: "Access Denied",
          description: event.reason || "Your country is blocked from accessing this service.",
          variant: "destructive",
        });
        setLocation('/');
        return;
      }
      
      // Show IP ban error
      if (event.code === 4000) {
        toast({
          title: "Access Denied",
          description: event.reason || "You have been banned from this service.",
          variant: "destructive",
        });
        setLocation('/');
        return;
      }
      
      // Show maintenance mode error
      if (event.code === 4003) {
        toast({
          title: "Maintenance",
          description: event.reason || "The service is currently under maintenance.",
          variant: "destructive",
        });
        setLocation('/');
        return;
      }
      
      if (chatStatus === 'connected') {
        handlePartnerDisconnected();
      }
    };

    wsRef.current = ws;
  };

  const handleWebSocketMessage = async (msg: WebSocketMessage) => {
    switch (msg.type) {
      case 'match':
        sessionIdRef.current = msg.data.sessionId;
        setPartnerId(msg.data.partnerId);
        setPartnerProfile(msg.data.partnerProfile);
        setChatStatus('connected');
        const partnerInfo = msg.data.partnerProfile 
          ? `${msg.data.partnerProfile.nickname}, ${msg.data.partnerProfile.age} ${msg.data.partnerProfile.countryFlag}`
          : t('chat.match.found');
        toast({
          title: t('chat.match.found'),
          description: partnerInfo,
        });
        if (msg.data.initiator) {
          await createOffer();
        }
        break;

      case 'message':
        const newMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          sessionId: sessionIdRef.current || '',
          senderId: 'partner',
          content: msg.data.content,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, newMessage]);
        setIsTyping(false);
        break;

      case 'typing':
        setIsTyping(msg.data.isTyping);
        break;

      case 'end':
      case 'partner-disconnected':
        handlePartnerDisconnected();
        break;

      case 'offer':
        await handleOffer(msg.data.offer);
        break;

      case 'answer':
        await handleAnswer(msg.data.answer);
        break;

      case 'ice-candidate':
        await handleIceCandidate(msg.data.candidate);
        break;
    }
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: "Camera/Microphone Access",
        description: "Please allow camera and microphone access to use video chat.",
        variant: "destructive",
      });
    }
  };

  const createPeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          data: { candidate: event.candidate },
        }));
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setHasRemoteStream(true);
        
        event.track.onended = () => {
          console.log('Remote track ended:', event.track.kind);
          const stream = remoteVideoRef.current?.srcObject as MediaStream;
          if (stream && stream.getTracks().every(t => t.readyState !== 'live')) {
            setHasRemoteStream(false);
          }
        };
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Peer connection state:', pc.connectionState);
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, 'enabled:', track.enabled);
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  };

  const createOffer = async () => {
    const pc = createPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'offer',
        data: { offer },
      }));
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'answer',
        data: { answer },
      }));
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !wsRef.current || chatStatus !== 'connected') return;

    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sessionId: sessionIdRef.current || '',
      senderId: 'me',
      content: messageInput.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, message]);
    wsRef.current.send(JSON.stringify({
      type: 'message',
      data: { content: messageInput.trim() },
    }));
    setMessageInput("");
  };

  const handleTyping = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && chatStatus === 'connected') {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        data: { isTyping: true },
      }));

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'typing',
            data: { isTyping: false },
          }));
        }
      }, 1000);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      if (audioTracks.length > 0) {
        setIsMicOn(audioTracks[0].enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      if (videoTracks.length > 0) {
        setIsCameraOn(videoTracks[0].enabled);
      }
    }
  };

  const handleSkip = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'end',
        data: { requeue: true }
      }));
    }
    resetChat();
    setChatStatus('waiting');
  };

  const handleEndChat = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
    }
    cleanup();
    setLocation('/');
  };

  const handlePartnerDisconnected = () => {
    resetChat();
    setChatStatus('waiting');
    toast({
      title: t('chat.partner.disconnected'),
      description: t('chat.partner.finding'),
    });
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'find-match' }));
    }
  };

  const handleCancelWaiting = () => {
    setLocation('/');
  };

  const handleReportUser = () => {
    if (!partnerId) {
      toast({
        title: t('chat.error'),
        description: "No partner to report at this time",
        variant: "destructive",
      });
      return;
    }

    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      toast({
        title: t('chat.error'),
        description: t('chat.connection.error'),
        variant: "destructive",
      });
      return;
    }

    try {
      wsRef.current.send(JSON.stringify({
        type: 'report-user',
        data: { reportedUserId: partnerId, reason: 'Inappropriate behavior' },
      }));

      toast({
        title: t('chat.report.success'),
        description: t('chat.report.success.msg'),
      });
    } catch (error) {
      console.error('Error sending report:', error);
      toast({
        title: t('chat.error'),
        description: t('chat.report.error'),
        variant: "destructive",
      });
    }
  };

  const resetChat = () => {
    setMessages([]);
    setIsTyping(false);
    setHasRemoteStream(false);
    sessionIdRef.current = null;
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      remoteVideoRef.current.srcObject = null;
    }
  };

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  if (chatStatus === 'waiting') {
    return <WaitingScreen onCancel={handleCancelWaiting} language={language} />;
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Video Section */}
      <div className="flex-1 flex flex-col relative bg-black min-h-0">
        {/* Remote Video */}
        <div className="flex-1 relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            data-testid="video-remote"
          />
          {!hasRemoteStream && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <User className="w-12 h-12 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  {chatStatus === 'connected' ? 'Waiting for video...' : 'Disconnected'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video Preview */}
        <div className="absolute top-4 right-4 w-32 h-24 sm:w-40 sm:h-30 rounded-lg overflow-hidden border-2 border-white/20 shadow-xl">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover mirror"
            data-testid="video-local"
          />
          {!isCameraOn && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Control Buttons - Desktop */}
        <div className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2 gap-3">
          <Button
            size="icon"
            variant={isMicOn ? "secondary" : "destructive"}
            className="w-14 h-14 rounded-full"
            onClick={toggleMic}
            data-testid="button-toggle-mic"
          >
            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
          <Button
            size="icon"
            variant={isCameraOn ? "secondary" : "destructive"}
            className="w-14 h-14 rounded-full"
            onClick={toggleCamera}
            data-testid="button-toggle-camera"
          >
            {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>
          <Button
            size="icon"
            variant="default"
            className="w-14 h-14 rounded-full"
            onClick={handleSkip}
            data-testid="button-skip"
          >
            <SkipForward className="w-6 h-6" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="w-14 h-14 rounded-full"
            onClick={handleReportUser}
            disabled={!partnerId || chatStatus !== 'connected'}
            data-testid="button-report-user"
          >
            <Flag className="w-6 h-6" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="w-14 h-14 rounded-full"
            onClick={handleEndChat}
            data-testid="button-end-chat"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-full lg:w-96 flex-1 lg:flex-1 flex flex-col border-l bg-background min-h-0">
        {/* Chat Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${chatStatus === 'connected' ? 'bg-status-online' : 'bg-status-offline'}`} />
            {partnerProfile && chatStatus === 'connected' ? (
              <div className="text-sm">
                <p className="font-semibold">{partnerProfile.nickname}, {partnerProfile.age}</p>
                <p className="text-xs text-muted-foreground">{partnerProfile.countryFlag} {partnerProfile.country}</p>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground capitalize">{chatStatus}</span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="chat-messages">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center px-4">
              <p className="text-muted-foreground text-sm">
                {chatStatus === 'connected'
                  ? 'Start the conversation by saying hi!'
                  : 'Waiting to reconnect...'}
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isSender={msg.senderId === 'me'}
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                handleTyping();
              }}
              placeholder="Type a message..."
              disabled={chatStatus !== 'connected'}
              className="flex-1 rounded-full"
              data-testid="input-message"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full"
              disabled={!messageInput.trim() || chatStatus !== 'connected'}
              data-testid="button-send-message"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>

        {/* Mobile Control Buttons */}
        <div className="lg:hidden flex gap-2 p-4 border-t flex-wrap">
          <Button
            size="icon"
            variant={isMicOn ? "secondary" : "destructive"}
            className="flex-1 min-w-12 h-12"
            onClick={toggleMic}
            data-testid="button-toggle-mic-mobile"
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          <Button
            size="icon"
            variant={isCameraOn ? "secondary" : "destructive"}
            className="flex-1 min-w-12 h-12"
            onClick={toggleCamera}
            data-testid="button-toggle-camera-mobile"
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
          <Button
            size="icon"
            variant="default"
            className="flex-1 min-w-12 h-12"
            onClick={handleSkip}
            data-testid="button-skip-mobile"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="flex-1 min-w-12 h-12"
            onClick={handleReportUser}
            data-testid="button-report-user-mobile"
          >
            <Flag className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="flex-1 min-w-12 h-12"
            onClick={handleEndChat}
            data-testid="button-end-chat-mobile"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
