import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type UserStatus = 'idle' | 'waiting' | 'in-chat';
export type ChatSessionStatus = 'active' | 'ended';

export const INTERESTS_LIST = [
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

export interface OnlineStats {
  totalOnline: number;
  waiting: number;
  inChat: number;
}

export interface WebSocketMessage {
  type: 'find-match' | 'message' | 'typing' | 'match' | 'end' | 'partner-disconnected' | 'offer' | 'answer' | 'ice-candidate' | 'set-interests';
  data?: any;
}
