# Kyn - Family Connection Platform

![Kyn Logo](/placeholder.svg?height=100&width=100&query=Kyn%20logo%20with%20family%20tree%20design)

## Overview

Kyn is a comprehensive family connection platform designed to bring families closer together through shared experiences, communication, and collaboration. The application provides a secure, private space for families to interact, share memories, coordinate activities, and preserve their history.

## Features

- **Family Feed:** Share updates, photos, and announcements
- **Onboarding Flow:** Guided setup process for new users
- **Family Management:** Add and manage family members and relationships
- **User Profiles:** Customizable profiles for each family member
- **Direct Messaging:** Private conversations between family members
- **Video Calls:** Integrated video calling powered by LiveKit
- **Photo Albums:** Create and share photo collections
- **Recipe Sharing:** Family recipe collection with ratings and comments
- **Task Management:** Collaborative family task lists and assignments
- **Family Events:** Create and manage family gatherings with location integration
- **Polls & Voting:** Make family decisions together
- **Fitness Challenges:** Create and participate in family fitness activities
- **Family Tree:** Interactive family tree visualization
- **Family Stories:** Record and preserve family stories and memories
- **Weather Widget:** Local weather information for family members
- **Newsletter Generator:** AI-powered family newsletter creation
- **Subscription Management:** Manage family subscription plans via Stripe

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **State Management:** Zustand, React Query
- **Styling:** Tailwind CSS, shadcn/ui components
- **Forms:** React Hook Form with Zod validation

### Backend
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Serverless Functions:** Next.js API Routes, Server Actions

### Integrations
- **Email:** Resend API
- **Maps:** Google Maps API
- **Weather:** OpenWeather API
- **Payments:** Stripe
- **Video:** LiveKit
- **AI:** Gemini API

## Table of Contents

