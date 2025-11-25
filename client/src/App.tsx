import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Chat from "@/pages/chat";
import AIChat from "@/pages/ai-chat";
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
      <Route path="/blocked-country" component={BlockedCountry} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
    </Switch>
  );
}

function App() {
  const [isCountryBlocked, setIsCountryBlocked] = useState<boolean | null>(null);

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
          <BlockedCountry />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
