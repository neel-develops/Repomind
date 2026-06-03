# Technical Requirements Document (TRD)

## Project Name: RepoMind
**Subtitle:** AI-Powered GitHub Repository Intelligence Dashboard
**Author:** Technical Lead / Solutions Architect
**Context:** VSQC Web Development & Data Engineering Internship Assignment

---

## 1. System Architecture & Tech Stack

RepoMind implements a separated client-server architecture with a clear data processing pipeline.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                        │
│   - Next.js 14+ (App Router)             - TypeScript                  │
│   - Tailwind CSS (Premium Dark Mode)     - Framer Motion (Transitions) │
│   - Recharts (Data Visualizations)       - ShadCN UI (Components)      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS REST Calls
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI)                            │
│   - Python 3.14+                         - FastAPI Web Server          │
│   - Pydantic (Schema Validation)         - Prisma Client Py (ORM)      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Database Queries
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          DATABASE (PostgreSQL)                         │
│   - PostgreSQL 15+                       - Entity-Relationship Storage │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Engineering & Transformation Pipeline

The data engineering pipeline processes raw REST data from GitHub in five sequential phases:

```
[Raw GitHub REST Data] 
         │
         ▼
[Validation Layer] ──(Checks schemas, rate limits, and missing fields)
         │
         ▼
[Transformation Layer] ──(Flattens and processes nested GitHub payloads)
         │
         ▼
[Analytics & Aggregation] ──(Generates technology stacks and contributor spreads)
         │
         ▼
[Scoring Engine] ──(Calculates 0-100 Popularity, Activity, and Health metrics)
         │
         ▼
[Database Persistence] ──(Caches repo data and saves user observations)
```

### 2.1 Scoring Engine Specifications

#### A. Popularity Score ($P$)
Evaluates repository social traction and reach. Utilizes a logarithmic transformation to handle huge ranges in stars without drowning out smaller projects.

$$P = \min\left(100, 30 \times \ln(1 + \text{stars}) + 20 \times \ln(1 + \text{forks}) + 10 \times \ln(1 + \text{watchers})\right)$$

*Note:* $P$ is rounded to the nearest integer.

#### B. Activity Score ($A$)
Evaluates development momentum in the last 30 days.

$$A = 0.4 \times S_{\text{commits}} + 0.3 \times S_{\text{PRs}} + 0.3 \times S_{\text{updates}}$$

Where:
* $S_{\text{commits}} = \min(100, \text{Commits in 30 days} \times 2)$
* $S_{\text{PRs}} = \min(100, \text{Opened/Closed PRs in 30 days} \times 4)$
* $S_{\text{updates}} = \max(0, 100 - (\text{Days since last update} \times 3))$

#### C. Health Score ($H$)
Evaluates maintenance status and community stability.

$$H = 0.4 \times S_{\text{issue-resolution}} + 0.3 \times S_{\text{PR-resolution}} + 0.15 \times S_{\text{updates}} + 0.15 \times S_{\text{community}}$$

Where:
* $S_{\text{issue-resolution}} = \frac{\text{Closed Issues}}{\text{Open Issues} + \text{Closed Issues}} \times 100$ (If total issues = 0, default to 100)
* $S_{\text{PR-resolution}} = \frac{\text{Closed/Merged PRs}}{\text{Open PRs} + \text{Closed PRs}} \times 100$ (If total PRs = 0, default to 100)
* $S_{\text{updates}} = \max(0, 100 - (\text{Days since last update} \times 2))$
* $S_{\text{community}} = S_{\text{license}} + S_{\text{contrib\_size}}$
  * $S_{\text{license}} = 50$ points if a valid license is present, else $0$ points.
  * $S_{\text{contrib\_size}} = \min(50, \text{Total Contributor Count} \times 2.5)$

---

## 3. Database Schema

The schema is defined in a `schema.prisma` file, implementing PostgreSQL entities with strict primary/foreign key relations.

