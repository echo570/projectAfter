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
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBanned, setIsBanned] = useState(false);
  const [banTimeRemaining, setBanTimeRemaining] = useState(0);

  console.log("AdminLogin component loaded");

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '28rem', padding: '2rem', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#000000' }}>Admin Panel</h1>
        <p style={{ color: '#666666', marginBottom: '1.5rem' }}>Sign in to manage the site</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#000000' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              data-testid="input-admin-username"
              style={{ width: '100%', padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#000000', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#000000' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              data-testid="input-admin-password"
              style={{ width: '100%', padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#000000', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            data-testid="button-admin-login"
            style={{ width: '100%', padding: '0.5rem', backgroundColor: '#000000', color: '#ffffff', border: 'none', borderRadius: '0.375rem', fontWeight: '500', cursor: 'pointer' }}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {(failedAttempts > 0 || isBanned) && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#b91c1c' }}>
              {failedAttempts === 1 
                ? "1 failed attempt since last successful login"
                : `${failedAttempts} failed attempts since last successful login`}
            </p>
            {isBanned && (
              <p style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.5rem', fontWeight: '500' }}>
                ⏱ Banned for {Math.ceil(banTimeRemaining / 1000)} second{Math.ceil(banTimeRemaining / 1000) !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        <p style={{ fontSize: '0.75rem', color: '#666666', marginTop: '1.5rem', textAlign: 'center' }}>
          Demo credentials: admin / admin123
        </p>
      </div>
    </div>
  );
}
