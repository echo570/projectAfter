import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Plus, LogOut, Users, Activity, BarChart3, Ban, TrendingUp, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
  const [bannedIPs, setBannedIPs] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [newBanIP, setNewBanIP] = useState("");
  const [newBanReason, setNewBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("30");
  const [fakeUserMin, setFakeUserMin] = useState("0");
  const [fakeUserMax, setFakeUserMax] = useState("0");
  const [fakeUserEnabled, setFakeUserEnabled] = useState(false);
  const [fakeBotsEnabled, setFakeBotsEnabled] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setLocation("/admin/login");
      return;
    }
    // Load all data once on mount
    loadInitialData();
    // Periodically refresh only analytics and monitoring (not user-editable settings)
    const interval = setInterval(loadLiveData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    loadInterests();
    loadBans();
    loadMonitoring();
    loadAnalytics();
    loadFakeUserSettings();
  };

  const loadLiveData = async () => {
    loadBans();
    loadMonitoring();
    loadAnalytics();
  };

  const loadFakeUserSettings = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/fake-users");
      const data = await response.json();
      setFakeUserMin(data.minUsers.toString());
      setFakeUserMax(data.maxUsers.toString());
      setFakeUserEnabled(data.enabled);
    } catch (error) {
      console.error("Failed to load fake user settings");
    }
    
    try {
      const response = await apiRequest("GET", "/api/admin/fake-bots");
      const data = await response.json();
      setFakeBotsEnabled(data.enabled);
    } catch (error) {
      console.error("Failed to load fake bots settings");
    }
    
    try {
      const response = await apiRequest("GET", "/api/admin/maintenance");
      const data = await response.json();
      setMaintenanceEnabled(data.enabled);
      setMaintenanceReason(data.reason);
    } catch (error) {
      console.error("Failed to load maintenance settings");
    }
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
      setBannedUsers(data.bannedUsers || []);
      setBannedIPs(data.bannedIPs || []);
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

  const handleBanIP = async () => {
    if (!newBanIP.trim() || !newBanReason.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/admin/ban-ip", {
        ipAddress: newBanIP,
        reason: newBanReason,
        durationDays: parseInt(banDuration) || 30,
      });
      setNewBanIP("");
      setNewBanReason("");
      setBanDuration("30");
      toast({ title: "Success", description: "IP banned successfully" });
      loadBans();
    } catch (error) {
      toast({ title: "Error", description: "Failed to ban IP", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnbanIP = async (ipAddress: string) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/admin/unban-ip", { ipAddress });
      toast({ title: "Success", description: "IP unbanned successfully" });
      loadBans();
    } catch (error) {
      toast({ title: "Error", description: "Failed to unban IP", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFakeUsers = async () => {
    const min = parseInt(fakeUserMin);
    const max = parseInt(fakeUserMax);

    if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
      toast({ title: "Error", description: "Please enter valid numbers (min ≤ max)", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/admin/fake-users", {
        minUsers: min,
        maxUsers: max,
        enabled: fakeUserEnabled,
      });
      toast({ title: "Success", description: "Fake user settings updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFakeBots = async () => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/admin/fake-bots", {
        enabled: !fakeBotsEnabled,
      });
      setFakeBotsEnabled(!fakeBotsEnabled);
      toast({ title: "Success", description: `Fake bots ${!fakeBotsEnabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!maintenanceEnabled && !maintenanceReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason for maintenance", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/admin/maintenance", {
        enabled: !maintenanceEnabled,
        reason: maintenanceReason.trim(),
      });
      setMaintenanceEnabled(!maintenanceEnabled);
      toast({ 
        title: "Success", 
        description: `Site is now ${!maintenanceEnabled ? 'under maintenance' : 'back online'}`,
        variant: maintenanceEnabled ? undefined : "destructive"
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update maintenance mode", variant: "destructive" });
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

        {/* Maintenance Mode */}
        <Card className="p-6 mt-6 border-destructive/50">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <h2 className="text-2xl font-bold">Maintenance Mode</h2>
          </div>

          <div className="p-4 bg-destructive/10 rounded-lg space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Take the site offline and show users a maintenance message. This will block all new connections.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-2">Maintenance Reason</label>
                <Textarea
                  value={maintenanceReason}
                  onChange={(e) => setMaintenanceReason(e.target.value)}
                  placeholder="e.g., Server maintenance, database updates, security patch..."
                  disabled={isLoading}
                  className="resize-none"
                  data-testid="textarea-maintenance-reason"
                />
              </div>
              <Button
                onClick={handleToggleMaintenance}
                disabled={isLoading}
                className="w-full"
                variant={maintenanceEnabled ? "destructive" : "outline"}
                data-testid="button-toggle-maintenance"
              >
                {maintenanceEnabled ? 'Site is Offline' : 'Site is Online'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Fake Bots Settings */}
        <Card className="p-6 mt-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Fake Bot Matching</h2>
          </div>

          <div className="p-4 bg-secondary rounded-lg space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Automatically match waiting users with fake bots after 30 seconds of waiting. This prevents users from waiting too long.
            </p>
            <Button
              onClick={handleToggleFakeBots}
              disabled={isLoading}
              className="w-full"
              variant={fakeBotsEnabled ? "default" : "outline"}
              data-testid="button-toggle-fake-bots"
            >
              {fakeBotsEnabled ? 'Fake Bots Enabled' : 'Fake Bots Disabled'}
            </Button>
          </div>
        </Card>

        {/* Fake User Count Settings */}
        <Card className="p-6 mt-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Fake User Count Display</h2>
          </div>

          <div className="p-4 bg-secondary rounded-lg space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={fakeUserEnabled}
                onChange={(e) => setFakeUserEnabled(e.target.checked)}
                className="w-5 h-5"
                data-testid="checkbox-fake-users"
              />
              <label className="text-sm font-medium">Enable Fake User Count Display</label>
            </div>

            {fakeUserEnabled && (
              <div className="space-y-3 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Users</label>
                  <Input
                    type="number"
                    value={fakeUserMin}
                    onChange={(e) => setFakeUserMin(e.target.value)}
                    placeholder="Minimum user count"
                    min="0"
                    data-testid="input-fake-min"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Maximum Users</label>
                  <Input
                    type="number"
                    value={fakeUserMax}
                    onChange={(e) => setFakeUserMax(e.target.value)}
                    placeholder="Maximum user count"
                    min="0"
                    data-testid="input-fake-max"
                    disabled={isLoading}
                  />
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  The user count displayed on the landing page will randomly jump between the min and max values.
                </p>
              </div>
            )}

            <Button
              onClick={handleUpdateFakeUsers}
              disabled={isLoading}
              className="w-full mt-4"
              data-testid="button-update-fake-users"
            >
              Update Settings
            </Button>
          </div>
        </Card>

        {/* Ban Management Section */}
        <Card className="p-6 mt-6">
          <div className="flex items-center gap-2 mb-6">
            <Ban className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Ban Management</h2>
          </div>

          {/* Ban IP (Primary for anonymous users) */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Ban by IP Address</h3>
            <div className="p-4 bg-secondary rounded-lg">
              <div className="space-y-3">
                <Input
                  type="text"
                  value={newBanIP}
                  onChange={(e) => setNewBanIP(e.target.value)}
                  placeholder="IP address to ban (e.g., 192.168.1.1)"
                  data-testid="input-ban-ip"
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
                <div>
                  <label className="block text-sm font-medium mb-2">Ban Duration (days)</label>
                  <Input
                    type="number"
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value)}
                    placeholder="30"
                    min="1"
                    max="365"
                    data-testid="input-ban-duration"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={handleBanIP}
                  disabled={isLoading}
                  className="w-full"
                  data-testid="button-ban-ip"
                >
                  Ban IP Address
                </Button>
              </div>
            </div>

            {/* Banned IPs List */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-3">Banned IP Addresses ({bannedIPs.length})</label>
              {bannedIPs.length > 0 ? (
                <div className="space-y-2">
                  {bannedIPs.map((ban) => (
                    <div key={ban.ipAddress} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div>
                        <p className="font-mono text-sm font-semibold">{ban.ipAddress}</p>
                        <p className="text-xs text-muted-foreground">{ban.reason}</p>
                        {ban.expiresAt && (
                          <p className="text-xs text-muted-foreground">
                            Expires: {new Date(ban.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnbanIP(ban.ipAddress)}
                        disabled={isLoading}
                        data-testid={`button-unban-ip-${ban.ipAddress}`}
                      >
                        Unban
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No banned IPs</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
