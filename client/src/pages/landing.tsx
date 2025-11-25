import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { InterestsSelector } from "@/components/InterestsSelector";
import { Video, MessageCircle, Users, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { OnlineStats } from "@shared/schema";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [isStarting, setIsStarting] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState<{ enabled: boolean; reason: string } | null>(null);

  const { data: stats } = useQuery<OnlineStats>({
    queryKey: ['/api/stats'],
    refetchInterval: 10000,
  });

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await fetch('/api/maintenance');
        const data = await response.json();
        setMaintenanceMode(data);
      } catch (error) {
        console.error('Failed to check maintenance status');
      }
    };
    
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartChat = () => {
    setShowInterests(true);
  };

  const handleInterestsSelected = (interests: string[]) => {
    setIsStarting(true);
    sessionStorage.setItem('userInterests', JSON.stringify(interests));
    setTimeout(() => {
      setLocation('/chat');
    }, 100);
  };

  if (maintenanceMode?.enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-destructive/5 via-background to-destructive/5 px-4">
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Site Maintenance</h1>
            <p className="text-muted-foreground">
              We're currently performing maintenance to improve your experience.
            </p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-sm font-medium">Reason:</p>
            <p className="text-sm text-muted-foreground mt-1">{maintenanceMode.reason}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Please check back soon. We'll be online shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-background/80 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl">StrangerChat</span>
          </div>
          {stats && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-online-count">
              <div className="w-2 h-2 rounded-full bg-status-online animate-pulse" />
              <span className="font-medium">{stats.totalOnline.toLocaleString()}</span>
              <span className="hidden sm:inline">online now</span>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 pt-16">
        <div className="max-w-4xl mx-auto text-center space-y-8 py-12">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              Chat with Strangers
              <span className="block text-primary mt-2">Anonymously</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with random people worldwide through text, audio, and video chat.
              Meet new friends instantly, completely free.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto pt-8">
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-card-border hover-elevate">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Video & Audio</h3>
              <p className="text-sm text-muted-foreground">Face-to-face conversations with crystal clear quality</p>
            </div>
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-card-border hover-elevate">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Instant Messaging</h3>
              <p className="text-sm text-muted-foreground">Real-time text chat for quick conversations</p>
            </div>
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-card-border hover-elevate">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Random Matching</h3>
              <p className="text-sm text-muted-foreground">Meet someone new every time you click next</p>
            </div>
          </div>

          {/* CTA or Interests Selector */}
          <div className="pt-8 max-w-2xl mx-auto">
            {!showInterests ? (
              <>
                <Button
                  size="lg"
                  className="text-lg px-12 py-6 h-auto rounded-lg"
                  onClick={handleStartChat}
                  disabled={isStarting}
                  data-testid="button-start-chat"
                >
                  {isStarting ? "Starting..." : "Start Chatting"}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  No registration required • Completely anonymous
                </p>
              </>
            ) : (
              <InterestsSelector
                onSelect={handleInterestsSelected}
                isLoading={isStarting}
              />
            )}
          </div>

          {/* Trust Indicator */}
          {stats && stats.totalOnline > 0 && (
            <div className="pt-8 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">{stats.inChat}</span> people chatting right now
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        <p>Be kind and respectful. Have fun meeting new people!</p>
      </footer>
    </div>
  );
}