- [Kyn - Family Connection Platform](#kyn---family-connection-platform)
  - [Overview](#overview)
  - [Features](#features)
  - [Technology Stack](#technology-stack)
    - [Frontend](#frontend)
    - [Backend](#backend)
    - [Integrations](#integrations)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Environment Setup](#environment-setup)
    - [Running the Application](#running-the-application)
      - [Additional Commands](#additional-commands)
  - [Developer Guide](#developer-guide)
    - [Architecture Overview](#architecture-overview)
    - [Supabase Auth with Next.js App Router](#supabase-auth-with-nextjs-app-router)
    - [LiveKit Integration](#livekit-integration)
    - [Project Structure](#project-structure)
    - [Coding Standards](#coding-standards)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Debugging Tips](#debugging-tips)
  - [Deployment](#deployment)
    - [Vercel Deployment](#vercel-deployment)
    - [Supabase Setup](#supabase-setup)
  - [Contributing](#contributing)
  - [License](#license)
  - [Kyn App Pitch](#kyn-app-pitch)
  - [Architecture Diagram](#architecture-diagram)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Git
- VS Code (recommended) with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

### Installation

```bash
git clone https://github.com/OurKyn/Kyn.git
cd kyn-app
npm install # or yarn install
```

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in the required environment variables in `.env.local` (see `.env.example` for all keys).
3. Set up Supabase:
   - Create a project at [supabase.com](https://supabase.com)
   - Get your project URL and API keys
   - Add them to your `.env.local` file

### Running the Application

```bash
npm run dev # or yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Additional Commands

```bash
npm run test      # Run tests
npm run lint      # Lint code
npm run build     # Build for production
```

## Developer Guide

### Architecture Overview

- **React Server Components (RSC):** Default for performance; use Client Components only when necessary.
- **Data Flow:**
  - Server Components fetch data directly from Supabase
  - Client Components use React Query for data fetching and caching
  - Server Actions handle data mutations
- **State Management:**
  - Local state: `useState`, `useReducer`
  - Global state: Zustand
  - Server state: React Query
- **Authentication:**
  - Supabase Auth for user authentication
  - Next.js middleware for route protection
  - Row Level Security (RLS) for database access control

### Supabase Auth with Next.js App Router

This project uses Supabase Auth with the Next.js App Router for secure, scalable authentication. Follow these steps to set up and use Supabase Auth:

1. **Install Supabase Packages**
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```
2. **Set Up Environment Variables**
   - Copy `.env.example` to `.env.local` and fill in your Supabase project details.
3. **Create Supabase Client Utilities**
   - `utils/supabase/client.ts`:
     ```ts
     import { createBrowserClient } from '@supabase/ssr'
     export function createClient() {
       return createBrowserClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
       )
     }
     ```
   - `utils/supabase/server.ts`:
     ```ts
     import { createServerClient } from '@supabase/ssr'
     import { cookies } from 'next/headers'
     export function createClient() {
       return createServerClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
         { cookies }
       )
     }
     ```
4. **Add Middleware for Session Refresh**
   - `middleware.ts`:
     ```ts
     import { type NextRequest } from 'next/server'
     import { updateSession } from '@/utils/supabase/middleware'
     export async function middleware(request: NextRequest) {
       return await updateSession(request)
     }
     export const config = {
       matcher: [
         '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
       ],
     }
     ```
5. **Protecting a Server Component**
   - Example:
     ```tsx
     // app/private/page.tsx
     import { redirect } from 'next/navigation'
     import { createClient } from '@/utils/supabase/server'
     export default async function PrivatePage() {
       const supabase = createClient()
       const { data, error } = await supabase.auth.getUser()
       if (error || !data?.user) {
         redirect('/login')
       }
       return <p>Hello {data.user.email}</p>
     }
     ```
6. **Best Practices**
   - Always use `supabase.auth.getUser()` in server code to validate sessions.
   - Never trust cookies alone for authentication; always revalidate with Supabase.
   - Use the correct client utility for your context (server, client, middleware).
   - Keep your environment variables secure and never commit secrets.

For more details, see the [Supabase Auth docs](https://supabase.com/docs/guides/auth) and [Next.js App Router docs](https://nextjs.org/docs/app/building-your-application/routing).

### LiveKit Integration

This project supports real-time video and audio via LiveKit. To enable LiveKit:

1. **Install LiveKit SDKs**
   ```bash
   npm install livekit-server-sdk @livekit/components-react @livekit/components-styles --save
   ```
2. **Set Up Environment Variables**
   - Add the following to your `.env.local` (do not commit this file):
     ```env
     LIVEKIT_API_KEY=<your API Key>
     LIVEKIT_API_SECRET=<your API Secret>
     LIVEKIT_URL=wss://kyn-6lja9dwd.livekit.cloud
     ```
3. **Create a Token Endpoint**
   - `/app/api/token/route.ts`:
     ```ts
     import { NextRequest, NextResponse } from 'next/server'
     import { AccessToken } from 'livekit-server-sdk'
     export const revalidate = 0
     export async function GET(req: NextRequest) {
       const room = req.nextUrl.searchParams.get('room')
       const username = req.nextUrl.searchParams.get('username')
       if (!room) {
         return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 })
       } else if (!username) {
         return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 })
       }
       const apiKey = process.env.LIVEKIT_API_KEY
       const apiSecret = process.env.LIVEKIT_API_SECRET
       const wsUrl = process.env.LIVEKIT_URL
       if (!apiKey || !apiSecret || !wsUrl) {
         return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
       }
       const at = new AccessToken(apiKey, apiSecret, { identity: username })
       at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true })
       return NextResponse.json(
         { token: await at.toJwt() },
         { headers: { 'Cache-Control': 'no-store' } },
       )
     }
     ```
4. **Create a Video Room Page**
   - `/app/room/page.tsx`:
     ```tsx
     'use client'
     import {
       ControlBar,
       GridLayout,
       ParticipantTile,
       RoomAudioRenderer,
       useTracks,
       RoomContext,
     } from '@livekit/components-react'
     import { Room, Track } from 'livekit-client'
     import '@livekit/components-styles'
     import { useEffect, useState } from 'react'
     export default function Page() {
       const room = 'quickstart-room'
       const name = 'quickstart-user'
       const [roomInstance] = useState(() => new Room({
         adaptiveStream: true,
         dynacast: true,
       }))
       useEffect(() => {
         let mounted = true
         ;(async () => {
           try {
             const resp = await fetch(`/api/token?room=${room}&username=${name}`)
             const data = await resp.json()
             if (!mounted) return
             if (data.token) {
               await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, data.token)
             }
           } catch (e) {
             console.error(e)
           }
         })()
         return () => {
           mounted = false
           roomInstance.disconnect()
         }
       }, [roomInstance])
       return (
         <RoomContext.Provider value={roomInstance}>
           <div data-lk-theme='default' style={{ height: '100dvh' }}>
             <MyVideoConference />
             <RoomAudioRenderer />
             <ControlBar />
           </div>
         </RoomContext.Provider>
       )
     }
     function MyVideoConference() {
       const tracks = useTracks(
         [
           { source: Track.Source.Camera, withPlaceholder: true },
           { source: Track.Source.ScreenShare, withPlaceholder: false },
         ],
         { onlySubscribed: false },
       )
       return (
         <GridLayout tracks={tracks} style={{ height: 'calc(100vh - var(--lk-control-bar-height))' }}>
           <ParticipantTile />
         </GridLayout>
       )
     }
     ```
5. **Notes & Best Practices**
   - Never commit your `.env.local` file or secrets.
   - Use environment variables for all LiveKit credentials and URLs.
   - For production, secure your token endpoint and validate user identity.
   - See the [LiveKit docs](https://docs.livekit.io/) for advanced features and configuration.

### Project Structure

```
kyn-v1/

```

### Coding Standards

- Use TypeScript (strict mode)
- Functional components with the `function` keyword
- 2-space indentation, single quotes, no semicolons (unless required)
- Use interfaces for object shapes
- Use Zod for schema validation
- Use Tailwind CSS for styling
- Use React Query, Zustand for state management
- See `.cursor/rules/kyn-rules.mdc` for full standards

## Troubleshooting

### Common Issues

1. **Authentication Issues:**
   - Check that Supabase URL and keys are correct
   - Ensure cookies are enabled in your browser
   - Check for CORS issues
2. **API Connection Issues:**
   - Verify environment variables
   - Check network tab for errors
   - Ensure API keys are valid
3. **Build Errors:**
   - Check for TypeScript errors
   - Ensure all dependencies are installed
   - Clear `.next` directory and rebuild
4. **Database Issues:**
   - Check Supabase console for errors
   - Verify RLS policies
   - Check database schema

### Debugging Tips

- Use `console.log` in server components/actions
- Check server logs in terminal
- Use React DevTools for component debugging
- Use Network tab in browser DevTools for API issues

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy

### Supabase Setup

1. Create a production Supabase project
2. Run database migrations
3. Set up Row Level Security policies
4. Configure authentication providers

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Kyn App Pitch

**Hook:**

"In today's fast-paced, disconnected world, our families are more spread out than ever. We try to stay connected through noisy social media feeds and scattered group chats, but precious memories get lost, history fades, and the deep connections that define a family can feel harder to maintain."

**Problem:**

"Public social media isn't designed for the private intimacy of family. Generic messaging apps are great for quick chats, but terrible for organizing shared lives or preserving anything long-term. Existing family tree tools are often static, and photos end up buried in cloud storage. There's no single, secure, and engaging place dedicated purely to your family's shared life and legacy."

**Solution:**

"Introducing **Kyn** – the dedicated, private platform built exclusively for your family to connect, share, preserve, and build a lasting legacy, together."

**What is Kyn?**

"Kyn is your family's secure digital hearth. It's an all-in-one space designed to nurture genuine connection across generations, moving beyond the noise of the outside world."

**Key Value Proposition & Features (The 'Why Kyn?'):**

*   **Private & Secure by Design:** Unlike public platforms, Kyn is a walled garden for your family. Your data, your memories, and your conversations are kept private, protected by robust security measures like Row-Level Security.
*   **All-in-One Family Hub:** Why juggle multiple apps? Kyn brings together everything your family needs:
    *   A dynamic feed for daily updates and meaningful conversations (no superficial likes!).
    *   Shared calendars and event planning.
    *   Collaborative photo and video albums.
    *   A structured recipe box for sharing culinary traditions.
    *   Family-friendly games and polls for fun and collective decisions.
    *   Task management for shared responsibilities.
*   **Building and Preserving Your Legacy:** Kyn isn't just about the present; it's about the future.
    *   Document milestones and achievements.
    *   Build a dynamic, visual Family Tree.
    *   Create a Story Vault with recorded audio and video memories.
    *   Archive photos with smart tagging.
    *   Optionally, record sensitive family history (with strict privacy controls).
*   **Connecting Generations:** Designed to be intuitive for everyone, from tech-savvy teens to grandparents. Features like AI-generated newsletters help keep less active members informed and engaged.
*   **Focus on Meaningful Interaction:** We prioritize conversations and shared experiences. Reactions offer a simple way to show acknowledgement, while threaded replies keep discussions organized.

**The Opportunity:**

"The need for dedicated, private family connection is universal. As families continue to navigate distance and busy lives, a trusted platform that centralizes their shared life and history represents a significant market opportunity, far beyond generic social or communication tools."

**Vision:**

"Our vision is for Kyn to be the living archive and active connection point for every family, empowering them to strengthen bonds, share their lives authentically, and ensure their unique story endures for generations to come."

**Call to Action:**

"Join us in building the future of family connection. Explore Kyn and see how you can bring your family closer, starting today."

---


## Architecture Diagram

The following diagram illustrates the complete architecture of the Kyn application, showing how different components interact with each other and with external services.

```mermaid
graph TD
    %% Main Application Sections
    Client["Client Browser"]
    NextJS["Next.js Application"]
    Supabase["Supabase Backend"]
    ExternalServices["External Services"]
    
    %% Client Components
    subgraph "Frontend Layer"
        Pages["Pages (App Router)"]
        ServerComponents["React Server Components"]
        ClientComponents["React Client Components"]
        Hooks["Custom Hooks"]
    end
    
    %% State Management
    subgraph "State Management"
        ZustandStores["Zustand Stores"]
        ReactQuery["React Query"]
        LocalState["Component Local State"]
    end
    
    %% Server Components
    subgraph "Server Layer"
        ServerActions["Server Actions"]
        APIRoutes["API Routes"]
        Middleware["Next.js Middleware"]
    end
    
    %% Supabase Services
    subgraph "Supabase Services"
        Auth["Authentication"]
        Database["PostgreSQL Database"]
        Storage["File Storage"]
        RLS["Row Level Security"]
    end
    
    %% External Integrations
    subgraph "External Integrations"
        Stripe["Stripe Payments"]
        LiveKit["LiveKit Video"]
        Resend["Resend Email"]
        OpenWeather["OpenWeather API"]
        GoogleMaps["Google Maps API"]
        GeminiAI["Gemini AI"]
    end
    
    %% Database Tables
    subgraph "Database Schema"
        Profiles["Profiles"]
        Families["Families"]
        FamilyMembers["Family Members"]
        Posts["Posts"]
        Comments["Comments"]
        Tasks["Tasks"]
        Recipes["Recipes"]
        Albums["Albums"]
        Media["Media"]
        Messages["Messages"]
        Events["Events"]
        Polls["Polls"]
        Challenges["Challenges"]
        FamilyTree["Family Tree Nodes"]
        Stories["Stories"]
        MedicalNotes["Medical Notes"]
    end
    
    %% Utility Libraries
    subgraph "Utility Libraries"
        Utils["Utility Functions"]
        Services["Service Integrations"]
        Config["Configuration"]
        Validation["Zod Validation"]
        ErrorHandling["Error Handling"]
        Monitoring["Monitoring & Logging"]
    end
    
    %% Connections - Client Flow
    Client --> NextJS
    NextJS --> Pages
    Pages --> ServerComponents
    Pages --> ClientComponents
    ClientComponents --> Hooks
    
    %% State Management Connections
    ClientComponents --> LocalState
    ClientComponents --> ZustandStores
    ClientComponents --> ReactQuery
    Hooks --> ZustandStores
    Hooks --> ReactQuery
    
    %% Server Connections
    ServerComponents --> ServerActions
    ClientComponents --> ServerActions
    ServerComponents --> APIRoutes
    ClientComponents --> APIRoutes
    NextJS --> Middleware
    
    %% Supabase Connections
    ServerActions --> Auth
    ServerActions --> Database
    ServerActions --> Storage
    APIRoutes --> Auth
    APIRoutes --> Database
    APIRoutes --> Storage
    Middleware --> Auth
    Database --> RLS
    
    %% Database Schema Connections
    Database --> Profiles
    Database --> Families
    Database --> FamilyMembers
    Database --> Posts
    Database --> Comments
    Database --> Tasks
    Database --> Recipes
    Database --> Albums
    Database --> Media
    Database --> Messages
    Database --> Events
    Database --> Polls
    Database --> Challenges
    Database --> FamilyTree
    Database --> Stories
    Database --> MedicalNotes
    
    %% External Service Connections
    ServerActions --> ExternalServices
    APIRoutes --> ExternalServices
    ExternalServices --> Stripe
    ExternalServices --> LiveKit
    ExternalServices --> Resend
    ExternalServices --> OpenWeather
    ExternalServices --> GoogleMaps
    ExternalServices --> GeminiAI
    
    %% Utility Connections
    ServerActions --> Utils
    ServerActions --> Services
    ServerActions --> Validation
    ServerActions --> ErrorHandling
    APIRoutes --> Utils
    APIRoutes --> Services
    APIRoutes --> Validation
    APIRoutes --> ErrorHandling
    ServerComponents --> Utils
    ClientComponents --> Utils
    NextJS --> Config
    NextJS --> Monitoring
    
    %% Style Definitions
    classDef frontend fill:#d4f1f9,stroke:#05728f,stroke-width:2px;
    classDef state fill:#ffe6cc,stroke:#d79b00,stroke-width:2px;
    classDef server fill:#d5e8d4,stroke:#82b366,stroke-width:2px;
    classDef supabase fill:#e1d5e7,stroke:#9673a6,stroke-width:2px;
    classDef external fill:#fff2cc,stroke:#d6b656,stroke-width:2px;
    classDef database fill:#f8cecc,stroke:#b85450,stroke-width:2px;
    classDef utility fill:#dae8fc,stroke:#6c8ebf,stroke-width:2px;
    
    %% Apply Styles
    class Pages,ServerComponents,ClientComponents,Hooks frontend;
    class ZustandStores,ReactQuery,LocalState state;
    class ServerActions,APIRoutes,Middleware server;
    class Auth,Database,Storage,RLS supabase;
    class Stripe,LiveKit,Resend,OpenWeather,GoogleMaps,GeminiAI external;
    class Profiles,Families,FamilyMembers,Posts,Comments,Tasks,Recipes,Albums,Media,Messages,Events,Polls,Challenges,FamilyTree,Stories,MedicalNotes database;
    class Utils,Services,Config,Validation,ErrorHandling,Monitoring utility;


