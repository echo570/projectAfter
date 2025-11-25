import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import type { WebSocketMessage, OnlineStats, AdminLogin } from "@shared/schema";
import { adminLoginSchema } from "@shared/schema";
import { randomUUID } from "crypto";

let activeSessions: Map<string, { user1Id: string; user2Id: string; startedAt: number }> = new Map();

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  sessionId?: string;
  partnerId?: string;
  recentPartnerId?: string;
  recentPartnerTime?: number;
  interests: string[];
}

const clients = new Map<string, ConnectedClient>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  setInterval(() => {
    processWaitingQueue();
  }, 2000);

  wss.on('connection', (ws: WebSocket) => {
    const userId = randomUUID();
    const client: ConnectedClient = { ws, userId, interests: [] };
    clients.set(userId, client);

    storage.setUserState(userId, {
      id: userId,
      status: 'idle',
      interests: [],
      connectedAt: Date.now(),
    });

    console.log(`User ${userId} connected. Total users: ${clients.size}`);

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        await handleMessage(userId, message);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    ws.on('close', async () => {
      await handleDisconnect(userId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
    });
  });

  async function handleMessage(userId: string, message: WebSocketMessage) {
    const client = clients.get(userId);
    if (!client) return;

    switch (message.type) {
      case 'find-match':
        await findMatch(userId);
        break;

      case 'set-interests':
        const client = clients.get(userId);
        if (client) {
          client.interests = message.data.interests || [];
          await storage.setUserState(userId, {
            id: userId,
            status: 'idle',
            interests: client.interests,
            connectedAt: Date.now(),
          });
        }
        break;

      case 'message':
        await broadcastMessage(userId, message.data.content);
        break;

      case 'typing':
        await broadcastTyping(userId, message.data.isTyping);
        break;

      case 'end':
        await endSession(userId, message.data?.requeue || false);
        break;

      case 'offer':
      case 'answer':
      case 'ice-candidate':
        await relaySignaling(userId, message);
        break;
    }
  }

  async function processWaitingQueue() {
    const waitingUsers = await storage.getAllWaitingUsers();
    const processed = new Set<string>();
    
    for (const user of waitingUsers) {
      if (processed.has(user.id)) continue;
      
      const client = clients.get(user.id);
      if (!client || client.sessionId) continue;
      
      const match = await findMatchForUser(user.id);
      if (match) {
        processed.add(user.id);
        processed.add(match);
      }
    }
  }

  function calculateInterestMatch(interests1: string[], interests2: string[]): number {
    if (interests1.length === 0 || interests2.length === 0) return 0;
    const commonInterests = interests1.filter(i => interests2.includes(i));
    return commonInterests.length;
  }

  async function findMatchForUser(userId: string): Promise<string | null> {
    const client = clients.get(userId);
    if (!client) return null;

    const waitingUsers = await storage.getAllWaitingUsers();
    const GRACE_PERIOD_MS = 10000;
    const now = Date.now();
    
    const gracePeriodExpired = client.recentPartnerTime 
      ? (now - client.recentPartnerTime) > GRACE_PERIOD_MS
      : true;
    
    const validCandidates = waitingUsers.filter(u => {
      if (u.id === userId) return false;
      
      const otherClient = clients.get(u.id);
      if (!otherClient || otherClient.sessionId) return false;
      
      const isRecentPartner = u.id === client.recentPartnerId;
      const isMyRecentPartner = otherClient.recentPartnerId === userId;
      
      if (!isRecentPartner && !isMyRecentPartner) {
        return true;
      }
      
      if (gracePeriodExpired && otherClient.recentPartnerTime) {
        const otherGracePeriodExpired = (now - otherClient.recentPartnerTime) > GRACE_PERIOD_MS;
        return otherGracePeriodExpired;
      }
      
      return false;
    });

    const otherWaitingUser = validCandidates.length > 0
      ? validCandidates.sort((a, b) => {
          const matchA = calculateInterestMatch(client.interests, a.interests);
          const matchB = calculateInterestMatch(client.interests, b.interests);
          return matchB - matchA;
        })[0]
      : undefined;

    if (otherWaitingUser) {
      const partnerId = otherWaitingUser.id;
      const partner = clients.get(partnerId);

      if (partner && partner.ws.readyState === WebSocket.OPEN) {
        const session = await storage.createSession(userId, partnerId);

        client.sessionId = session.id;
        client.partnerId = partnerId;
        client.recentPartnerId = undefined;
        client.recentPartnerTime = undefined;
        
        partner.sessionId = session.id;
        partner.partnerId = userId;
        partner.recentPartnerId = undefined;
        partner.recentPartnerTime = undefined;

        await storage.setUserState(userId, {
          id: userId,
          status: 'in-chat',
          sessionId: session.id,
          interests: client.interests,
          connectedAt: Date.now(),
        });

        await storage.setUserState(partnerId, {
          id: partnerId,
          status: 'in-chat',
          sessionId: session.id,
          interests: partner.interests,
          connectedAt: Date.now(),
        });

        sendToClient(userId, {
          type: 'match',
          data: { sessionId: session.id, initiator: true },
        });

        sendToClient(partnerId, {
          type: 'match',
          data: { sessionId: session.id, initiator: false },
        });

        console.log(`Matched users ${userId} and ${partnerId} in session ${session.id}`);
        return partnerId;
      } else {
        await storage.removeUserState(partnerId);
      }
    }
    
    return null;
  }

  async function findMatch(userId: string) {
    const client = clients.get(userId);
    if (!client) return;

    await storage.setUserState(userId, {
      id: userId,
      status: 'waiting',
      interests: client.interests,
      connectedAt: Date.now(),
    });

    await findMatchForUser(userId);
  }

  async function broadcastMessage(senderId: string, content: string) {
    const sender = clients.get(senderId);
    if (!sender || !sender.partnerId) return;

    const partner = clients.get(sender.partnerId);
    if (partner && partner.ws.readyState === WebSocket.OPEN) {
      sendToClient(sender.partnerId, {
        type: 'message',
        data: { content },
      });
    }
  }

  async function broadcastTyping(senderId: string, isTyping: boolean) {
    const sender = clients.get(senderId);
    if (!sender || !sender.partnerId) return;

    const partner = clients.get(sender.partnerId);
    if (partner && partner.ws.readyState === WebSocket.OPEN) {
      sendToClient(sender.partnerId, {
        type: 'typing',
        data: { isTyping },
      });
    }
  }

  async function relaySignaling(senderId: string, message: WebSocketMessage) {
    const sender = clients.get(senderId);
    if (!sender || !sender.partnerId) return;

    const partner = clients.get(sender.partnerId);
    if (partner && partner.ws.readyState === WebSocket.OPEN) {
      sendToClient(sender.partnerId, message);
    }
  }

  async function endSession(userId: string, shouldRequeue: boolean = false) {
    const client = clients.get(userId);
    if (!client) return;

    if (client.sessionId) {
      await storage.endSession(client.sessionId);
    }

    const currentPartnerId = client.partnerId;

    if (currentPartnerId) {
      const partner = clients.get(currentPartnerId);
      if (partner) {
        sendToClient(currentPartnerId, {
          type: 'partner-disconnected',
        });
        
        partner.recentPartnerId = userId;
        partner.recentPartnerTime = Date.now();
        partner.sessionId = undefined;
        partner.partnerId = undefined;
        
        if (shouldRequeue) {
          await storage.setUserState(currentPartnerId, {
            id: currentPartnerId,
            status: 'waiting',
            interests: partner.interests,
            connectedAt: Date.now(),
          });
        } else {
          await storage.setUserState(currentPartnerId, {
            id: currentPartnerId,
            status: 'idle',
            interests: partner.interests,
            connectedAt: Date.now(),
          });
        }
      }
    }

    client.recentPartnerId = currentPartnerId;
    client.recentPartnerTime = Date.now();
    client.sessionId = undefined;
    client.partnerId = undefined;
    
    if (shouldRequeue) {
      await storage.setUserState(userId, {
        id: userId,
        status: 'waiting',
        interests: client.interests,
        connectedAt: Date.now(),
      });
    } else {
      await storage.setUserState(userId, {
        id: userId,
        status: 'idle',
        interests: client.interests,
        connectedAt: Date.now(),
      });
    }
  }

  async function handleDisconnect(userId: string) {
    console.log(`User ${userId} disconnected`);

    const client = clients.get(userId);
    if (client) {
      if (client.partnerId) {
        const partner = clients.get(client.partnerId);
        if (partner && partner.ws.readyState === WebSocket.OPEN) {
          sendToClient(client.partnerId, {
            type: 'partner-disconnected',
          });
          partner.sessionId = undefined;
          partner.partnerId = undefined;
          
          await storage.setUserState(client.partnerId, {
            id: client.partnerId,
            status: 'idle',
            interests: partner.interests,
            connectedAt: Date.now(),
          });
        }
      }

      if (client.sessionId) {
        await storage.endSession(client.sessionId);
      }
    }

    clients.delete(userId);
    await storage.removeUserState(userId);

    console.log(`Total users after disconnect: ${clients.size}`);
  }

  function sendToClient(userId: string, message: WebSocketMessage) {
    const client = clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  app.get('/api/stats', async (req, res) => {
    const allUsers = Array.from(clients.values());
    const stats: OnlineStats = {
      totalOnline: clients.size,
      waiting: allUsers.filter(c => !c.sessionId).length,
      inChat: allUsers.filter(c => c.sessionId).length,
    };
    res.json(stats);
  });

  // Public endpoint to get available interests
  app.get('/api/interests', async (req, res) => {
    const interests = await storage.getInterests();
    res.json({ interests });
  });

  // Admin login endpoint
  app.post('/api/admin/login', async (req, res) => {
    try {
      const body = adminLoginSchema.parse(req.body);
      const admin = await storage.getAdminByUsername(body.username);
      
      // Simple password check (in production, use bcrypt)
      if (admin && admin.passwordHash === body.password) {
        const session = await storage.createAdminSession(admin.id);
        res.json({ token: session.token, adminId: admin.id });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      res.status(400).json({ error: 'Invalid request' });
    }
  });

  // Middleware to verify admin token
  const verifyAdmin = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.adminToken;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const session = await storage.getAdminSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    (req as any).adminId = session.adminId;
    next();
  };

  // Get interests (admin only)
  app.get('/api/admin/interests', verifyAdmin, async (req, res) => {
    const interests = await storage.getInterests();
    res.json({ interests });
  });

  // Update interests (admin only)
  app.post('/api/admin/interests', verifyAdmin, async (req, res) => {
    try {
      const { interests } = req.body;
      if (!Array.isArray(interests) || interests.some(i => typeof i !== 'string')) {
        return res.status(400).json({ error: 'Invalid interests format' });
      }
      
      await storage.setInterests(interests);
      res.json({ success: true, interests });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update interests' });
    }
  });

  // Ban management endpoints
  app.post('/api/admin/ban', verifyAdmin, async (req, res) => {
    try {
      const { userId, reason } = req.body;
      if (!userId || !reason) {
        return res.status(400).json({ error: 'Missing userId or reason' });
      }
      
      await storage.banUser(userId, reason, (req as any).adminId);
      
      const client = clients.get(userId);
      if (client) {
        client.ws.close();
        clients.delete(userId);
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to ban user' });
    }
  });

  app.post('/api/admin/unban', verifyAdmin, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }
      
      await storage.unbanUser(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unban user' });
    }
  });

  app.get('/api/admin/bans', verifyAdmin, async (req, res) => {
    try {
      const banned = await storage.getBannedUsers();
      res.json({ banned });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch banned users' });
    }
  });

  // Chat monitoring endpoints
  app.get('/api/admin/monitoring', verifyAdmin, async (req, res) => {
    try {
      const sessions = await storage.getAllActiveSessions();
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // Analytics endpoint
  app.get('/api/admin/analytics', verifyAdmin, async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  return httpServer;
}
