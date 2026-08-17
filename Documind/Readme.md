# DocuMind

DocuMind is an AI-powered platform that allows users to **chat with documents and online content** using Retrieval-Augmented Generation (RAG).

Users can interact with **PDFs, websites, YouTube transcripts, and latest news articles**, enabling fast semantic search and contextual conversations over real-world content.

---

## Live Application

**Frontend:** https://documindai.dev

**Backend API:** https://api.mindchuk.co.in

---

## Features

- Chat with uploaded **PDF documents**
- Chat with **website content**
- Chat with **YouTube video transcripts**
- Fetch and chat with **latest news articles**
- **Vector semantic search** using embeddings
- **Persistent chat history**
- **Secure authentication** with refresh and access tokens
- **Forgot password** with OTP verification via Resend
- **OTP verification** using Resend email service

---

## Authentication & Security

### Token Management

**Access Token**
- Stored in **session memory** (NOT in cookie)
- Short-lived token for API requests
- Used in Authorization header

**Refresh Token**
- Stored in **HTTP-only cookie** (secure)
- Long-lived token for obtaining new access tokens
- Automatically sent with requests

### Password Recovery

- User requests password reset via email
- OTP sent via **Resend** email service
- User verifies OTP
- User sets new password

---

## How It Works

### RAG Pipeline

```
User Query
   ↓
Embedding Generation
   ↓
Vector Similarity Search (pgvector)
   ↓
Relevant Context Retrieval
   ↓
LLM Response Generation
```

Documents are chunked, embedded, stored in PostgreSQL, and retrieved using vector similarity search before generating answers.

### Latest News Feature

```
Google News RSS → fast article discovery
Tavily API     → reliable article extraction
```

- **Google News RSS** is used to retrieve latest article links quickly (very fast and lightweight)
- **Tavily API** extracts clean article content (some RSS links cannot be reliably opened using standard scraping)
- Extracted content is then used for chat

**Required environment variable:**
```
TAVILY_API_KEY
```

---

## System Architecture

```
User
  ↓
Frontend (Netlify)
  ↓
Backend API
  ↓
Nginx Reverse Proxy
  ↓
Node.js Backend (Docker)
  ↓
PostgreSQL + pgvector
```

---

## Deployment Architecture

Backend runs on **AWS EC2 using Docker Compose**.

Server structure:
```
EC2 SERVER
│
├── documind/backend
│   ├── docker-compose.yml
│   ├── .env
│   └── uploads/
│
├── containers
│   ├── documind-postgres
│   └── documind-backend
│
└── docker volume
    └── documind_postgres_data
```

Persistence:
```
Database → Docker volume
Uploads  → EC2 filesystem
```

---

## Tech Stack

### Frontend
- React
- Vite
- TailwindCSS
- Netlify

### Backend
- Node.js
- Express
- Prisma
- Port: 5000

### Database
- PostgreSQL
- pgvector

### AI
- Gemini models
- Gemini embeddings

### Infrastructure
- Docker
- Docker Compose
- AWS EC2
- Nginx
- GitHub Actions

### External APIs
- Google News RSS
- Tavily API
- Resend (for OTP email delivery)

---

## CI/CD Pipeline

Backend deployments are automated using **GitHub Actions**.

```
Push Code
   ↓
Build Docker Image
   ↓
Push Image to DockerHub
   ↓
SSH into EC2
   ↓
Pull latest image
   ↓
Restart backend container
```

This updates the backend without affecting stored data.

---

## Security

The backend API is secured using **HTTPS with Let's Encrypt SSL certificates**.

```
https://api.mindchuk.co.in
```

Nginx also redirects HTTP traffic to HTTPS.

---

## Project Summary

DocuMind combines:
- **RAG-based AI retrieval**
- **vector similarity search**
- **multi-source content analysis**
- **secure token-based authentication** (refresh token in cookie, access token in session)
- **password recovery with OTP verification** via Resend
- **automated cloud deployment**

to create a production-ready platform for interacting with documents and real-time web content.