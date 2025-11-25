import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type UserStatus = 'idle' | 'waiting' | 'in-chat';
export type ChatSessionStatus = 'active' | 'ended';
export type Gender = 'male' | 'female' | 'other';

export interface UserProfile {
  nickname: string;
  gender: Gender;
  age: number;
  country: string;
  countryFlag: string;
}

export const DEFAULT_INTERESTS = [
  'Gaming',
  'Music',
  'Movies',
  'Sports',
  'Travel',
  'Tech',
  'Art',
  'Books',
  'Fitness',
  'Food',
  'Photography',
  'Cooking',
  'Fashion',
  'DIY',
  'Pets',
  'Crypto',
  'Business',
  'Science',
  'History',
  'Comedy',
];

export let INTERESTS_LIST = [...DEFAULT_INTERESTS];

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: text("user1_id").notNull(),
  user2Id: text("user2_id").notNull(),
  status: text("status").$type<ChatSessionStatus>().notNull().default('active'),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  endedAt: bigint("ended_at", { mode: "number" }),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
});

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

export interface Message {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  timestamp: number;
}

export interface UserState {
  id: string;
  status: UserStatus;
  sessionId?: string;
  interests: string[];
  connectedAt: number;
}

export const messageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export type InsertMessage = z.infer<typeof messageSchema>;

export const userInterestsSchema = z.object({
  interests: z.array(z.string()).min(1).max(5),
});

export type UserInterests = z.infer<typeof userInterestsSchema>;

export const userProfileSchema = z.object({
  nickname: z.string().min(1).max(20),
  gender: z.enum(['male', 'female', 'other']),
  age: z.number().min(13).max(120),
  interests: z.array(z.string()).min(1).max(5),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;

export interface OnlineStats {
  totalOnline: number;
  waiting: number;
  inChat: number;
}

export interface Admin {
  id: string;
  username: string;
  passwordHash: string;
}

export interface AdminSession {
  id: string;
  adminId: string;
  token: string;
  expiresAt: number;
}

export interface BannedUser {
  id: string;
  userId: string;
  reason: string;
  bannedAt: number;
  bannedBy: string;
}

export interface BannedIP {
  id: string;
  ipAddress: string;
  reason: string;
  bannedAt: number;
  bannedBy: string;
  expiresAt?: number;
}

export interface Report {
  id: string;
  reportedUserId: string;
  reportedIP: string;
  reporterUserId: string;
  reason: string;
  reportedAt: number;
}

export interface ChatMonitoringSession {
  sessionId: string;
  user1Id: string;
  user2Id: string;
  status: string;
  startedAt: number;
  duration: number;
}

export interface SiteAnalytics {
  totalOnline: number;
  waiting: number;
  inChat: number;
  totalSessions: number;
  totalBanned: number;
  avgSessionDuration: number;
  peakTime: string;
}

export interface FakeUserCountSettings {
  minUsers: number;
  maxUsers: number;
  enabled: boolean;
}

export interface WebSocketMessage {
  type: 'find-match' | 'message' | 'typing' | 'match' | 'end' | 'partner-disconnected' | 'offer' | 'answer' | 'ice-candidate' | 'set-interests' | 'report-user' | 'set-profile';
  data?: any;
}

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type AdminLogin = z.infer<typeof adminLoginSchema>;
