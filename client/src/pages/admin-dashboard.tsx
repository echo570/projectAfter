import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Plus, LogOut, Users, Activity, BarChart3, Ban } from "lucide-react";

interface Interest {
  name: string;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [newBanUserId, setNewBanUserId] = useState("");
  const [newBanReason, setNewBanReason] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setLocation("/admin/login");
      return;
    }
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    loadInterests();
    loadBans();
    loadMonitoring();
    loadAnalytics();
  };

  const loadInterests = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/interests");
      const data = await response.json();
      setInterests(data.interests || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load interests",
        variant: "destructive",
      });
    }
  };

  const handleAddInterest = async () => {
    if (!newInterest.trim()) {
      toast({
        title: "Error",
        description: "Interest cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (interests.includes(newInterest.trim())) {
      toast({
        title: "Error",
        description: "This interest already exists",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const updated = [...interests, newInterest.trim()];
      await apiRequest("POST", "/api/admin/interests", { interests: updated });
      setInterests(updated);
      setNewInterest("");
      toast({
        title: "Success",
        description: "Interest added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add interest",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveInterest = async (interest: string) => {
    setIsLoading(true);
    try {
      const updated = interests.filter((i) => i !== interest);
      await apiRequest("POST", "/api/admin/interests", { interests: updated });
      setInterests(updated);
      toast({
        title: "Success",
        description: "Interest removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove interest",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBans = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/bans");
      const data = await response.json();
      setBannedUsers(data.banned || []);
    } catch (error) {
      console.error("Failed to load bans");
    }
  };

  const loadMonitoring = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/monitoring");
      const data = await response.json();
      setActiveSessions(data.sessions || []);
    } catch (error) {
      console.error("Failed to load sessions");
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/analytics");
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to load analytics");
    }
  };

  const handleBanUser = async () => {
    if (!newBanUserId.trim() || !newBanReason.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/admin/ban", { userId: newBanUserId, reason: newBanReason });
      setNewBanUserId("");
      setNewBanReason("");
      toast({ title: "Success", description: "User banned successfully" });
      loadBans();
    } catch (error) {
      toast({ title: "Error", description: "Failed to ban user", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnban = async (userId: string) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/admin/unban", { userId });
      toast({ title: "Success", description: "User unbanned successfully" });
      loadBans();
    } catch (error) {
      toast({ title: "Error", description: "Failed to unban user", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage site settings and content</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Interests Management */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Manage Interests</h2>

          {/* Add New Interest */}
          <div className="mb-8">
            <label className="block text-sm font-medium mb-3">Add New Interest</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Enter interest name (e.g., Anime, Gardening)"
                onKeyPress={(e) => e.key === "Enter" && handleAddInterest()}
                data-testid="input-new-interest"
                disabled={isLoading}
              />
              <Button
                onClick={handleAddInterest}
                disabled={isLoading}
                data-testid="button-add-interest"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Current Interests */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Current Interests ({interests.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Badge
                  key={interest}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-2"
                  data-testid={`badge-interest-${interest}`}
                >
                  {interest}
                  <button
                    onClick={() => handleRemoveInterest(interest)}
                    disabled={isLoading}
                    className="ml-1 hover:opacity-70"
                    data-testid={`button-remove-interest-${interest}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {interests.length === 0 && (
              <p className="text-muted-foreground text-sm">No interests added yet</p>
            )}
          </div>
        </Card>

        {/* Analytics Section */}
        {analytics && (
          <Card className="p-6 mt-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Site Analytics</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">Online Users</p>
                <p className="text-3xl font-bold">{analytics.totalOnline}</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">Waiting</p>
                <p className="text-3xl font-bold">{analytics.waiting}</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">In Chat</p>
                <p className="text-3xl font-bold">{analytics.inChat}</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-3xl font-bold">{analytics.totalSessions}</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">Banned Users</p>
                <p className="text-3xl font-bold">{analytics.totalBanned}</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-3xl font-bold">{analytics.avgSessionDuration}s</p>
              </div>
            </div>
          </Card>
        )}

        {/* Chat Monitoring Section */}
        <Card className="p-6 mt-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Chat Monitoring</h2>
          </div>
          {activeSessions.length > 0 ? (
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div key={session.sessionId} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <p className="font-semibold text-sm">Session: {session.sessionId.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground">Duration: {Math.round(session.duration / 1000)}s</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No active chat sessions</p>
          )}
        </Card>

        {/* Ban Management Section */}
        <Card className="p-6 mt-6">
          <div className="flex items-center gap-2 mb-6">
            <Ban className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Ban Management</h2>
          </div>

          <div className="mb-8 p-4 bg-secondary rounded-lg">
            <label className="block text-sm font-medium mb-3">Ban a User</label>
            <div className="space-y-3">
              <Input
                type="text"
                value={newBanUserId}
                onChange={(e) => setNewBanUserId(e.target.value)}
                placeholder="User ID to ban"
                data-testid="input-ban-userid"
                disabled={isLoading}
              />
              <Input
                type="text"
                value={newBanReason}
                onChange={(e) => setNewBanReason(e.target.value)}
                placeholder="Reason for ban"
                data-testid="input-ban-reason"
                disabled={isLoading}
              />
              <Button
                onClick={handleBanUser}
                disabled={isLoading}
                className="w-full"
                data-testid="button-ban-user"
              >
                Ban User
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Banned Users ({bannedUsers.length})</label>
            {bannedUsers.length > 0 ? (
              <div className="space-y-2">
                {bannedUsers.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-mono text-sm">{user.userId.slice(0, 12)}...</p>
                      <p className="text-xs text-muted-foreground">{user.reason}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnban(user.userId)}
                      disabled={isLoading}
                      data-testid={`button-unban-${user.userId}`}
                    >
                      Unban
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No banned users</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
