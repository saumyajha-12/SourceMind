# SourceMind — Complete System Architecture

SourceMind is an AI-powered multi-modal Retrieval-Augmented Generation (RAG) platform. It allows users to ingest diverse real-world knowledge sources—including **PDF documents**, **live websites**, **YouTube video transcripts**, and **real-time breaking news**—and conduct contextual, source-attributed conversations powered by Google Gemini and vector similarity search.

---

## Table of Contents
1. [Executive Summary & Core Highlights](#1-executive-summary--core-highlights)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture & API Gateway](#4-backend-architecture--api-gateway)
5. [RAG Pipeline & Vector Search Deep Dive](#5-rag-pipeline--vector-search-deep-dive)
6. [Database Schema & ER Diagram](#6-database-schema--er-diagram)
7. [Authentication & Security Architecture](#7-authentication--security-architecture)
8. [News Aggregation & Deduplication Engine](#8-news-aggregation--deduplication-engine)
9. [Deployment & Infrastructure Topology](#9-deployment--infrastructure-topology)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Environment & Configuration Matrix](#11-environment--configuration-matrix)

---

## 1. Executive Summary & Core Highlights

SourceMind addresses key challenges in RAG systems:
- **Multi-Source Ingestion**: Ingests PDFs, static/scraped web pages, and YouTube video transcripts into a single unified conversational workspace.
- **Vector Search with pgvector**: High-performance semantic similarity search directly in PostgreSQL using 3072-dimensional vector embeddings (`gemini-embedding-001`).
- **Resilient AI Cascade**: An automated model fallback cascade across multiple Gemini models (`gemini-3.1-flash-lite-preview`, `gemini-2.5-flash-lite`, `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`) ensuring 99.9% uptime against quota or regional errors.
- **Enterprise-Grade Token Security**: Dual-token architecture—access tokens held strictly in client session memory, paired with `httpOnly`, `Secure`, `SameSite=None` refresh tokens stored in PostgreSQL sessions.
- **Smart News Engine**: Real-time RSS scraping with custom Jaccard token similarity deduplication, enriched with the Tavily API for full-text article extraction.

---

## 2. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        Browser["React 19 / Vite SPA\n(Netlify / Vercel / Nginx)"]
    end

    subgraph Gateway["Ingress & Security"]
        Nginx["Nginx Reverse Proxy & SSL\n(Let's Encrypt / Certbot)"]
        RateLimiter["Express Rate Limiters\n(Auth, OTP, Resend Limits)"]
        AuthMiddleware["JWT Authentication Middleware\n(Bearer Token Verification)"]
    end

    subgraph AppServer["Application Layer (Node.js Express 5)"]
        Router["Express API Router"]
        
        subgraph Services["Core Domain Services"]
            AuthSvc["authService\n(bcrypt, JWT, Sessions)"]
            ChatSvc["chatService\n(Prompt Synthesis, RAG)"]
            DocSvc["documentService\n(PDF Parser & Chunker)"]
            WebSvc["websiteService\n(Cheerio Crawler)"]
            YtSvc["youtubeService\n(Transcript Extractor)"]
            NewsSvc["newsService\n(RSS + Jaccard Deduplication)"]
            TavilySvc["articleLinkService\n(Tavily API Resolution)"]
        end
    end

    subgraph ExternalAPIs["External AI & Cloud Services"]
        GeminiLLM["Google Gemini Models\n(Flash 3.1 / 2.5 / 2.0 / 1.5)"]
        GeminiEmbed["Google Gemini Embeddings\n(gemini-embedding-001)"]
        ResendAPI["Resend Email API\n(OTP & Verification Emails)"]
        TavilyAPI["Tavily Search API\n(Clean News Extraction)"]
        GoogleNews["Google News RSS Feed"]
    end

    subgraph Storage["Data & Storage Layer"]
        Postgres[("PostgreSQL 15 + pgvector\n(Docker / Render Postgres)")]
        LocalUploads["Local Uploads Directory\n(/app/uploads)"]
    end

    Browser -->|HTTPS / REST| Nginx
    Nginx -->|Proxy Pass :5001| RateLimiter
    RateLimiter --> Router
    Router --> AuthMiddleware
    AuthMiddleware --> Services

    DocSvc -->|Save File| LocalUploads
    DocSvc & WebSvc & YtSvc -->|Generate Embeddings| GeminiEmbed
    ChatSvc -->|Vector Similarity Query <->| Postgres
    ChatSvc -->|Generate Response| GeminiLLM
    AuthSvc -->|Send OTP Emails| ResendAPI
    NewsSvc -->|Fetch Headlines| GoogleNews
    TavilySvc -->|Resolve URLs| TavilyAPI
    Services -->|Prisma Client ORM| Postgres
```

---

## 3. Frontend Architecture

The frontend is a modern, responsive Single Page Application built with **React 19**, **Vite**, and **TailwindCSS**.

### Component Hierarchy

```mermaid
graph TD
    App["App.jsx (Router & Global Providers)"]
    AuthProvider["AuthProvider (AuthContext.jsx)"]
    
    App --> AuthProvider
    AuthProvider --> BrowserRouter
    
    BrowserRouter --> GuestRoutes["Guest Routes\n(/signin, /signup, /verify-email,\n/forgot-password, /reset-password)"]
    BrowserRouter --> ProtectedRoutes["Protected Routes\n(/chat, /chat/:chatId, /latest-news)"]
    
    ProtectedRoutes --> ChatPage["Chat.jsx"]
    ProtectedRoutes --> LatestNewsPage["LatestNews.jsx"]
    
    ChatPage --> Topbar["Topbar.jsx"]
    ChatPage --> Sidebar["Sidebar.jsx (Chat History)"]
    ChatPage --> MainArea["Chat Area"]
    
    MainArea --> UploadGate["UploadGate.jsx\n(PDF / Web / YouTube Tabs)"]
    MainArea --> MessageList["MessageList.jsx\n(User & Assistant Bubbles)"]
    MainArea --> InputBar["InputBar.jsx\n(Textarea + Upload Triggers)"]
    MainArea --> PdfViewer["PdfModelViewer.jsx\n(Embedded PDF Previewer)"]
    
    LatestNewsPage --> ArticleCard["ArticleCard.jsx\n(Search, Filters, Quick RAG)"]
```

### State Management & Custom Hooks

| Hook | Responsibility |
| :--- | :--- |
| `useAuth()` | Manages access tokens in memory, user profile state, signin/signup actions, and silent session restore. |
| `useChatHistory()` | Fetches, sorts, and deletes conversation sessions; manages active `chatId`. |
| `useMessages(chatId)` | Synchronizes message thread for the active chat, handles optimistic UI updates during inference. |
| `usePdfUpload()` | Handles multi-part file uploads, progress monitoring, and validation (< 200 pages / 50k words). |
| `useWebsite()` | Scrapes URLs and initializes web-based chat sessions. |
| `useYoutube()` | Extracts transcripts from YouTube URLs and binds them to the active chat context. |

### Axios Interceptor & Concurrency-Safe Refresh

The frontend employs a centralized Axios instance (`Api.js`) with an automatic request/response interceptor pipeline:
- **No Token in Storage**: Access tokens are kept in JavaScript memory to eliminate XSS token theft.
- **401 Interception**: When an access token expires, outgoing requests are paused and placed into a `failedQueue`.
- **Single Refresh In-Flight**: Only one refresh request (`/api/auth/refresh`) is fired regardless of how many parallel requests failed. Once resolved, all queued requests replay automatically with the new token.

---

## 4. Backend Architecture & API Gateway

The backend is built with **Node.js** and **Express 5**, organized into strict separation of concerns:

```
backend/src/
├── config/           # Database and third-party SDK clients (Prisma)
├── controllers/      # HTTP request parsing and response formatting
├── middlewares/      # Authentication & rate limiting middleware
├── routes/           # REST API route definitions
├── services/         # Core business logic and external integrations
├── utils/            # Reusable algorithmic helpers (embeddings, crawler, parser)
└── index.js          # Server entry point, CORS, and Express pipeline
```

### Middleware Pipeline Order

1. **Reverse Proxy Trust**: `app.set("trust proxy", 1)` for accurate client IP resolution behind Nginx/Render.
2. **CORS Verification**: Strict origin validation matching production domains (`documindai.dev`, Netlify, Vercel) with `credentials: true`.
3. **Cookie Parser**: Parses signed and unsigned cookies to extract `refreshToken`.
4. **Body Parsers**: `express.json()` with standard limits.
5. **Health Checks**: Unauthenticated `/` and `/health` endpoints for uptime monitoring and Docker health probes.
6. **Public Route Handlers**: `/api/auth` (with endpoint-specific rate limiters) and `/api/news`.
7. **Auth Gate**: Global `authMiddleware` enforcing valid JWT Bearer tokens for all downstream `/api/*` routes.
8. **Protected Route Handlers**: `/api/document`, `/api/chat`, `/api/youtube`, `/api/website`.

### Endpoint & Rate Limit Matrix

| Endpoint Route | Method | Middleware / Limiter | Description |
| :--- | :---: | :--- | :--- |
| `/api/auth/signup` | POST | `signupLimiter` (10 / hr) | Registers user, hashes password, sends 6-digit OTP |
| `/api/auth/signin` | POST | `signinLimiter` (5 / 15 min) | Validates credentials, issues access & refresh tokens |
| `/api/auth/verify-email` | POST | `verifyOtpLimiter` (10 / 10 min) | Verifies email OTP token |
| `/api/auth/resend-verification-otp` | POST | `resendOtpLimiter` (3 / 10 min) | Dispatches a new email verification code |
| `/api/auth/forgot-password` | POST | `forgotPasswordLimiter` (3 / hr) | Generates password reset token and sends email |
| `/api/auth/reset-password` | POST | `resetPasswordLimiter` (5 / 15 min)| Verifies reset token and updates password |
| `/api/auth/refresh` | POST | Public (Cookie validation) | Rotates access token using HTTP-only cookie |
| `/api/auth/logout` | POST | Public | Revokes refresh token in database, clears cookie |
| `/api/document/upload` | POST | `authMiddleware`, Multer | Uploads PDF, parses text, creates chunks & embeddings |
| `/api/website/process` | POST | `authMiddleware` | Scrapes web page and creates chunks & embeddings |
| `/api/youtube/process` | POST | `authMiddleware` | Extracts YouTube transcript and creates embeddings |
| `/api/chat` | GET/POST | `authMiddleware` | Retrieves chat list or creates a new chat |
| `/api/chat/:chatId/messages`| GET/POST | `authMiddleware` | Gets chat messages or executes RAG query |
| `/api/news` | GET | Public | Returns categorized, deduplicated news articles |
| `/api/news/resolve-link` | POST | Public | Resolves real article URL using Tavily API |

---

## 5. RAG Pipeline & Vector Search Deep Dive

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Frontend)
    participant ChatAPI as Express Chat Controller
    participant ChatSvc as Chat Service
    participant GeminiEmbed as Gemini Embedding API
    participant DB as PostgreSQL (pgvector)
    participant GeminiLLM as Gemini Generative AI

    User->>ChatAPI: POST /api/chat/:chatId/messages { message: "What is X?" }
    ChatAPI->>ChatSvc: sendMessage({ chatId, message, userId })
    
    par Parallel Data Gathering
        ChatSvc->>DB: Fetch last 10 messages (Chat History)
        ChatSvc->>DB: Fetch associated Documents (Sources list)
        ChatSvc->>GeminiEmbed: generateEmbedding(message) [gemini-embedding-001]
    end
    
    GeminiEmbed-->>ChatSvc: Query Vector (3072 floats)
    
    ChatSvc->>DB: SELECT content FROM "Chunk"<br/>WHERE "chatId" = :chatId<br/>ORDER BY embedding <-> CAST(:vector AS vector)<br/>LIMIT 5
    DB-->>ChatSvc: Top 5 Relevant Chunks
    
    ChatSvc->>ChatSvc: Synthesize Grounded Prompt<br/>(Sources + Chunks + Conversation History + Rules)
    
    loop Fallback Cascade across Models
        ChatSvc->>GeminiLLM: generateContent(prompt)
        Note over ChatSvc,GeminiLLM: Tries 3.1-flash-lite, 2.5-flash-lite, 2.5-flash, 2.0-flash, 1.5-flash
    end
    GeminiLLM-->>ChatSvc: AI Assistant Response
    
    ChatSvc->>DB: Prisma Transaction:<br/>INSERT User Message & Assistant Message
    ChatSvc-->>ChatAPI: Formatted Answer
    ChatAPI-->>User: JSON Response { reply: "..." }
```

### Text Chunking & Embedding Strategy

- **Chunking Parameters**: Text is chunked using sliding window chunking with **1,000 characters per chunk** and a **200-character overlap** (`splitText.js`).
- **Source Labeling**: Every chunk is prefixed with metadata: `[Source: <filename>]` or `[Source: <YouTube Title>]` to guarantee that retrieval attribution is embedded directly in vector space.
- **Batch Embedding Generation**:
  - Batches of 50 chunks are sent to `ai.models.embedContent`.
  - Built-in rate limit handling inspects HTTP 429 response headers and applies precise delay intervals (`retry in Xs` + 3s margin).
  - Enforces a 15-second pause between batches to respect free tier RPM limits.
- **Distance Metric**: Vector similarity queries use PostgreSQL's Euclidean / L2 distance operator (`<->`):
  ```sql
  SELECT content FROM "Chunk"
  WHERE "chatId" = $1
  ORDER BY embedding <-> CAST($2 AS vector)
  LIMIT 5;
  ```

---

## 6. Database Schema & ER Diagram

The database utilizes PostgreSQL 15 with the `pgvector` extension and is modeled using Prisma ORM.

```mermaid
erDiagram
    User ||--o{ Session : "has"
    User ||--o{ EmailVerificationToken : "owns"
    User ||--o{ PasswordResetToken : "owns"
    User ||--o{ Chat : "creates"
    User ||--o{ Document : "uploads"
    
    Chat ||--o{ Document : "contains"
    Chat ||--o{ Message : "contains"
    Chat ||--o{ Chunk : "contains"
    
    Document ||--o{ Chunk : "chunked into"

    User {
        string id PK "UUID"
        string email UK
        string password "bcrypt hash"
        boolean isEmailVerified "default: false"
        datetime createdAt
        datetime updatedAt
    }

    Session {
        string id PK "UUID"
        string userId FK
        string refreshToken
        datetime expiresAt
        datetime createdAt
    }

    EmailVerificationToken {
        string id PK "UUID"
        string userId FK
        string token "6-digit OTP"
        datetime expiresAt
        datetime createdAt
    }

    PasswordResetToken {
        string id PK "UUID"
        string userId FK
        string token "6-digit OTP"
        datetime expiresAt
        datetime createdAt
    }

    Chat {
        string id PK "UUID"
        string userId FK
        datetime createdAt
    }

    Document {
        string id PK "UUID"
        string filename
        string path "Disk path or web:URL or youtube:ID"
        string userId FK
        string chatId FK
        datetime createdAt
    }

    Message {
        string id PK "UUID"
        string chatId FK
        string role "user | assistant"
        string content
        datetime createdAt
    }

    Chunk {
        string id PK "UUID"
        string content "Source-prefixed text"
        string documentId FK
        string chatId FK
        vector embedding "vector(3072)"
        datetime createdAt
    }
```

### Relational Integrity & Cascades
All foreign keys specify `onDelete: Cascade`. Deleting a `Chat` automatically and cleanly removes its associated `Documents`, `Chunks`, and `Messages` without leaving orphaned vector rows.

---

## 7. Authentication & Security Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant AuthAPI as /api/auth
    participant DB as PostgreSQL
    participant Resend as Resend API

    Note over Client,Resend: 1. Registration & Email Verification
    Client->>AuthAPI: POST /signup { email, password }
    AuthAPI->>DB: Hash password (bcrypt 10 rounds), Save User
    AuthAPI->>DB: Generate 6-digit OTP, Save Token (Expires in 15m)
    AuthAPI->>Resend: Send Verification Email with OTP
    AuthAPI-->>Client: 201 Created { message: "Verification OTP sent" }
    
    Client->>AuthAPI: POST /verify-email { email, otp }
    AuthAPI->>DB: Match OTP & Check Expiry
    AuthAPI->>DB: UPDATE User SET isEmailVerified = true
    AuthAPI-->>Client: 200 OK { message: "Email verified successfully" }

    Note over Client,Resend: 2. Authentication & Dual Token Issuance
    Client->>AuthAPI: POST /signin { email, password }
    AuthAPI->>DB: Verify credentials & email verification status
    AuthAPI->>DB: Create Session row with Refresh Token
    AuthAPI-->>Client: Set-Cookie: refreshToken (httpOnly, Secure)<br/>Body: { accessToken: "JWT..." }

    Note over Client,Resend: 3. Authenticated Requests & Silent Refresh
    Client->>AuthAPI: GET /api/chat (Header: Bearer <accessToken>)
    AuthAPI-->>Client: 401 Unauthorized (Token Expired)
    
    Client->>AuthAPI: POST /api/auth/refresh (Cookie sent automatically)
    AuthAPI->>DB: Find active Session where refreshToken = cookie
    AuthAPI-->>Client: Body: { accessToken: "NEW_JWT..." }
    Client->>AuthAPI: Replay original GET /api/chat with new token
    AuthAPI-->>Client: 200 OK { chats: [...] }
```

### Security Measures Implemented
- **Memory-Only Access Tokens**: Frontend stores short-lived JWTs in React state, not in `localStorage` or `sessionStorage`.
- **Hardened Cookies**: Refresh tokens are transmitted exclusively in cookies with `httpOnly: true`, `secure: true`, and `sameSite: 'none'`.
- **Rate Limiting**: Multi-tiered IP rate limits on every authentication action (login, signup, OTP request, password reset).
- **Password Salting**: Strong bcrypt hashing with 10 salt rounds.
- **SQL Injection Prevention**: Prisma ORM handles parameter escaping; raw vector queries use parameterized values (`$executeRaw` and `$queryRaw`).

---

## 8. News Aggregation & Deduplication Engine

SourceMind provides a live news RAG feature combining Google News RSS and Tavily search:

```mermaid
flowchart TD
    Start["User opens /latest-news"] --> RSS["Fetch RSS feeds across categories\n(World, Tech, Business, Science, Health)"]
    RSS --> Parse["Parse RSS XML using rss-parser"]
    Parse --> Tokenize["normalizeTitle() -> getTitleTokens()\n(Remove stop words & punctuation)"]
    Tokenize --> Dedup{"isSameNews() Jaccard Check\n(similarity >= 0.5 OR\nsimilarity >= 0.35 with 3+ overlapping tokens)"}
    
    Dedup -->|Duplicate| Discard["Discard Article"]
    Dedup -->|Unique| Keep["Add to Curated Article Feed"]
    
    Keep --> UserSelect["User clicks 'Chat with Article'"]
    UserSelect --> Tavily["Call Tavily API with article title\nto resolve original clean URL"]
    Tavily --> Scraper["Scrape Clean Article Content via Cheerio"]
    Scraper --> RAG["Initialize RAG Session & Vectorize Chunks"]
```

---

## 9. Deployment & Infrastructure Topology

SourceMind supports two deployment architectures: a containerized AWS EC2 deployment for production and a managed cloud architecture for rapid hosting.

### Primary Architecture: AWS EC2 with Docker Compose

```mermaid
graph TB
    subgraph Internet
        UserReq["HTTPS User Request"]
    end

    subgraph EC2["AWS EC2 Instance (Ubuntu 24.04 LTS)"]
        Certbot["Certbot / SSL Certificate"]
        
        subgraph NginxProxy["Nginx Server (:80 / :443)"]
            Static["/ (Root)\nServe frontend/dist HTML/JS"]
            Proxy["/api/ (Reverse Proxy)\nForward to 127.0.0.1:5001"]
        end
        
        subgraph DockerCompose["Docker Network (Bridge)"]
            Backend["documind-backend container\n(Node.js Express :5000)\nExposed at 127.0.0.1:5001"]
            Postgres["documind-postgres container\n(pgvector/pgvector:pg15 :5432)\nExposed at 127.0.0.1:5432"]
        end
        
        subgraph Volumes["Persistent Storage"]
            Uploads["Local Directory\n./uploads:/app/uploads"]
            PGData["Docker Volume\ndocumind_postgres_data"]
        end
    end

    UserReq --> NginxProxy
    Static --> UserReq
    Proxy --> Backend
    Backend --> Postgres
    Backend --> Uploads
    Postgres --> PGData
```

### Alternative Architecture: PaaS (Render + Vercel)

- **Frontend**: Hosted on **Vercel** or **Netlify** with automatic Git deployments and global edge CDN caching.
- **Backend**: Hosted on **Render** using the blueprint in [`render.yaml`](file:///c:/Users/Surabhi%20Prakash/OneDrive/Desktop/SourceMind/render.yaml):
  - Web Service: `sourcemind-backend` running `npm start` with health check at `/health`.
  - Database: Managed PostgreSQL instance `sourcemind-postgres` linked directly to the service.

---

## 10. CI/CD Pipeline

Backend deployments to AWS EC2 are fully automated using **GitHub Actions** via `.github/workflows/deploy-backend.yml`:

```mermaid
flowchart LR
    Push["git push origin main\n(Paths: backend/**)"] --> Build["GitHub Actions Runner:\nDocker Buildx"]
    Build --> PushHub["Push Tagged Image to Docker Hub\n${DOCKERHUB_USERNAME}/documind-backend:latest"]
    PushHub --> SSH["appleboy/ssh-action:\nSSH into EC2 using Private Key"]
    SSH --> Deploy["Run Deployment Commands:\n1. docker-compose pull backend\n2. docker system prune -af\n3. docker-compose up -d backend"]
    Deploy --> Live["Zero-Downtime Live Backend"]
```

---

## 11. Environment & Configuration Matrix

### Backend Variables (`backend/.env`)

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `PORT` | No | Port on which the Express server listens | `5000` |
| `NODE_ENV` | Yes | Node runtime environment | `production` or `development` |
| `DATABASE_URL` | Yes | PostgreSQL connection string with credentials | `postgresql://user:pass@localhost:5432/documind` |
| `POSTGRES_USER` | Yes | Local Docker Postgres root user | `postgres` |
| `POSTGRES_PASSWORD` | Yes | Local Docker Postgres root password | `postgres` |
| `POSTGRES_DB` | Yes | Database name in PostgreSQL | `documind` |
| `JWT_SECRET` | Yes | Secret string used for signing access tokens | 64-character random string |
| `JWT_REFRESH_SECRET` | Yes | Secret string used for signing refresh tokens | 64-character random string |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for embeddings and chat | `AIzaSy...` |
| `RESEND_API_KEY` | Yes | Resend API key for OTP email delivery | `re_...` |
| `TAVILY_API_KEY` | Yes | Tavily API key for real-time news link resolution | `tvly-...` |
| `RAPIDAPI_KEY` | No | Optional key for fallback YouTube transcript extraction | String |
| `BATCH_SIZE` | No | Batch size for vector chunk embedding generation | `50` |
| `FRONTEND_URL` | Yes | Allowed client URL for CORS allowlisting | `https://documindai.dev` |

### Frontend Variables (`frontend/.env`)

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | Yes | Backend base URL for Axios client requests | `http://localhost:5000` or production URL |

---

*Document generated for SourceMind codebase. Maintained in the repository root for engineering and architectural reference.*