```prisma
// Database Provider Configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-py"
}

// Repositories Table
model Repository {
  id              String   @id @default(uuid())
  githubId        Int      @unique
  fullName        String   @unique // e.g. "facebook/react"
  name            String
  ownerName       String
  ownerAvatarUrl  String
  description     String?
  stars           Int
  forks           Int
  watchers        Int
  openIssues      Int
  defaultBranch   String
  primaryLanguage String?
  license         String?
  createdDate     DateTime
  lastUpdatedDate DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  insights        Insight[]
}

// Insights Table
model Insight {
  id           String      @id @default(uuid())
  repoId       String
  note         String
  priority     String      // "High" | "Medium" | "Low"
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  // Relations
  repository   Repository  @relation(fields: [repoId], references: [id], onDelete: Cascade)
}
```

---

## 4. API Endpoint Specifications

All response payloads must be in JSON format.

### 4.1 Repository Intelligence Endpoints

#### GET `/api/repo/search`
Queries details for a public repository and returns calculated intelligence scores.

* **Parameters:** `query=owner/repo` (e.g., `facebook/react`)
* **Response Status:** `200 OK` (success), `404 Not Found` (invalid repository), `403 Forbidden` (rate limited).
* **Response Schema:**
```json
{
  "repository": {
    "fullName": "facebook/react",
    "name": "react",
    "owner": "facebook",
    "ownerAvatarUrl": "https://avatars.githubusercontent.com/... ",
    "description": "...",
    "stars": 224000,
    "forks": 45000,
    "watchers": 224000,
    "openIssues": 1200,
    "defaultBranch": "main",
    "primaryLanguage": "JavaScript",
    "license": "MIT",
    "createdDate": "2013-05-24T16:15:54Z",
    "lastUpdatedDate": "2026-06-02T12:00:00Z"
  },
  "scores": {
    "popularity": 98,
    "activity": 85,
    "health": 92
  },
  "technology": {
    "languages": {
      "JavaScript": 94.2,
      "HTML": 3.8,
      "CSS": 2.0
    }
  },
  "contributors": {
    "totalCount": 1640,
    "topContributors": [
      { "login": "zpao", "contributions": 1780 },
      { "login": "gaearon", "contributions": 1620 }
    ]
  }
}
```

---

### 4.2 Saved Insights CRUD Endpoints

#### POST `/api/insights`
Saves a new observation.

* **Request Body:**
```json
{
  "repoFullName": "facebook/react",
  "note": "Excellent open source repository.",
  "priority": "High"
}
```
* **Response Status:** `201 Created`

#### GET `/api/insights`
Retrieves saved insights list.

* **Parameters:**
  * `query`: Search note text (optional)
  * `priority`: "High" | "Medium" | "Low" (optional)
  * `sortBy`: "createdAt" | "priority" (optional)
* **Response Status:** `200 OK`

#### PUT `/api/insights/{id}`
Modifies an existing note or priority.

* **Request Body:**
```json
{
  "note": "Updated note context.",
  "priority": "Medium"
}
```
* **Response Status:** `200 OK`

#### DELETE `/api/insights/{id}`
Deletes an observation from the database.

* **Response Status:** `200 OK`

---

## 5. Technical Error Handling Strategy

1. **Invalid Repository (404):** Returns `{ "error": "Repository not found on GitHub." }`.
2. **API Rate Limiting (403):** Returns `{ "error": "GitHub API rate limit exceeded.", "resetTime": "ISO-TIMESTAMP" }` mapping from `x-ratelimit-reset` header.
3. **Database Connection Failures (500):** If PostgreSQL is down, the FastAPI service catches the exception and returns `{ "error": "Database connectivity issue. Please try again later." }`.
4. **Network/Offline Mode (503):** Graceful recovery UI banners showing cached versions of searched repositories if available in the PostgreSQL cache.
