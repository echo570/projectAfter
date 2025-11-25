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
  ipAddress: string;
  waitStartTime?: number;
  isBot?: boolean;
  profile?: { nickname: string; gender: string; age: number; country: string; countryFlag: string };
}

function getCountryFromIP(ip: string): { country: string; flag: string } {
  const ipCountryMap: Record<string, { country: string; flag: string }> = {
    '127.0.0.1': { country: 'Local', flag: '🌐' },
    '::1': { country: 'Local', flag: '🌐' },
  };
  
  if (ipCountryMap[ip]) return ipCountryMap[ip];
  
  const countryFlags: Record<string, string> = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺', 'NZ': '🇳🇿',
    'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸', 'NL': '🇳🇱', 'BE': '🇧🇪', 'AT': '🇦🇹', 'CH': '🇨🇭',
    'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱', 'CZ': '🇨🇿', 'RU': '🇷🇺', 'UA': '🇺🇦',
    'JP': '🇯🇵', 'CN': '🇨🇳', 'IN': '🇮🇳', 'BR': '🇧🇷', 'MX': '🇲🇽', 'ZA': '🇿🇦', 'SG': '🇸🇬', 'HK': '🇭🇰',
    'TH': '🇹🇭', 'KR': '🇰🇷', 'PH': '🇵🇭', 'VN': '🇻🇳', 'MY': '🇲🇾', 'ID': '🇮🇩', 'TR': '🇹🇷', 'AE': '🇦🇪',
    'SA': '🇸🇦', 'IL': '🇮🇱', 'EG': '🇪🇬', 'NG': '🇳🇬', 'KE': '🇰🇪', 'GR': '🇬🇷', 'PT': '🇵🇹', 'IR': '🇮🇷',
    'PK': '🇵🇰', 'BD': '🇧🇩', 'LK': '🇱🇰', 'TW': '🇹🇼', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪',
  };
  
  return { country: 'Unknown', flag: '🌍' };
}

function generateRandomBotProfile() {
  const botNicknames = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Casey', 'Drew', 'Sam', 'Jamie', 'Skyler', 'Quinn', 'Avery', 'Blake', 'River', 'Dakota', 'Phoenix', 'Sage', 'Nova', 'Zen'];
  const genders = ['male', 'female', 'other'];
  const countries = [
    { name: 'United States', flag: '🇺🇸' }, { name: 'United Kingdom', flag: '🇬🇧' }, { name: 'Canada', flag: '🇨🇦' }, { name: 'Australia', flag: '🇦🇺' }, { name: 'New Zealand', flag: '🇳🇿' },
    { name: 'Germany', flag: '🇩🇪' }, { name: 'France', flag: '🇫🇷' }, { name: 'Italy', flag: '🇮🇹' }, { name: 'Spain', flag: '🇪🇸' }, { name: 'Netherlands', flag: '🇳🇱' }, { name: 'Belgium', flag: '🇧🇪' }, { name: 'Austria', flag: '🇦🇹' }, { name: 'Switzerland', flag: '🇨🇭' },
    { name: 'Sweden', flag: '🇸🇪' }, { name: 'Norway', flag: '🇳🇴' }, { name: 'Denmark', flag: '🇩🇰' }, { name: 'Finland', flag: '🇫🇮' }, { name: 'Poland', flag: '🇵🇱' }, { name: 'Czech Republic', flag: '🇨🇿' }, { name: 'Russia', flag: '🇷🇺' }, { name: 'Ukraine', flag: '🇺🇦' },
    { name: 'Japan', flag: '🇯🇵' }, { name: 'China', flag: '🇨🇳' }, { name: 'India', flag: '🇮🇳' }, { name: 'Brazil', flag: '🇧🇷' }, { name: 'Mexico', flag: '🇲🇽' }, { name: 'South Africa', flag: '🇿🇦' }, { name: 'Singapore', flag: '🇸🇬' }, { name: 'Hong Kong', flag: '🇭🇰' },
    { name: 'Thailand', flag: '🇹🇭' }, { name: 'South Korea', flag: '🇰🇷' }, { name: 'Philippines', flag: '🇵🇭' }, { name: 'Vietnam', flag: '🇻🇳' }, { name: 'Malaysia', flag: '🇲🇾' }, { name: 'Indonesia', flag: '🇮🇩' }, { name: 'Turkey', flag: '🇹🇷' }, { name: 'UAE', flag: '🇦🇪' },
    { name: 'Saudi Arabia', flag: '🇸🇦' }, { name: 'Israel', flag: '🇮🇱' }, { name: 'Egypt', flag: '🇪🇬' }, { name: 'Nigeria', flag: '🇳🇬' }, { name: 'Kenya', flag: '🇰🇪' }, { name: 'Greece', flag: '🇬🇷' }, { name: 'Portugal', flag: '🇵🇹' }, { name: 'Iran', flag: '🇮🇷' },
    { name: 'Pakistan', flag: '🇵🇰' }, { name: 'Bangladesh', flag: '🇧🇩' }, { name: 'Sri Lanka', flag: '🇱🇰' }, { name: 'Taiwan', flag: '🇹🇼' }, { name: 'Argentina', flag: '🇦🇷' }, { name: 'Chile', flag: '🇨🇱' }, { name: 'Colombia', flag: '🇨🇴' }, { name: 'Peru', flag: '🇵🇪' },
  ];
  
  const randomIndex = (max: number) => Math.floor(Math.random() * max);
  const nickname = botNicknames[randomIndex(botNicknames.length)];
  const gender = genders[randomIndex(genders.length)];
  const age = Math.floor(Math.random() * (50 - 18 + 1)) + 18;
  const country = countries[randomIndex(countries.length)];
  
  return {
    nickname,
    gender,
    age,
    country: country.name,
    countryFlag: country.flag,
  };
}

