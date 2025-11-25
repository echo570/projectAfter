import type { ChatSession, UserState, Admin, AdminSession, BannedUser, BannedIP, Report, ChatMonitoringSession, SiteAnalytics } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createSession(user1Id: string, user2Id: string): Promise<ChatSession>;
  getSession(sessionId: string): Promise<ChatSession | undefined>;
  endSession(sessionId: string): Promise<void>;
  getUserState(userId: string): Promise<UserState | undefined>;
  setUserState(userId: string, state: UserState): Promise<void>;
  removeUserState(userId: string): Promise<void>;
  getAllWaitingUsers(): Promise<UserState[]>;
  // Admin methods
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdminSession(adminId: string): Promise<AdminSession>;
  getAdminSession(token: string): Promise<AdminSession | undefined>;
  getInterests(): Promise<string[]>;
  setInterests(interests: string[]): Promise<void>;
  // Ban management
  banUser(userId: string, reason: string, adminId: string): Promise<void>;
  unbanUser(userId: string): Promise<void>;
  getBannedUsers(): Promise<BannedUser[]>;
  isUserBanned(userId: string): Promise<boolean>;
  // Chat monitoring
  getAllActiveSessions(): Promise<ChatMonitoringSession[]>;
  // Analytics
  getAnalytics(): Promise<SiteAnalytics>;
  // IP-based bans
  banIP(ipAddress: string, reason: string, adminId: string, durationDays?: number): Promise<void>;
  unbanIP(ipAddress: string): Promise<void>;
  getBannedIPs(): Promise<BannedIP[]>;
  isIPBanned(ipAddress: string): Promise<boolean>;
  // Reporting system
  addReport(reportedUserId: string, reportedIP: string, reporterUserId: string, reason: string): Promise<void>;
  getReportCountInLast24Hours(ipAddress: string): Promise<number>;
  getReports(): Promise<Report[]>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, ChatSession>;
  private userStates: Map<string, UserState>;
  private adminSessions: Map<string, AdminSession>;
  private admins: Map<string, Admin>;
  private interests: string[];
  private bannedUsers: Map<string, BannedUser>;
  private bannedIPs: Map<string, BannedIP>;
  private reports: Report[];
  private sessionDurations: { sessionId: string; duration: number }[];
  private fakeUserCountSettings: { minUsers: number; maxUsers: number; enabled: boolean };
  private fakeBotsEnabled: boolean;
  private maintenanceMode: { enabled: boolean; reason: string };

  constructor() {
    this.sessions = new Map();
    this.userStates = new Map();
    this.adminSessions = new Map();
    this.admins = new Map();
    this.bannedUsers = new Map();
    this.bannedIPs = new Map();
    this.reports = [];
    this.sessionDurations = [];
    this.fakeUserCountSettings = { minUsers: 0, maxUsers: 0, enabled: false };
    this.fakeBotsEnabled = false;
    this.maintenanceMode = { enabled: false, reason: '' };
    this.interests = [
      'Gaming', 'Music', 'Movies', 'Sports', 'Travel', 'Tech', 'Art', 'Books',
      'Fitness', 'Food', 'Photography', 'Cooking', 'Fashion', 'DIY', 'Pets',
      'Crypto', 'Business', 'Science', 'History', 'Comedy',
    ];
    
    // Initialize default admin (username: admin, password: admin123)
    this.admins.set('admin', {
      id: 'admin-1',
      username: 'admin',
      passwordHash: 'admin123', // In production, use proper hashing
    });
  }

  async createSession(user1Id: string, user2Id: string): Promise<ChatSession> {
    const session: ChatSession = {
      id: randomUUID(),
      user1Id,
      user2Id,
      status: 'active',
      startedAt: Date.now(),
      endedAt: null,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(sessionId: string): Promise<ChatSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'ended';
      session.endedAt = Date.now();
    }
  }

  async getUserState(userId: string): Promise<UserState | undefined> {
    return this.userStates.get(userId);
  }

  async setUserState(userId: string, state: UserState): Promise<void> {
    this.userStates.set(userId, state);
  }

  async removeUserState(userId: string): Promise<void> {
    this.userStates.delete(userId);
  }

  async getAllWaitingUsers(): Promise<UserState[]> {
    return Array.from(this.userStates.values()).filter(
      (state) => state.status === 'waiting'
    );
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    return this.admins.get(username);
  }

  async createAdminSession(adminId: string): Promise<AdminSession> {
    const session: AdminSession = {
      id: randomUUID(),
      adminId,
      token: randomUUID(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
    this.adminSessions.set(session.token, session);
    return session;
  }

  async getAdminSession(token: string): Promise<AdminSession | undefined> {
    const session = this.adminSessions.get(token);
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
    if (session) {
      this.adminSessions.delete(token);
    }
    return undefined;
  }

  async getInterests(): Promise<string[]> {
    return [...this.interests];
  }

  async setInterests(interests: string[]): Promise<void> {
    this.interests = [...interests];
  }

  async banUser(userId: string, reason: string, adminId: string): Promise<void> {
    const ban: BannedUser = {
      id: randomUUID(),
      userId,
      reason,
      bannedAt: Date.now(),
      bannedBy: adminId,
    };
    this.bannedUsers.set(userId, ban);
  }

  async unbanUser(userId: string): Promise<void> {
    this.bannedUsers.delete(userId);
  }

  async getBannedUsers(): Promise<BannedUser[]> {
    return Array.from(this.bannedUsers.values());
  }

  async isUserBanned(userId: string): Promise<boolean> {
    return this.bannedUsers.has(userId);
  }

  async getAllActiveSessions(): Promise<ChatMonitoringSession[]> {
    const active: ChatMonitoringSession[] = [];
    this.sessions.forEach((session) => {
      if (session.status === 'active') {
        active.push({
          sessionId: session.id,
          user1Id: session.user1Id,
          user2Id: session.user2Id,
          status: session.status,
          startedAt: session.startedAt,
          duration: Date.now() - session.startedAt,
        });
      }
    });
    return active;
  }

  async getAnalytics(): Promise<SiteAnalytics> {
    const allUsers = Array.from(this.userStates.values());
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.status === 'active');
    const avgDuration = this.sessionDurations.length > 0
      ? this.sessionDurations.reduce((sum, s) => sum + s.duration, 0) / this.sessionDurations.length
      : 0;

    return {
      totalOnline: allUsers.length,
      waiting: allUsers.filter(u => u.status === 'waiting').length,
      inChat: allUsers.filter(u => u.status === 'in-chat').length,
      totalSessions: this.sessions.size,
      totalBanned: this.bannedUsers.size + this.bannedIPs.size,
      avgSessionDuration: Math.round(avgDuration / 1000),
      peakTime: new Date().toLocaleTimeString(),
    };
  }

  async banIP(ipAddress: string, reason: string, adminId: string, durationDays: number = 30): Promise<void> {
    const ban: BannedIP = {
      id: randomUUID(),
      ipAddress,
      reason,
      bannedAt: Date.now(),
      bannedBy: adminId,
      expiresAt: Date.now() + durationDays * 24 * 60 * 60 * 1000,
    };
    this.bannedIPs.set(ipAddress, ban);
  }

  async unbanIP(ipAddress: string): Promise<void> {
    this.bannedIPs.delete(ipAddress);
  }

  async getBannedIPs(): Promise<BannedIP[]> {
    const now = Date.now();
    const banned: BannedIP[] = [];
    
    this.bannedIPs.forEach((ban) => {
      if (!ban.expiresAt || ban.expiresAt > now) {
        banned.push(ban);
      } else {
        this.bannedIPs.delete(ban.ipAddress);
      }
    });
    
    return banned;
  }

  async isIPBanned(ipAddress: string): Promise<boolean> {
    const ban = this.bannedIPs.get(ipAddress);
    if (!ban) return false;
    
    if (ban.expiresAt && ban.expiresAt <= Date.now()) {
      this.bannedIPs.delete(ipAddress);
      return false;
    }
    
    return true;
  }

  async addReport(reportedUserId: string, reportedIP: string, reporterUserId: string, reason: string): Promise<void> {
    const report: Report = {
      id: randomUUID(),
      reportedUserId,
      reportedIP,
      reporterUserId,
      reason,
      reportedAt: Date.now(),
    };
    this.reports.push(report);
  }

  async getReportCountInLast24Hours(ipAddress: string): Promise<number> {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    return this.reports.filter(r => r.reportedIP === ipAddress && r.reportedAt > oneDayAgo).length;
  }

  async getReports(): Promise<Report[]> {
    return this.reports;
  }

  async setFakeUserCountSettings(minUsers: number, maxUsers: number, enabled: boolean): Promise<void> {
    this.fakeUserCountSettings = { minUsers, maxUsers, enabled };
  }

  async getFakeUserCountSettings(): Promise<{ minUsers: number; maxUsers: number; enabled: boolean }> {
    return this.fakeUserCountSettings;
  }

  async getDisplayUserCount(): Promise<number> {
    const actualCount = Array.from(this.userStates.values()).length;
    
    if (!this.fakeUserCountSettings.enabled) {
      return actualCount;
    }

    const { minUsers, maxUsers } = this.fakeUserCountSettings;
    return Math.floor(Math.random() * (maxUsers - minUsers + 1)) + minUsers;
  }

  async setFakeBotsEnabled(enabled: boolean): Promise<void> {
    this.fakeBotsEnabled = enabled;
  }

  async getFakeBotsEnabled(): Promise<boolean> {
    return this.fakeBotsEnabled;
  }

  async setMaintenanceMode(enabled: boolean, reason: string): Promise<void> {
    this.maintenanceMode = { enabled, reason };
  }

  async getMaintenanceMode(): Promise<{ enabled: boolean; reason: string }> {
    return this.maintenanceMode;
  }
}

export const storage = new MemStorage();
