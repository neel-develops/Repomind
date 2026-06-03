# Software Requirements Specification (SRS)

## Project Name: RepoMind
**Subtitle:** AI-Powered GitHub Repository Intelligence Dashboard
**Author:** Technical Lead / Solutions Architect
**Context:** VSQC Web Development & Data Engineering Internship Assignment

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for RepoMind, an AI-powered GitHub Repository Intelligence Dashboard. It defines the external interfaces, system features, database models, and operational capabilities of the platform.

### 1.2 Scope
RepoMind is a web-based, full-stack application. The product utilizes a FastAPI backend running on Python 3.14+ to process and transform live data fetched from the GitHub REST API. The database layer consists of PostgreSQL with Prisma acting as the Object-Relational Mapper (ORM). The frontend is built on Next.js, styled with Tailwind CSS, utilizing TypeScript for static typing and Recharts for interactive visualization.

### 1.3 Definitions, Acronyms, and Abbreviations
* **API:** Application Programming Interface
* **CRUD:** Create, Read, Update, Delete
* **ORM:** Object-Relational Mapping
* **PR:** Pull Request
* **SaaS:** Software as a Service
* **SRS:** Software Requirements Specification
* **TRD:** Technical Requirements Document

---

## 2. Overall Description

### 2.1 Product Perspective
RepoMind functions as an intermediary analytics layer between raw GitHub API developer statistics and corporate decision-makers. It aggregates data across multiple GitHub REST endpoints, validates schemas, runs data transformations, computes intelligence scores, and persists observations in PostgreSQL.

```
                    ┌────────────────────────┐
                    │     GitHub REST API    │
                    └───────────┬────────────┘
                                │ Live REST Data
                                ▼
                    ┌────────────────────────┐
                    │    FastAPI Backend     │
                    │   - Validation Layer   │
                    │   - Transform Pipeline │
                    │   - Scoring Engine     │
                    └──────┬──────────┬──────┘
            DB Reads/Writes│          │ REST APIs (JSON)
                           ▼          ▼
            ┌──────────────────┐  ┌──────────────────┐
            │   PostgreSQL     │  │  Next.js App     │
            │  (via Prisma)    │  │  - Dashboard UI  │
            └──────────────────┘  └──────────────────┘
```

### 2.2 Operating Environment
* **Server Operating System:** Linux (Ubuntu 22.04 LTS / Railway Environment) / local Windows 11.
* **Database System:** PostgreSQL 15+.
* **Client Browser Compatibility:** Chrome, Safari, Edge, and Firefox (latest stable versions).
* **Language Runtime:** Node.js v24+, Python 3.14+.

### 2.3 Design and Implementation Constraints
* **GitHub Rate Limits:** The system must restrict request frequencies and handle unauthenticated limit errors (60 requests/hr) by requesting an optional `GITHUB_TOKEN` to unlock 5,000 requests/hr.
* **No Local Filesystem Caching:** The application must remain stateless to support scaling, storing all persistent data in PostgreSQL.

---

## 3. External Interface Requirements

### 3.1 User Interfaces
* **Color Palette:** Professional Slate/Gray tones.
* **Typography:** Geometric layout with variable sans-serif font family.
* **Animations:** Framer Motion transitions (fade, slide) capped at 300ms execution times.

### 3.2 Software Interfaces
* **GitHub REST API:** Interfaces with:
  * `/repos/{owner}/{repo}` (Repository Core Info)
  * `/repos/{owner}/{repo}/stats/contributors` or `/repos/{owner}/{repo}/contributors` (Contributor statistics)
  * `/repos/{owner}/{repo}/languages` (Language breakdowns)
  * `/repos/{owner}/{repo}/issues` (Issue details)
  * `/repos/{owner}/{repo}/pulls` (Pull request details)
* **Prisma Engine:** Integrates Python ORM to query the PostgreSQL instances.

---

## 4. System Features

### 4.1 Feature 1: Repository Search and Validation
* **Description:** Parses search inputs and verifies repository accessibility before running analytics.
* **Sequence of Operation:**
  1. User inputs `owner/repo` string (e.g., `vercel/next.js`) in the frontend search bar.
  2. Frontend performs regex checks: `^[a-zA-Z0-9-_\.]+/[a-zA-Z0-9-_\.]+$`. If invalid, shows warning immediately.
  3. Valid strings are sent to backend `/api/repo/search?query=owner/repo`.
  4. Backend queries GitHub API `/repos/{owner}/{repo}`.
  5. If repo exists, data proceeds to transformation. If rate-limited or not found, returns a corresponding HTTP status (403, 404).

### 4.2 Feature 2: Data Transformation and Scoring Engine
* **Description:** Transforms nested raw JSON structures from GitHub into analytical metrics.
* **Processing Logic:**
  * **Popularity Calculation:** Weighted average of logged values for Stars (50%), Forks (30%), and Watchers (20%).
  * **Activity Calculation:** Scored on update recency (30%), commits in 30 days (40%), and PR status (30%).
  * **Health Calculation:** Evaluates closed issues vs total issues (40%), closed PRs vs total PRs (30%), community factors (15%), and update recency (15%).

### 4.3 Feature 3: Saved Observations Database CRUD
* **Description:** Persists qualitative user assessments regarding analyzed repositories.
* **Functional Capabilities:**
  * **Create:** Save an observation for a specific repository: `name`, `note`, `priority` (`High`, `Medium`, `Low`).
  * **Read:** Fetch saved observations list, supporting search strings, sorting by priority or date, and filtering by repository name.
  * **Update:** Edit note text and change priority fields.
  * **Delete:** Clear records from the Database.