const clients = new Map<string, ConnectedClient>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  setInterval(() => {
    processWaitingQueue();
  }, 2000);

  wss.on('connection', async (ws: WebSocket, req) => {
    const userId = randomUUID();
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    
    // Check if site is in maintenance mode
    const maintenance = await storage.getMaintenanceMode();
    if (maintenance.enabled) {
      console.log(`Blocked user due to maintenance: ${ipAddress}`);
      ws.close(4003, `Site is under maintenance: ${maintenance.reason}`);
      return;
    }
    
    // Check if IP is banned
    const isBanned = await storage.isIPBanned(ipAddress);
    if (isBanned) {
      console.log(`Blocked banned IP: ${ipAddress}`);
      ws.close(4000, 'You have been banned from this service');
      return;
    }

    const client: ConnectedClient = { ws, userId, interests: [], ipAddress };
    clients.set(userId, client);

    storage.setUserState(userId, {
      id: userId,
      status: 'idle',
      interests: [],
      connectedAt: Date.now(),
    });

    console.log(`User ${userId} connected from ${ipAddress}. Total users: ${clients.size}`);

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

      case 'set-profile':
        const profileClient = clients.get(userId);
        if (profileClient && message.data) {
          const { country, flag } = getCountryFromIP(profileClient.ipAddress);
          profileClient.profile = {
            nickname: message.data.nickname,
            gender: message.data.gender,
            age: message.data.age,
            country,
            countryFlag: flag,
          };
          profileClient.interests = message.data.interests || [];
          await storage.setUserState(userId, {
            id: userId,
            status: 'idle',
            interests: profileClient.interests,
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

      case 'report-user':
        await handleReportUser(userId, message.data);
        break;
    }
  }

  async function handleReportUser(reporterId: string, data: any) {
    const reportedUserId = data.reportedUserId;
    const reportedClient = clients.get(reportedUserId);
    if (!reportedClient) return;

    const reportedIP = reportedClient.ipAddress;
    await storage.addReport(reportedUserId, reportedIP, reporterId, data.reason || 'Inappropriate behavior');

    const reportCount = await storage.getReportCountInLast24Hours(reportedIP);
    console.log(`User reported. IP: ${reportedIP}, Total reports in 24h: ${reportCount}`);

    if (reportCount > 6) {
      console.log(`Auto-banning IP ${reportedIP} for 30 minutes due to ${reportCount} reports`);
      await storage.banIP(reportedIP, 'Too many users reported bad behaviors', 'system', 30/1440);

      if (reportedClient.ws.readyState === WebSocket.OPEN) {
        reportedClient.ws.close(4000, 'You have been banned due to multiple reports');
      }
    }
  }

  async function processWaitingQueue() {
    const waitingUsers = await storage.getAllWaitingUsers();
    const processed = new Set<string>();
    
    for (const user of waitingUsers) {
      if (processed.has(user.id)) continue;
      
      const client = clients.get(user.id);
      if (!client || client.sessionId) continue;

      // Check if fake bots are enabled and user has been waiting >30 seconds
      const fakeBotsEnabled = await storage.getFakeBotsEnabled();
      const waitTime = Date.now() - (client.waitStartTime || 0);
      const WAIT_TIMEOUT_MS = 30000;

      if (fakeBotsEnabled && waitTime > WAIT_TIMEOUT_MS && !client.sessionId) {
        const botId = `bot-${randomUUID()}`;
        const botProfile = generateRandomBotProfile();
        const session = await storage.createSession(user.id, botId);

        client.sessionId = session.id;
        client.partnerId = botId;
        client.recentPartnerId = undefined;
        client.recentPartnerTime = undefined;
        client.waitStartTime = undefined;

        await storage.setUserState(user.id, {
          id: user.id,
          status: 'in-chat',
          sessionId: session.id,
          interests: client.interests,
          connectedAt: Date.now(),
        });

        sendToClient(user.id, {
          type: 'match',
          data: { sessionId: session.id, initiator: true, isBot: true, partnerProfile: botProfile },
        });

        console.log(`Matched user ${user.id} with fake bot ${botId} - ${botProfile.nickname}, ${botProfile.age} ${botProfile.countryFlag}`);
        processed.add(user.id);
        continue;
      }
      
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
          data: { sessionId: session.id, initiator: true, partnerProfile: partner.profile },
        });

        sendToClient(partnerId, {
          type: 'match',
          data: { sessionId: session.id, initiator: false, partnerProfile: client.profile },
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

    client.waitStartTime = Date.now();
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
    const displayCount = await storage.getDisplayUserCount();
    const stats: OnlineStats = {
      totalOnline: displayCount,
      waiting: allUsers.filter(c => !c.sessionId).length,
      inChat: allUsers.filter(c => c.sessionId).length,
    };
    res.json(stats);
  });

  // Check if user's IP is banned
  app.get('/api/check-ban-status', async (req, res) => {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    try {
      const isBanned = await storage.isIPBanned(ipAddress);
      if (isBanned) {
        const bannedIPs = await storage.getBannedIPs();
        const banInfo = bannedIPs.find(b => b.ipAddress === ipAddress);
        const expiresAt = banInfo?.expiresAt || Date.now();
        const timeRemaining = Math.max(0, expiresAt - Date.now());
        res.json({ 
          isBanned: true, 
          reason: banInfo?.reason || 'No reason provided',
          timeRemaining,
          expiresAt
        });
      } else {
        res.json({ isBanned: false });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to check ban status' });
    }
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
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      
      // Check if IP is currently banned from login attempts
      const isBanned = await storage.isLoginBanned(ipAddress);
      if (isBanned) {
        const remaining = await storage.getLoginBanTimeRemaining(ipAddress);
        const secondsRemaining = Math.ceil(remaining / 1000);
        return res.status(429).json({ 
          error: `Too many failed attempts. Try again in ${secondsRemaining} seconds.`,
          bannedUntil: remaining 
        });
      }
      
      const admin = await storage.getAdminByUsername(body.username);
      
      // Simple password check (in production, use bcrypt)
      if (admin && admin.passwordHash === body.password) {
        // Successful login - reset failed attempts
        await storage.recordSuccessfulLogin(ipAddress);
        const session = await storage.createAdminSession(admin.id);
        res.json({ token: session.token, adminId: admin.id, failedAttempts: 0 });
      } else {
        // Record failed attempt
        await storage.recordFailedLoginAttempt(ipAddress);
        const failedAttempts = await storage.getFailedLoginAttempts(ipAddress);
        
        res.status(401).json({ 
          error: 'Invalid credentials',
          failedAttempts,
          isBanned: failedAttempts >= 2
        });
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
    (req as any).ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    next();
  };

  // Get failed login attempts for the current admin's IP
  app.get('/api/admin/login-attempts', verifyAdmin, async (req, res) => {
    try {
      const ipAddress = (req as any).ipAddress;
      const failedAttempts = await storage.getFailedLoginAttempts(ipAddress);
      res.json({ failedAttempts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch login attempts' });
    }
  });

  // Get admin IP info
  app.get('/api/admin/ip-info', verifyAdmin, async (req, res) => {
    try {
      const currentIP = (req as any).ipAddress;
      const permanentIP = await storage.getPermanentAdminIP();
      res.json({ currentIP, permanentIP });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch IP info' });
    }
  });

  // Set permanent admin IP
  app.post('/api/admin/set-permanent-ip', verifyAdmin, async (req, res) => {
    try {
      const ipAddress = (req as any).ipAddress;
      await storage.setPermanentAdminIP(ipAddress);
      res.json({ success: true, permanentIP: ipAddress });
    } catch (error) {
      res.status(500).json({ error: 'Failed to set permanent IP' });
    }
  });

  // Clear permanent admin IP
  app.post('/api/admin/clear-permanent-ip', verifyAdmin, async (req, res) => {
    try {
      await storage.clearPermanentAdminIP();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear permanent IP' });
    }
  });

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

  // Ban management endpoints - IP-based (primary for anonymous users)
  app.post('/api/admin/ban-ip', verifyAdmin, async (req, res) => {
    try {
      const { ipAddress, reason, durationDays } = req.body;
      if (!ipAddress || !reason) {
        return res.status(400).json({ error: 'Missing ipAddress or reason' });
      }
      
      await storage.banIP(ipAddress, reason, (req as any).adminId, durationDays || 30);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to ban IP' });
    }
  });

  app.post('/api/admin/unban-ip', verifyAdmin, async (req, res) => {
    try {
      const { ipAddress } = req.body;
      if (!ipAddress) {
        return res.status(400).json({ error: 'Missing ipAddress' });
      }
      
      await storage.unbanIP(ipAddress);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unban IP' });
    }
  });

  app.get('/api/admin/bans', verifyAdmin, async (req, res) => {
    try {
      const bannedUsers = await storage.getBannedUsers();
      const bannedIPs = await storage.getBannedIPs();
      res.json({ bannedUsers, bannedIPs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bans' });
    }
  });

  app.get('/api/admin/reports', verifyAdmin, async (req, res) => {
    try {
      const reports = await storage.getReports();
      const reportsWithCounts = await Promise.all(
        reports.map(async (report) => ({
          ...report,
          totalReportsForIP: await storage.getReportCountInLast24Hours(report.reportedIP),
        }))
      );
      res.json({ reports: reportsWithCounts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  });

  // Fake user count settings
  app.get('/api/admin/fake-users', verifyAdmin, async (req, res) => {
    try {
      const settings = await storage.getFakeUserCountSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch fake user settings' });
    }
  });

  app.post('/api/admin/fake-users', verifyAdmin, async (req, res) => {
    try {
      const { minUsers, maxUsers, enabled } = req.body;
      if (typeof minUsers !== 'number' || typeof maxUsers !== 'number' || typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid parameters' });
      }
      if (minUsers < 0 || maxUsers < minUsers) {
        return res.status(400).json({ error: 'Invalid range' });
      }
      await storage.setFakeUserCountSettings(minUsers, maxUsers, enabled);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update fake user settings' });
    }
  });

  // Fake bots settings
  app.get('/api/admin/fake-bots', verifyAdmin, async (req, res) => {
    try {
      const enabled = await storage.getFakeBotsEnabled();
      res.json({ enabled });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch fake bots settings' });
    }
  });

  app.post('/api/admin/fake-bots', verifyAdmin, async (req, res) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid parameters' });
      }
      await storage.setFakeBotsEnabled(enabled);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update fake bots settings' });
    }
  });

  // Maintenance mode endpoints
  app.get('/api/admin/maintenance', verifyAdmin, async (req, res) => {
    try {
      const maintenance = await storage.getMaintenanceMode();
      res.json(maintenance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch maintenance status' });
    }
  });

  app.post('/api/admin/maintenance', verifyAdmin, async (req, res) => {
    try {
      const { enabled, reason } = req.body;
      if (typeof enabled !== 'boolean' || typeof reason !== 'string') {
        return res.status(400).json({ error: 'Invalid parameters' });
      }
      await storage.setMaintenanceMode(enabled, reason);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update maintenance mode' });
    }
  });

  // Public maintenance status endpoint
  app.get('/api/maintenance', async (req, res) => {
    try {
      const maintenance = await storage.getMaintenanceMode();
      res.json(maintenance);
    } catch (error) {
      res.status(500).json({ enabled: false, reason: '' });
    }
  });

  // Legacy user ban endpoints (kept for compatibility)
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
