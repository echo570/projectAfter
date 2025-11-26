import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import Landing from "@/pages/landing";
import Chat from "@/pages/chat";
import AIChat from "@/pages/ai-chat";
import AIVoiceChat from "@/pages/ai-voice-chat";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import BlockedCountry from "@/pages/blocked-country";
import { useState, useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/chat" component={Chat} />
      <Route path="/ai-chat" component={AIChat} />
      <Route path="/ai-voice-chat" component={AIVoiceChat} />
      <Route path="/blocked-country" component={BlockedCountry} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
    </Switch>
  );
}

function App() {
  const [isCountryBlocked, setIsCountryBlocked] = useState<boolean | null>(null);
  const [isServerConnected, setIsServerConnected] = useState(true);

  useEffect(() => {
    const checkCountry = async () => {
      try {
        const response = await fetch('/api/check-country-status');
        const data = await response.json();
        setIsCountryBlocked(data.isBlocked);
      } catch (error) {
        console.error('Failed to check country status:', error);
        setIsCountryBlocked(false);
      }
    };

    checkCountry();
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          setIsServerConnected(true);
        } else {
          setIsServerConnected(false);
        }
      } catch (error) {
        setIsServerConnected(false);
      }
    };

    // Check connection every 3 seconds
    const interval = setInterval(checkConnection, 3000);
    checkConnection();

    return () => clearInterval(interval);
  }, []);

  if (isCountryBlocked === null) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="flex items-center justify-center min-h-screen bg-background" />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (isCountryBlocked) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ConnectionStatus isConnected={isServerConnected} />
          <BlockedCountry />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ConnectionStatus isConnected={isServerConnected} />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
