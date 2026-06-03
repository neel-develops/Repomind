# Product Requirements Document (PRD)

## Project Name: RepoMind
**Subtitle:** AI-Powered GitHub Repository Intelligence Dashboard
**Author:** Technical Lead / Solutions Architect
**Context:** VSQC Web Development & Data Engineering Internship Assignment

---

## 1. Executive Summary
RepoMind is a comprehensive, full-stack intelligence platform that transforms raw GitHub repository data into high-level business and health insights. Instead of displaying cluttered JSON files or simple star counts, RepoMind parses live GitHub REST API endpoints and pushes them through a dedicated validation, transformation, and scoring engine. This generates three standardized scores: **Popularity**, **Activity**, and **Health**. The app also provides a robust observations interface, allowing users to save, prioritize, and manage notes about repositories via a persistent PostgreSQL database.

---

## 2. Problem Statement
For technology managers, software architects, and internship evaluators, assessing the suitability of open-source libraries or auditing a company's internal repositories is time-consuming. Raw metrics such as "15,000 stars" or "320 open issues" do not explain the actual health, update frequency, or developer engagement of a repository. There is a clear need for a tool that:
1. **Aggregates** multiple GitHub endpoints (commits, issues, contributors, language breakdown).
2. **Translates** raw numbers into actionable scores (0-100) using proven data engineering logic.
3. **Persists** qualitative developer observations with custom prioritizations to aid architectural decision-making.

---

## 3. Scope & User Persona

### 3.1 Target Audience / Personas
* **Tech Evaluator / Internship Judge:** Needs to quickly assess if an applicant's repository is well-maintained, how active the contributions are, and review the structural engineering quality.
* **Solutions Architect / Tech Lead:** Evaluates third-party libraries for production systems based on license compliance, community size, and issue-resolution speed.
* **Product Manager:** Tracks community interest and technology trends in specific spaces.

### 3.2 Out of Scope (Version 1.0)
* Repository-to-repository side-by-side comparison charts (planned for v1.1).
* Writing automated PR comments directly from the dashboard.
* Support for private repositories requiring user OAuth login (v1.0 uses a system-level token for public endpoints).

---

## 4. Functional Requirements

### 4.1 Repository Search & Discovery
* **FR-1.1:** The user must be able to search for any public repository using the `owner/repo-name` format (e.g., `facebook/react`).
* **FR-1.2:** The application must fetch and display the following core fields from the GitHub API:
  * Repository Name & Description
  * Owner Details (Avatar, Username)
  * Star, Fork, and Watcher counts
  * Open Issues count
  * Default Branch name
  * Primary Programming Language
  * License type (e.g., MIT, Apache-2.0)
  * Creation Date and Last Updated Date

### 4.2 Scoring & Analytics Engine
* **FR-2.1 Popularity Score:** Compute a 0-100 score utilizing stars, forks, and watchers. Must use a logarithmic distribution model so that young, growing repos are not drowned out by massive projects.
* **FR-2.2 Activity Score:** Compute a 0-100 score measuring commits in the last 30 days, recent pull requests, issue volume, and recency of updates.
* **FR-2.3 Health Score:** Compute a 0-100 score highlighting stability, combining the issue resolution ratio (closed/total issues), PR merge ratio, update frequency, and basic community flags (presence of a license, code-of-conduct).
* **FR-2.4 Contributor Analysis:** Expose contributor count, top contributors list, and visual breakdown of contribution distributions.
* **FR-2.5 Technology Analysis:** Breakdown the exact language usage percentages.

### 4.3 Interactive Data Visualizations
* **FR-3.1:** Display a **Language Distribution Chart** showing the percentage breakdown of different programming languages.
* **FR-3.2:** Display a **Stars vs. Forks Comparison Chart** comparing the social interest (stars) with active fork interest.
* **FR-3.3:** Display a **Contributor Distribution Chart** mapping the contribution count of top contributors.
* **FR-3.4:** Display a **Repository Health Indicator** gauge or card layout illustrating the 3 computed intelligence scores.

### 4.4 Save Insights & Observations (CRUD)
* **FR-4.1 Create:** Users can write an observation note for a searched repository, choosing a priority level: `High`, `Medium`, or `Low`.
* **FR-4.2 Read:** Display all saved repository observations in a unified dashboard.
* **FR-4.3 Update:** Enable inline or modal-based editing of the note content and priority levels.
* **FR-4.4 Delete:** Enable safe deletion of observations with a confirmation prompt.
* **FR-4.5 Persist:** Save all data into a PostgreSQL database, tracking creation and update timestamps.

### 4.5 Saved Insights Dashboard
* **FR-5.1 Search:** Text search across saved observations (by repository name or note contents).
* **FR-5.2 Sort:** Sort saved insights by date created, date updated, or priority levels.
* **FR-5.3 Filter:** Filter insights by repository name or priority (`High`, `Medium`, `Low`).

---

## 5. Non-Functional Requirements

### 5.1 Design & UX Aesthetics
* **NFR-1.1:** Modern dark-mode-first aesthetic with a clean, premium enterprise layout.
* **NFR-1.2:** Responsive layout adapting cleanly to mobile, tablet, and desktop screens.
* **NFR-1.3:** Micro-animations (e.g., hover scaling, slide-in filters, loading skeleton states) using Framer Motion.
* **NFR-1.4:** High contrast text and clear typographic scale using a geometric font family.

### 5.2 Performance & Limits
* **NFR-2.1:** Low API latency by caching GitHub API raw payloads in Redis/Database (optional) or in-memory, avoiding redundant network requests.
* **NFR-2.2:** Proper handling of GitHub's REST API rate limits (60/hr for unauthenticated, 5000/hr for authenticated).

### 5.3 Error Handling & Security
* **NFR-3.1:** API rate limit exceptions must trigger a clear banner informing the user of the rate limit reset time.
* **NFR-3.2:** Non-existent or private repository searches must fail gracefully with a "Repository not found" alert, rather than breaking the UI.
* **NFR-3.3:** SQL queries must be parameterized via Prisma ORM to prevent SQL injection.
