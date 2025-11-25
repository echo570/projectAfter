import type { ChatSession, UserState, Admin, AdminSession, BannedUser, BannedIP, ChatMonitoringSession, SiteAnalytics } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private sessions: Map<string, ChatSession>;
  private userStates: Map<string, UserState>;
  private adminSessions: Map<string, AdminSession>;
  private admins: Map<string, Admin>;
  private interests: string[];
  private bannedUsers: Map<string, BannedUser>;
  private bannedIPs: Map<string, BannedIP>;
  private sessionDurations: { sessionId: string; duration: number }[];

  constructor() {
    this.sessions = new Map();
    this.userStates = new Map();
    this.adminSessions = new Map();
    this.admins = new Map();
    this.bannedUsers = new Map();
    this.bannedIPs = new Map();
    this.sessionDurations = [];
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
}

export const storage = new MemStorage();
