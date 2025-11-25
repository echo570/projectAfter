# StrangerChat - Real-Time Anonymous Chat Platform

## Overview

StrangerChat is a real-time anonymous video and text chat platform that connects random strangers worldwide. The application enables users to engage in spontaneous conversations through video, audio, and text messaging with a Tinder-like "skip to next" mechanic. Built with a focus on frictionless entry and mobile-first design, users can start chatting within seconds without lengthy onboarding processes.

The platform features WebRTC-based peer-to-peer video/audio communication, WebSocket-powered real-time text messaging, and intelligent matchmaking that pairs waiting users while preventing immediate re-matches with recent partners.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- React Router (Wouter) for client-side routing with two main routes: landing page and chat interface
- TanStack Query (React Query) for server state management and API data fetching

**UI Component System:**
- Shadcn/ui component library with Radix UI primitives for accessible, customizable components
- Tailwind CSS for utility-first styling with custom design tokens
- New York style variant with neutral color scheme and CSS variables for theming
- Mobile-first responsive design following design guidelines inspired by Discord, Zoom, and Tinder

**State Management:**
- Local component state with React hooks for UI interactions
- WebSocket connection managed via useRef for persistent connection across renders
- RTCPeerConnection references for WebRTC video/audio streams
- React Query for polling online statistics endpoint every 10 seconds

**Real-Time Communication:**
- WebSocket client connection to `/ws` endpoint for signaling and chat messages
- WebRTC (RTCPeerConnection) for peer-to-peer video and audio streams
- MediaStream API for accessing user's camera and microphone
- Signaling messages (offer, answer, ICE candidates) exchanged via WebSocket

**Key Design Patterns:**
- Component composition with compound component patterns (e.g., Card, Dialog, Toast)
- Custom hooks for reusable logic (use-mobile, use-toast)
- Ref-based management for WebSocket and WebRTC connections to avoid reconnection on re-renders
- Event-driven architecture for WebSocket message handling

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server and middleware
- Node.js HTTP server wrapped around Express for WebSocket upgrade support
- Separate entry points for development (index-dev.ts with Vite middleware) and production (index-prod.ts serving static files)

**WebSocket Communication:**
- ws library for WebSocket server on `/ws` path
- Connection-based client tracking with Map data structure (userId → ConnectedClient)
- Message-driven protocol with typed WebSocketMessage interface
- Periodic queue processing (every 2 seconds) for automatic matchmaking

**Session Management:**
- In-memory storage abstraction (MemStorage) implementing IStorage interface
- User state tracking: idle, waiting, or in-chat status
- Chat session lifecycle management with status transitions
- Recent partner tracking to prevent immediate re-matching (cooldown mechanism)

**Matchmaking Logic:**
- Waiting queue populated when users request to find a partner
- Automatic pairing of two waiting users every 2 seconds
- Prevention of re-matching with recent partners using time-based cooldown
- Session creation with unique IDs linking two users

**WebRTC Signaling:**
- Relay of SDP offers and answers between matched peers
- ICE candidate forwarding for NAT traversal
- Server acts as signaling server only; media flows peer-to-peer

**Key Design Patterns:**
- Storage abstraction layer (IStorage interface) for potential database migration
- Event-driven message handling with type-safe message schemas
- Stateful connection tracking with cleanup on disconnect
- Periodic background jobs for queue processing

### Data Schema & Types

**Database Schema (Drizzle ORM with PostgreSQL):**
- `chat_sessions` table with user IDs, status, and timestamps
- Schema defined in shared/schema.ts for type sharing between client and server
- Drizzle Kit configured for PostgreSQL dialect with Neon serverless driver

**TypeScript Shared Types:**
- `UserState`: User connection state with status enum and session tracking
- `ChatSession`: Persistent session records with user pairs and lifecycle timestamps
- `Message`: Text message structure with sender, content, and timestamp
- `WebSocketMessage`: Union type for all WebSocket message types (find, skip, message, typing, offer, answer, ice-candidate, etc.)
- `OnlineStats`: Aggregated statistics for online users, waiting users, and active chats

**Current Implementation:**
- In-memory storage for MVP without database persistence
- Designed for easy migration to PostgreSQL when persistence is needed
- Session and user state stored in Map data structures

### External Dependencies

**Third-Party UI Libraries:**
- Radix UI primitives (@radix-ui/*) for accessible headless components
- Lucide React for icon components
- Class Variance Authority (CVA) for component variant styling
- CMDK for command palette functionality
- Embla Carousel for carousel components
- React Hook Form with Zod resolvers for form validation

**Database & ORM:**
- Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL driver (@neondatabase/serverless)
- Drizzle Kit for schema migrations

**Real-Time Communication:**
- ws library for WebSocket server implementation
- Native WebRTC APIs (browser-based, no external library)
- Native MediaStream API for camera/microphone access

**Development Tools:**
- Vite plugins: React, runtime error overlay, Replit-specific tools (cartographer, dev banner)
- TSX for TypeScript execution in development
- ESBuild for production bundling

**Styling & Design:**
- Tailwind CSS with autoprefixer via PostCSS
- Google Fonts (Inter) for typography
- Date-fns for timestamp formatting

**Session Storage:**
- Connect-pg-simple for potential PostgreSQL session store (prepared for future use)

**Key Architectural Decisions:**
- WebSocket chosen over HTTP polling for low-latency real-time messaging
- WebRTC for peer-to-peer video to reduce server bandwidth costs
- In-memory storage initially for rapid MVP development with migration path to PostgreSQL
- Shared TypeScript schemas between client and server for type safety
- Monorepo structure with client, server, and shared code for code reuse
- Mobile-first design approach based on modern chat platform patterns