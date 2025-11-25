import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBanned, setIsBanned] = useState(false);
  const [banTimeRemaining, setBanTimeRemaining] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (response.status === 429) {
        setIsBanned(true);
        setBanTimeRemaining(data.bannedUntil);
        const secondsRemaining = Math.ceil(data.bannedUntil / 1000);
        toast({
          title: "Too Many Failed Attempts",
          description: `Your IP has been temporarily locked. Banned for ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''}.`,
          variant: "destructive",
        });
      } else if (response.status === 401) {
        setFailedAttempts(data.failedAttempts || 0);
        if (data.isBanned) {
          setIsBanned(true);
          const secondsRemaining = Math.ceil(data.banTimeRemaining / 1000);
          toast({
            title: "Account Locked",
            description: `Too many failed attempts. Banned for ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''}.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: "Invalid credentials",
            variant: "destructive",
          });
        }
      } else if (response.status === 200 && data.token) {
        localStorage.setItem("adminToken", data.token);
        setFailedAttempts(0);
        setIsBanned(false);
        toast({
          title: "Login Successful",
          description: "Welcome to the admin panel",
        });
        setLocation("/admin/dashboard");
      } else {
        toast({
          title: "Error",
          description: data.error || "Login failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground mb-6">Sign in to manage the site</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              data-testid="input-admin-username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              data-testid="input-admin-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="button-admin-login"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {(failedAttempts > 0 || isBanned) && (
          <div className={`mt-4 p-3 border rounded-lg ${isBanned ? 'bg-destructive/15 border-destructive/30' : 'bg-destructive/10 border-destructive/20'}`}>
            <p className="text-sm font-medium text-destructive">
              {failedAttempts === 1 
                ? "1 failed attempt since last successful login"
                : `${failedAttempts} failed attempts since last successful login`}
            </p>
            {isBanned && (
              <p className="text-xs text-destructive mt-2 font-medium">
                ⏱ Banned for {Math.ceil(banTimeRemaining / 1000)} second{Math.ceil(banTimeRemaining / 1000) !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Demo credentials: admin / admin123
        </p>
      </Card>
    </div>
  );
}
