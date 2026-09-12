# JNS Video Production Task Management

**Production-ready internal daily operations system for the JNS Video Production department.**

This is a purpose-built operational control system designed specifically for the daily cadence of JNS video programming: recurring show episodes, pilot concepts, external studio rentals, editing & graphics revision cycles, meetings, equipment requisitions, continuous improvements, and anonymous problem reporting.

---

## Key Features & Architecture

### 1. 5-Second Morning Operations Dashboard
- **Morning Pulse Metrics:** Real-time counts for Active In Pipeline, Overdue Tasks, Blocked Tasks, and Waiting for Approval.
- **My Tasks Today:** One-click quick status toggles (`Start`, `Done`, `Block`) directly from the home screen.
- **Active Blockers Banner:** Surfaces blocked production tasks with mandatory explanations and "Who can help" contacts.
- **Overdue Tasks Warning:** High-visibility alerts with direct links to affected episodes.
- **Waiting for Review & Approval:** Urgent review queue for producers.
- **Filming Schedule:** Daily and upcoming shoot calendar across shows, pilots, and studio rentals.
- **Production Email & Schedule Shortcuts:** One-click external links for `production@jns.org` and Google Calendar.

### 2. Core Episode Workflow State Machine
The workflow engine enforces strict linear stage progression:
1. **Stage 1 — Filming:** Scheduled shoot confirmed by Producer.
2. **Stage 2 — Files Uploaded:** Raw footage ingest confirmation with EditShare/Dropbox paths and card notes.
3. **Stage 3 — Producer Editing Package:** Producer compiles editing notes, script rundown, B-roll instructions, and graphics guidelines.
4. **Stage 4 — Unlimited Revision Cycle:**
   - Editor starts **Draft 1**, updates status, attaches review link (Frame.io, YouTube unlisted, Dropbox) and marks *Ready for Producer Review*.
   - Producer reviews draft:
     - **APPROVED:** Advances toward Final Producer Approval.
     - **REVISION REQUIRED:** Producer inputs revision notes. System automatically spawns **Draft N+1** assigned to Editor with previous review notes attached. Supports unlimited revisions with full history.
5. **Stage 5 — Final Producer Approval:** Explicit sign-off required by Producer before final render.
6. **Stage 6 — Final Delivery:** Video Editor renders master file and inputs YouTube and Dropbox URLs.
7. **Stage 7 — Published:** Producer confirms live publication. Marks episode `COMPLETED` and archives into searchable history.

### 3. Dedicated Operational Modules
- **Pilots Pipeline:** Pre-production through pilot delivery. Once status reaches `COMPLETED`, enables the **"Create Regular Show From Pilot"** conversion wizard to populate the Shows database.
- **Studio Rentals:** External client booking tracker (Bloomberg TV, Fox News, etc.) covering live TVU feeds, ProRes ISOs, client download links, and Finance billing handoff.
- **My Tasks:** Filterable by Today, Tomorrow, This Week, Overdue, In Progress, Blocked, and Completed with 1-click status transitions.
- **Continuous Improvements & Anonymous Complaints:**
   - Constructive suggestions submitted with author attribution.
   - Anonymous workflow problem reports strictly strip author metadata at the database layer (complete anonymity). Every report requires a mandatory constructive solution and meets a 100-word substantive threshold.
- **Equipment Requisitions:** Validates full product names or URLs (rejects vague submissions) with an administrative approval pipeline.
- **Editorial Meetings:** Captures executive summaries, topics discussed, decisions made, operational changes, and interactive action items.
- **Universal Search (Ctrl+K):** Client-side real-time modal indexing shows, episodes, pilots, rentals, clients, meetings, tasks, and equipment.
- **Admin Settings & RBAC:** Manage user roles and job functions, maintain the Shows database, and configure external schedule/email URLs.

---

## User Roles & Permission Matrix

| Capability | Team Member (Role A) | Producer (Role B) | Administrator |
|---|---|---|---|
| View assigned tasks & update status | ✓ | ✓ | ✓ |
| Submit equipment, ideas, improvements | ✓ | ✓ | ✓ |
| Submit anonymous problem reports | ✓ | ✓ | ✓ |
| Create episodes, pilots, rentals | ✕ | ✓ | ✓ |
| Compile producer editing package | ✕ | ✓ | ✓ |
| Review drafts & request revisions | ✕ | ✓ | ✓ |
| Give Final Producer Approval | ✕ | ✓ | ✓ |
| Mark episode Published | ✕ | ✓ | ✓ |
| Convert completed Pilot to Show | ✕ | ✓ | ✓ |
| Access Production Email shortcut | ✕ | ✓ | ✓ |
| Manage users, roles & job functions | ✕ | ✕ | ✓ |
| Manage shows database & settings | ✕ | ✕ | ✓ |

---

## Local Development & Setup

### Prerequisites
- Node.js (v20.x or higher)
- npm (v10.x or higher)

### Installation
```bash
# Clone repository and navigate to root
cd Tasks_Project

# Dependencies are pre-installed, or run:
npm install
```

### Running the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Persona Simulator (Development Mode)
Click the User Profile card at the bottom of the sidebar to instantly switch between:
1. **Yuri (Head of Video)** — *Administrator*
2. **Zach (Senior Producer)** — *Producer*
3. **Ryan (Lead Video Editor)** — *Team Member / Video Editor*
4. **Sarah (Motion Designer)** — *Team Member / Motion Graphics*
5. **David (Studio Operator)** — *Team Member / Studio Operator*

### Running the Automated Test Suite
To verify all 12 critical workflow rules and transition guards:
```bash
# With the dev server running:
Invoke-RestMethod -Uri "http://localhost:3000/api/test-workflow"
```
Or reset the database to clean demo data at any time via the "Reset Demo" button on the top navigation bar.
