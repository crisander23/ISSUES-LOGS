# 2DOC Issues Log — Full SaaS Build Specification

> **Instructions for AI Agent:**
> This document is the single source of truth for building the 2DOC Issues Log SaaS application.
> Read every section fully before writing any code. Do not skip sections.
> Follow the tech stack, schema, and UI decisions exactly as written.
> When in doubt, refer back to this document — do not invent requirements.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema & Migrations](#4-database-schema--migrations)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [SMTP & Email Configuration](#6-smtp--email-configuration)
7. [Role System](#7-role-system)
8. [Feature Specification](#8-feature-specification)
9. [API Routes](#9-api-routes)
10. [UI/UX Design System](#10-uiux-design-system)
11. [Page & Screen Inventory](#11-page--screen-inventory)
12. [Environment Variables](#12-environment-variables)
13. [Seed Data](#13-seed-data)
14. [Deployment Notes](#14-deployment-notes)

---

## 1. Product Overview

**Product Name:** 2DOC Issues Log
**Tagline:** Clean issue tracking for software teams.

### What it is
2DOC Issues Log is a multi-tenant SaaS application for tracking software issues through a QA → Developer → QA workflow. Each team (tenant) has one project workspace. Inside a workspace, issues are logged by QA testers, resolved by developers, and closed by QA. The Project Manager oversees everything and configures the workspace.

### Core Workflow
```
QA raises issue (Open)
    → DEV fills resolution + submits to QA (Pending)
        → QA verifies + closes (Closed)
```

### Multi-tenancy Model
- One **Organization** = one tenant = one workspace
- Each organization has exactly **one project** in the initial version
- Users belong to one organization and have one role within it
- Organizations are fully isolated — users cannot see other orgs' data

---

## 2. Tech Stack

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js 5
- **Language:** TypeScript
- **ORM:** Prisma 5
- **Database:** PostgreSQL 16
- **Auth:** JWT (access token 15min + refresh token 7d stored in httpOnly cookie)
- **Password hashing:** bcrypt (12 rounds)
- **Email:** Nodemailer with configurable SMTP transport
- **Validation:** Zod
- **File uploads:** Multer (for future attachment support)
- **Rate limiting:** express-rate-limit

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (customized)
- **State management:** Zustand
- **Data fetching:** TanStack Query v5
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React
- **Fonts:** DM Sans + DM Mono (Google Fonts)

### Infrastructure
- **Database hosting:** Supabase (PostgreSQL) or Railway
- **Backend hosting:** Railway or Render
- **Frontend hosting:** Vercel
- **Email:** Configurable SMTP (supports Gmail, Resend, SendGrid, custom)

### Dev Tools
- **Package manager:** pnpm
- **Monorepo:** Turborepo
- **API documentation:** auto-generated with swagger-jsdoc
- **Testing:** Vitest (unit) + Playwright (e2e)
- **Linting:** ESLint + Prettier

---

## 3. Project Structure

```
2doc-issues-log/
├── apps/
│   ├── web/                        # Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── (auth)/             # Auth group — no sidebar layout
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   ├── forgot-password/
│   │   │   │   ├── reset-password/
│   │   │   │   └── invite/[token]/ # Accept invitation
│   │   │   ├── (app)/              # App group — with sidebar layout
│   │   │   │   ├── layout.tsx      # Main app shell (sidebar + topbar)
│   │   │   │   ├── board/          # Kanban board view
│   │   │   │   ├── list/           # List view
│   │   │   │   ├── overview/       # PM dashboard (PM only)
│   │   │   │   └── settings/       # Settings pages (PM only)
│   │   │   │       ├── project/
│   │   │   │       ├── systems/
│   │   │   │       ├── team/
│   │   │   │       └── smtp/
│   │   │   └── api/                # Next.js API routes (thin proxy to backend)
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── issues/             # Issue-specific components
│   │   │   │   ├── IssueCard.tsx
│   │   │   │   ├── IssueModal.tsx
│   │   │   │   ├── QAForm.tsx
│   │   │   │   ├── DevResolveForm.tsx
│   │   │   │   └── CloseIssueForm.tsx
│   │   │   ├── board/
│   │   │   │   ├── KanbanBoard.tsx
│   │   │   │   ├── KanbanColumn.tsx
│   │   │   │   └── ColumnPager.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Topbar.tsx
│   │   │   │   └── RoleGuard.tsx
│   │   │   └── settings/
│   │   ├── lib/
│   │   │   ├── api.ts              # Axios instance
│   │   │   ├── auth.ts             # Auth helpers
│   │   │   └── queryClient.ts
│   │   └── stores/
│   │       ├── authStore.ts
│   │       └── projectStore.ts
│   └── api/                        # Express backend
│       ├── src/
│       │   ├── index.ts            # Entry point
│       │   ├── config/
│       │   │   ├── env.ts          # Env validation with Zod
│       │   │   └── smtp.ts         # SMTP transport factory
│       │   ├── middleware/
│       │   │   ├── auth.ts         # JWT verify middleware
│       │   │   ├── roleGuard.ts    # Role-based access middleware
│       │   │   ├── rateLimiter.ts
│       │   │   └── errorHandler.ts
│       │   ├── routes/
│       │   │   ├── auth.routes.ts
│       │   │   ├── issues.routes.ts
│       │   │   ├── project.routes.ts
│       │   │   ├── systems.routes.ts
│       │   │   ├── members.routes.ts
│       │   │   └── smtp.routes.ts
│       │   ├── controllers/
│       │   ├── services/
│       │   │   ├── auth.service.ts
│       │   │   ├── email.service.ts
│       │   │   ├── issue.service.ts
│       │   │   └── invite.service.ts
│       │   └── utils/
│       │       ├── jwt.ts
│       │       └── pagination.ts
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
└── packages/
    ├── types/                      # Shared TypeScript types
    │   └── src/index.ts
    └── config/                     # Shared ESLint/TS config
```

---

## 4. Database Schema & Migrations

### Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────

enum UserRole {
  PM
  QA
  DEV
}

enum IssueStatus {
  Open
  Pending
  Closed
}

enum IssueCategory {
  Critical
  High
  Medium
  Low
}

enum IssueType {
  SW
  C
  HW
}

enum IssuePriority {
  P1
  P2
  P3
  P4
}

enum InviteStatus {
  Pending
  Accepted
  Expired
}

enum SmtpEncryption {
  TLS
  SSL
  NONE
}

// ─── MODELS ───────────────────────────────────────────────────────────────────

model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique              // URL-safe org identifier
  code        String   @default("ORG")     // Short code e.g. "NDDCC"
  description String?
  logoUrl     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
  project     Project?
  invites     Invite[]
  smtpConfig  SmtpConfig?

  @@map("organizations")
}

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String
  firstName      String
  lastName       String
  avatarUrl      String?
  role           UserRole
  isActive       Boolean  @default(true)
  isEmailVerified Boolean @default(false)
  emailVerifyToken String? @unique
  emailVerifyExpiry DateTime?
  passwordResetToken String? @unique
  passwordResetExpiry DateTime?
  lastLoginAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  reportedIssues Issue[] @relation("ReportedBy")
  assignedIssues Issue[] @relation("AssignedTo")
  closedIssues   Issue[] @relation("ClosedBy")
  refreshTokens  RefreshToken[]
  activityLogs   ActivityLog[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@map("refresh_tokens")
}

model Project {
  id             String   @id @default(cuid())
  name           String
  description    String?
  organizationId String   @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  systems        System[]
  issues         Issue[]

  @@map("projects")
}

model System {
  id        String   @id @default(cuid())
  name      String
  order     Int      @default(0)           // Display order
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  issues    Issue[]

  @@unique([projectId, name])
  @@map("systems")
}

model Issue {
  id          String        @id @default(cuid())
  ticketNumber String                               // e.g. IF001 — unique within org
  description  String
  resolution   String?
  category     IssueCategory
  priority     IssuePriority @default(P4)
  type         IssueType     @default(SW)
  appModule    String?
  status       IssueStatus   @default(Open)
  remarks      String?                              // For Pending status only
  daysOpen     Int           @default(0)            // Computed, updated on close

  dateRaised       DateTime  @default(now())
  dateSubmittedToQA DateTime?                       // DEV fills this
  dateClosed       DateTime?                        // QA fills this

  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  systemId   String
  system     System   @relation(fields: [systemId], references: [id])

  reportedById String
  reportedBy   User   @relation("ReportedBy", fields: [reportedById], references: [id])

  assignedToId String?
  assignedTo   User?  @relation("AssignedTo", fields: [assignedToId], references: [id])

  closedById String?
  closedBy   User?  @relation("ClosedBy", fields: [closedById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  activityLogs ActivityLog[]

  @@unique([projectId, ticketNumber])
  @@map("issues")
}

model Invite {
  id             String       @id @default(cuid())
  email          String
  role           UserRole
  token          String       @unique @default(cuid())
  status         InviteStatus @default(Pending)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invitedById    String
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime     @default(now())

  @@map("invites")
}

model SmtpConfig {
  id             String         @id @default(cuid())
  organizationId String         @unique
  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  host           String
  port           Int            @default(587)
  encryption     SmtpEncryption @default(TLS)
  username       String
  passwordEncrypted String                          // AES-256 encrypted, never plain
  fromName       String
  fromEmail      String
  isVerified     Boolean        @default(false)     // True after test send succeeds
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@map("smtp_configs")
}

model ActivityLog {
  id          String   @id @default(cuid())
  action      String                               // e.g. "issue.created", "issue.resolved"
  description String                               // Human-readable: "Alice logged IF012"
  metadata    Json?                                // Extra data (old/new values etc.)
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  issueId     String?
  issue       Issue?   @relation(fields: [issueId], references: [id], onDelete: SetNull)
  createdAt   DateTime @default(now())

  @@map("activity_logs")
}
```

### Migration Files

#### Migration 1: `001_init`

Run: `npx prisma migrate dev --name init`

This generates the initial migration from the schema above. The agent should run this command — do not manually write the SQL. Prisma will generate it correctly from the schema.

#### Migration 2: `002_add_ticket_counter`

Add a counter table to auto-increment ticket numbers per project:

```prisma
model TicketCounter {
  id        String @id @default(cuid())
  projectId String @unique
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  count     Int    @default(0)

  @@map("ticket_counters")
}
```

Update `Project` model to include: `ticketCounter TicketCounter?`

Run: `npx prisma migrate dev --name add_ticket_counter`

#### Ticket Number Generation

```typescript
// services/issue.service.ts
async function generateTicketNumber(projectId: string): Promise<string> {
  const counter = await prisma.ticketCounter.upsert({
    where: { projectId },
    update: { count: { increment: 1 } },
    create: { projectId, count: 1 },
  });
  return `IF${String(counter.count).padStart(3, '0')}`;
}
```

---

## 5. Authentication & Authorization

### Registration Flow (Organization Owner = PM)

```
POST /api/auth/register
Body: { firstName, lastName, email, password, organizationName }

Server:
  1. Validate all fields with Zod
  2. Check email uniqueness
  3. Slugify organizationName → org.slug (ensure uniqueness)
  4. Hash password with bcrypt(12)
  5. Create Organization record
  6. Create User record with role=PM, isEmailVerified=false
  7. Create Project record linked to organization
  8. Create TicketCounter for the project
  9. Generate emailVerifyToken (crypto.randomBytes(32).toString('hex'))
  10. Set emailVerifyExpiry = now + 24h
  11. Send verification email via SMTP (use platform SMTP until org sets own)
  12. Return 201: { message: "Check your email to verify your account" }
```

### Email Verification Flow

```
GET /api/auth/verify-email?token=<token>

Server:
  1. Find user by emailVerifyToken
  2. Check token not expired
  3. Set isEmailVerified=true, clear token fields
  4. Return redirect to /login?verified=true
```

### Login Flow

```
POST /api/auth/login
Body: { email, password }

Server:
  1. Find user by email
  2. Check isActive=true
  3. Check isEmailVerified=true (return 403 with resend link if not)
  4. Compare password with bcrypt
  5. Generate accessToken (JWT, 15min, payload: { userId, orgId, role })
  6. Generate refreshToken (random 64-byte hex, stored in DB with 7d expiry)
  7. Set refreshToken in httpOnly, Secure, SameSite=Strict cookie (7d)
  8. Update user.lastLoginAt
  9. Return 200: { accessToken, user: { id, firstName, lastName, email, role, organization: { id, name, slug } } }
```

### Token Refresh Flow

```
POST /api/auth/refresh

Server:
  1. Read refreshToken from httpOnly cookie
  2. Find in DB, check not expired
  3. Issue new accessToken
  4. Rotate refreshToken (delete old, create new, update cookie)
  5. Return 200: { accessToken }
```

### Logout Flow

```
POST /api/auth/logout

Server:
  1. Read refreshToken from cookie
  2. Delete RefreshToken record from DB
  3. Clear cookie
  4. Return 200
```

### Forgot Password Flow

```
POST /api/auth/forgot-password
Body: { email }

Server:
  1. Find user (silently succeed even if not found — anti-enumeration)
  2. Generate passwordResetToken (crypto.randomBytes(32).toString('hex'))
  3. Set passwordResetExpiry = now + 1h
  4. Send password reset email
  5. Return 200: { message: "If that email exists, a reset link was sent." }
```

### Reset Password Flow

```
POST /api/auth/reset-password
Body: { token, newPassword }

Server:
  1. Find user by passwordResetToken
  2. Check token not expired
  3. Validate newPassword (min 8 chars, 1 uppercase, 1 number, 1 special)
  4. Hash new password
  5. Update user.passwordHash, clear reset token fields
  6. Invalidate all refresh tokens for this user (delete from DB)
  7. Send confirmation email
  8. Return 200
```

### Invitation Flow

```
PM invites a team member:
POST /api/members/invite
Body: { email, role }   // role: QA or DEV

Server:
  1. Verify caller is PM
  2. Check user doesn't already exist in this org
  3. Create Invite record (token=cuid(), expiresAt=now+48h)
  4. Send invite email with link: {APP_URL}/invite/{token}
  5. Return 201: { message: "Invite sent" }

Accepting invite:
GET /api/auth/invite/{token}   → validates token, returns { email, orgName, role }

POST /api/auth/invite/{token}/accept
Body: { firstName, lastName, password }

Server:
  1. Find invite by token, check status=Pending and not expired
  2. Create User record with org + role from invite
  3. Set isEmailVerified=true (email already verified via invite)
  4. Mark invite as Accepted
  5. Send welcome email
  6. Auto-login (issue tokens)
  7. Return 200 with tokens
```

### JWT Middleware

```typescript
// middleware/auth.ts
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, orgId, role }
    next();
  } catch {
    // Try refresh — frontend should handle 401 and call /refresh
    return res.status(401).json({ error: 'Token expired' });
  }
};
```

### Role Guard Middleware

```typescript
// middleware/roleGuard.ts
export const requireRole = (...roles: UserRole[]) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  }
  next();
};

// Usage in routes:
router.post('/systems', requireAuth, requireRole('PM'), createSystem);
router.patch('/issues/:id/resolve', requireAuth, requireRole('DEV'), resolveIssue);
router.patch('/issues/:id/close', requireAuth, requireRole('QA', 'PM'), closeIssue);
```

---

## 6. SMTP & Email Configuration

### SMTP Config Architecture

Each organization stores their own SMTP credentials in `smtp_configs`. The platform has a **fallback SMTP** (env vars) used for:
- Verification emails before org is set up
- Invite emails when org SMTP isn't configured yet

Organization SMTP is used for:
- All notifications once configured and verified

### SMTP Service

```typescript
// config/smtp.ts
import nodemailer from 'nodemailer';
import { SmtpConfig } from '@prisma/client';
import { decrypt } from '../utils/crypto';

// Platform fallback transport (used before org SMTP is configured)
export const getPlatformTransport = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_ENCRYPTION === 'SSL',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Org-specific transport (built from DB config)
export const getOrgTransport = (config: SmtpConfig) => nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.encryption === 'SSL',
  requireTLS: config.encryption === 'TLS',
  auth: {
    user: config.username,
    pass: decrypt(config.passwordEncrypted), // AES-256-GCM decrypt
  },
});
```

### Encryption of SMTP Password

```typescript
// utils/crypto.ts
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32-byte key

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(stored: string): string {
  const [ivHex, tagHex, encHex] = stored.split(':');
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}
```

### Email Templates

All emails use a single base HTML template with inline styles (for email client compatibility).

#### Base Template

```typescript
// services/email.service.ts

const baseTemplate = (content: string, orgName = '2DOC Issues Log') => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f7f7f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e3e3e0;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="padding:20px 32px;border-bottom:1px solid #e3e3e0;background:#f7f7f5;">
            <span style="font-size:13px;font-weight:700;color:#1a1a18;letter-spacing:-.3px;">2DOC</span>
            <span style="font-size:13px;color:#8a8a86;margin-left:4px;">Issues Log</span>
          </td>
        </tr>
        <!-- Content -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e3e3e0;background:#f7f7f5;">
            <p style="margin:0;font-size:11px;color:#b0b0ac;">
              Sent by ${orgName} via 2DOC Issues Log.<br>
              If you did not request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
```

#### Email Types & Subjects

| Trigger | Subject | Content |
|---|---|---|
| Registration | `Verify your 2DOC account` | Verification link (24h) |
| Invite | `You've been invited to {OrgName} on 2DOC` | Accept invite link (48h), role info |
| Forgot password | `Reset your 2DOC password` | Reset link (1h) |
| Password reset done | `Your password was changed` | Confirmation + login link |
| Issue assigned (DEV) | `New issue assigned: {ticketNumber}` | Issue title, system, priority, link |
| Issue submitted to QA | `Issue pending review: {ticketNumber}` | Dev's resolution summary, link |
| Issue closed | `Issue closed: {ticketNumber}` | Summary, days open, link |
| Welcome (after invite accepted) | `Welcome to {OrgName}` | Role-specific getting started guide |

### SMTP Settings UI (PM Only — `/settings/smtp`)

Fields:
- **SMTP Host** — `mail.example.com`
- **Port** — `587` (default)
- **Encryption** — TLS / SSL / None (radio/select)
- **Username** — SMTP auth user
- **Password** — masked input, stored encrypted
- **From Name** — display name in sent emails
- **From Email** — `noreply@yourdomain.com`
- **Test Connection** button — sends a test email to the PM's own email address

```
POST /api/smtp/test
Server:
  1. Build transport from submitted config (don't save yet)
  2. Send test email to req.user.email
  3. Return 200 if successful, 400 with error message if failed

POST /api/smtp/save
Server:
  1. Run test first (same as above)
  2. If passes: encrypt password, upsert SmtpConfig, set isVerified=true
  3. Return 200
```

---

## 7. Role System

### Three Roles

| Role | Full Name | Color (UI) | Badge |
|---|---|---|---|
| `PM` | Project Manager | Purple `#7c3aed` | `pm-chip` |
| `QA` | QA Tester | Blue `#2f6ef7` | `qa-chip` |
| `DEV` | Developer | Green `#15803d` | `dev-chip` |

### Permission Matrix

| Action | PM | QA | DEV |
|---|---|---|---|
| View board / list | ✅ | ✅ | ✅ |
| View PM dashboard / overview | ✅ | ❌ | ❌ |
| Create issue | ✅ | ✅ | ❌ |
| Edit issue (QA fields only) | ✅ | ✅ | ❌ |
| Delete issue | ✅ | ❌ | ❌ |
| Fill resolution + submit to QA | ❌ | ❌ | ✅ |
| Close issue (set Date Closed) | ✅ | ✅ | ❌ |
| Access Settings | ✅ | ❌ | ❌ |
| Manage systems | ✅ | ❌ | ❌ |
| Invite / remove team members | ✅ | ❌ | ❌ |
| Configure SMTP | ✅ | ❌ | ❌ |
| Export CSV | ✅ | ✅ | ✅ |

### Field-Level Permissions on Issues

**QA fields** (filled when creating/editing):
- Ticket Number (auto-generated, non-editable after creation)
- System
- Description
- Category (Critical / High / Medium / Low)
- Priority (P1–P4)
- Type (SW / C / HW)
- App Module
- Reported By (auto-filled to current user)
- Date Raised (auto-filled to today)
- Date Closed (QA sets this to close the issue)
- Remarks (QA sets this when status is Pending)

**DEV fields** (filled in resolve form, locked to QA):
- Action Plan / Resolution
- Person/Org Responsible (auto-filled to current user)
- Date Submitted to QA

**Auto-computed:**
- Status (Open → Pending when DEV submits, Pending → Closed when QA sets Date Closed)
- Days Open (calculated as Date Closed − Date Raised, or current date − Date Raised if still open)

---

## 8. Feature Specification

### 8.1 Board View (Kanban)

- 3 columns: Open (yellow), Pending Review (orange), Closed (green)
- Each column shows max **5 cards** at a time
- Per-column pagination: shows `1–5 of N`, dot indicators (up to 8 pages), prev/next arrows
- Column pages reset when any filter changes
- Cards display: category badge, status badge, title (1-line truncated), ticket ID, system, days open, reporter avatar + assignee avatar
- Clicking a card opens the View Modal
- Card hover: subtle background change + left colored border accent based on category
- Empty column shows placeholder text
- **New Issue** button only visible to PM and QA

### 8.2 List View (Table)

- Grouped by status: Open → Pending → Closed
- Sortable columns: ID, System, Category, Priority, Status, Days, Date Raised
- Columns: ID, Description+Module, System, Category, Priority, Status, Days Open, Who (reporter for QA/PM view, assignee for DEV view), Date Raised, Actions
- Row click opens View Modal
- Actions per role:
  - PM/QA: Edit, Close (if Pending), Delete
  - DEV: Resolve (if Open or Pending)

### 8.3 View Modal

- Workflow indicator strip at top: `1. QA raises → 2. DEV submits fix → 3. QA closes` (current step highlighted)
- All fields displayed in a clean 2-column grid
- Role chips next to each field label indicate who owns it
- Resolution box: italic placeholder if empty
- Remarks shown only when status is Pending
- Footer actions adapt per role (see permission matrix above)

### 8.4 QA Create / Edit Form

- System dropdown: populated from project's configured systems
- Reporter dropdown: populated from org members with role QA or PM
- DEV section visible but all fields disabled (cannot type)
- Close section: Date Closed + Remarks fields
  - If Date Closed is set → status auto-becomes Closed
  - Remarks field labeled "Pending only"
- Footer note: "DEV fields are locked — only developers can fill them"

### 8.5 DEV Resolve Form

- Context box at top showing issue details (read-only from QA)
- DEV fills: Resolution text, Assignee (auto-populated to self), Date Submitted to QA
- Submit → status becomes Pending automatically
- Email notification sent to QA reporters of this issue

### 8.6 QA Close Form

- Shows issue + developer's resolution for review
- QA sets Date Closed (default today)
- Optional Remarks
- On confirm: status = Closed, daysOpen = Date Closed − Date Raised
- Email notification sent to DEV assignee

### 8.7 PM Dashboard / Overview Page

- **Stats row:** Open count, Pending count, Closed count, Critical (open) count — each as a card with colored number
- **Issues by System:** Table showing each system, total issues, progress bar (% closed), open count badge
- **Team Workload:** Each DEV member shown with avatar, name, active issues count (colored red if > 3)
- **Recent Activity:** Last 10 activity log entries — who did what to which issue, with timestamp
- **Quick actions:** "New Issue" button, "Go to Settings" button

### 8.8 Settings Pages (PM Only)

All settings routes are behind `requireRole('PM')` middleware.

#### `/settings/project` — Project Information
- Project Name
- Short Code (used in CSV filenames, ticket prefix config)
- Description
- Save button

#### `/settings/systems` — Systems
- List of current systems as removable chips
- Add new system input + button
- Cannot remove a system that has existing issues (show error)
- Reorder via drag-and-drop (order saved to `system.order`)

#### `/settings/team` — Team Members
- Table: Avatar, Name, Email, Role (editable select), Remove button
- Invite form: Email + Role dropdown + Send Invite button
- Pending invites section: list of sent invites with status + Resend / Cancel actions
- Cannot remove yourself (the PM)
- Cannot change your own role

#### `/settings/smtp` — SMTP Configuration
- Full SMTP form (host, port, encryption, username, password, from name, from email)
- Test Connection button → fires test email to PM's own address
- Status indicator: Verified ✓ / Not verified
- Save button (only enabled after successful test)

---

## 9. API Routes

### Authentication Routes

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
GET    /api/auth/verify-email
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/invite/:token
POST   /api/auth/invite/:token/accept
```

### Issues Routes

```
GET    /api/issues              ?status=&category=&system=&q=&page=&limit=
POST   /api/issues
GET    /api/issues/:id
PATCH  /api/issues/:id          (QA/PM — edit QA fields)
PATCH  /api/issues/:id/resolve  (DEV only — fill resolution, sets Pending)
PATCH  /api/issues/:id/close    (QA/PM only — set Date Closed, sets Closed)
DELETE /api/issues/:id          (PM only)
GET    /api/issues/export/csv   (all roles — returns CSV of filtered issues)
```

### Project Routes

```
GET    /api/project
PATCH  /api/project
```

### Systems Routes

```
GET    /api/systems
POST   /api/systems              (PM only)
PATCH  /api/systems/:id          (PM only)
DELETE /api/systems/:id          (PM only)
PATCH  /api/systems/reorder      (PM only)
```

### Members Routes

```
GET    /api/members
POST   /api/members/invite       (PM only)
PATCH  /api/members/:id/role     (PM only)
DELETE /api/members/:id          (PM only)
GET    /api/members/invites      (PM only — list pending invites)
POST   /api/members/invites/:id/resend   (PM only)
DELETE /api/members/invites/:id  (PM only — cancel invite)
```

### SMTP Routes

```
GET    /api/smtp                 (PM only — returns config with masked password)
POST   /api/smtp/test            (PM only — test without saving)
POST   /api/smtp/save            (PM only — test then save)
DELETE /api/smtp                 (PM only — remove config)
```

### Activity Log Routes

```
GET    /api/activity             ?limit=10 (PM only)
```

### Response Format

All API responses follow this envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Success (paginated)
{
  "success": true,
  "data": [...],
  "meta": { "total": 47, "page": 1, "limit": 20, "totalPages": 3 }
}

// Error
{ "success": false, "error": "Human-readable message", "code": "ERROR_CODE" }
```

---

## 10. UI/UX Design System

### Color Palette

```css
/* Base */
--bg: #ffffff;
--sidebar-bg: #f7f7f5;
--surface-hover: #f1f1ef;
--surface-active: #ebebea;
--border: #e3e3e0;
--border-strong: #c7c7c4;
--text: #1a1a18;
--text-2: #4a4a47;
--text-3: #8a8a86;
--text-4: #b0b0ac;
--accent: #2f6ef7;

/* Status */
--open-bg: #fef9ec;   --open-text: #92660a;  --open-dot: #f0a500;
--pending-bg: #fff3ec; --pending-text: #903d0f; --pending-dot: #e05c1a;
--closed-bg: #edfaf4;  --closed-text: #1a6b3c; --closed-dot: #25a460;

/* Category */
--critical-bg: #fdf0f0; --critical-text: #9b1c1c;
--high-bg: #fff4ec;     --high-text: #903d0f;
--medium-bg: #fefce8;   --medium-text: #7a5c00;
--low-bg: #f4f4f4;      --low-text: #6a6a66;

/* Role */
--pm: #7c3aed;    --pm-bg: #f5f3ff;
--qa: #2f6ef7;    --qa-bg: #eff6ff;
--dev: #15803d;   --dev-bg: #f0fdf4;
```

### Typography

```css
font-family: 'DM Sans', sans-serif;     /* Body, UI */
font-family: 'DM Mono', monospace;      /* IDs, dates, counts, code */
```

### Component Rules

- **Badges:** `display:inline-flex`, `padding:1px 6px`, `border-radius:4px`, `font-size:11px`, `font-weight:500`
- **Buttons:** `padding:5px 12px`, `border-radius:6px`, `font-size:12px`, `font-weight:500`, `border:1px solid`
- **Cards:** flat with `border-bottom` separator, no drop shadows on cards themselves
- **Modals:** `border-radius:10px`, `box-shadow:0 20px 60px rgba(0,0,0,.15)`, `max-width:620px`
- **Sidebar:** `240px` fixed width, `background:#f7f7f5`, off-white
- **Focus rings:** `box-shadow: 0 0 0 3px rgba(0,0,0,.06)` on inputs

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Sidebar (240px)  │  Topbar (44px height, sticky)            │
│                   ├──────────────────────────────────────────│
│  - Workspace name │  Filter bar (when on board/list)         │
│  - Search         ├──────────────────────────────────────────│
│  - Nav items      │                                          │
│  - Systems list   │  Main content area (flex:1, overflow)    │
│  - Settings (PM)  │                                          │
│  - Role switcher  │                                          │
│    (dev only —    │                                          │
│     real app has  │                                          │
│     no switcher)  │                                          │
└──────────────────────────────────────────────────────────────┘
```

> **Note:** The role switcher in the POC is for demo purposes only. In production, the user's role is determined by their account. Remove the role switcher from the production build.

---

## 11. Page & Screen Inventory

### Auth Pages (`/auth` group — no sidebar)

#### `/register`
- Full-page centered card (max-width: 460px)
- Fields: First Name, Last Name, Email, Password, Organization Name
- Password strength indicator
- Submit → register + send verification email
- Link to `/login`

#### `/login`
- Email + Password fields
- "Remember me" checkbox
- Forgot password link → `/forgot-password`
- Show/hide password toggle
- Error handling: wrong password, unverified email (with resend link), inactive account

#### `/forgot-password`
- Email field only
- Submit → sends email, shows success message regardless
- Link back to login

#### `/reset-password`
- Reads `?token=` from URL
- New Password + Confirm Password fields
- Password requirements checklist (live validation)
- On success → redirect to `/login?reset=true`

#### `/invite/[token]`
- Shows org name + role from invite
- Fields: First Name, Last Name, Password, Confirm Password
- On submit → create account + auto-login + redirect to board

#### `/verify-email`
- Reads `?token=` from URL
- Shows success / expired / invalid state
- On success → redirect to `/login?verified=true`

### App Pages (`/app` group — with sidebar)

#### `/board` (default)
- Kanban board as specified in section 8.1
- Accessible by all roles

#### `/list`
- Table view as specified in section 8.2

#### `/overview` (PM only)
- Dashboard as specified in section 8.7
- Redirect to `/board` if non-PM visits

#### `/settings/project` (PM only)
- Redirect to `/board` if non-PM visits

#### `/settings/systems` (PM only)

#### `/settings/team` (PM only)

#### `/settings/smtp` (PM only)

---

## 12. Environment Variables

### Backend (`apps/api/.env`)

```env
# App
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:3000           # Frontend URL (for email links)
API_URL=http://localhost:4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/2doc_issues

# JWT
JWT_SECRET=your-64-char-random-hex-secret-here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7

# Encryption (for SMTP password storage)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-64-char-hex-key-here

# Platform SMTP (used before org sets up their own)
# Can use Resend, Gmail, Mailtrap, or any SMTP
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_ENCRYPTION=TLS
SMTP_USER=resend
SMTP_PASS=re_your_resend_api_key
SMTP_FROM_NAME=2DOC Issues Log
SMTP_FROM_EMAIL=noreply@2doc.app

# Optional: Resend API key if using Resend's API (alternative to SMTP)
RESEND_API_KEY=re_xxxx
```

### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=2DOC Issues Log
```

### Production Additions

```env
# Backend
ALLOWED_ORIGINS=https://app.2doc.app
COOKIE_DOMAIN=.2doc.app
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL=https://api.2doc.app
```

---

## 13. Seed Data

Run `npx prisma db seed` which executes `prisma/seed.ts`:

```typescript
// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Organization',
      slug: 'demo-org',
      code: 'DEMO',
      description: 'Sample organization for development and testing',
    },
  });

  // Project
  const project = await prisma.project.create({
    data: {
      name: 'Demo Project',
      description: 'Sample project for testing the issues log',
      organizationId: org.id,
    },
  });

  // Ticket counter
  await prisma.ticketCounter.create({ data: { projectId: project.id, count: 0 } });

  // Systems
  const systemNames = ['Auth Module', 'Dashboard', 'Reports', 'User Management', 'Notifications'];
  const systems = await Promise.all(
    systemNames.map((name, i) =>
      prisma.system.create({ data: { name, order: i, projectId: project.id } })
    )
  );

  // Users
  const hash = await bcrypt.hash('Password123!', 12);

  const pm = await prisma.user.create({
    data: {
      email: 'pm@demo.com',
      passwordHash: hash,
      firstName: 'Maria',
      lastName: 'Lopez',
      role: UserRole.PM,
      isEmailVerified: true,
      organizationId: org.id,
    },
  });

  const qa = await prisma.user.create({
    data: {
      email: 'qa@demo.com',
      passwordHash: hash,
      firstName: 'Alice',
      lastName: 'Chen',
      role: UserRole.QA,
      isEmailVerified: true,
      organizationId: org.id,
    },
  });

  const dev = await prisma.user.create({
    data: {
      email: 'dev@demo.com',
      passwordHash: hash,
      firstName: 'Bob',
      lastName: 'Santos',
      role: UserRole.DEV,
      isEmailVerified: true,
      organizationId: org.id,
    },
  });

  // Sample Issues
  const issuesData = [
    {
      ticketNumber: 'IF001',
      description: 'Login button unresponsive after failed password attempt',
      category: 'High' as const,
      priority: 'P1' as const,
      type: 'SW' as const,
      appModule: 'Login Page',
      status: 'Open' as const,
      systemId: systems[0].id,
      reportedById: qa.id,
      dateRaised: new Date(Date.now() - 12 * 86400000),
    },
    {
      ticketNumber: 'IF002',
      description: 'Widget counts are not refreshing in real-time',
      category: 'Medium' as const,
      priority: 'P2' as const,
      type: 'SW' as const,
      appModule: 'Overview Widget',
      status: 'Open' as const,
      systemId: systems[1].id,
      reportedById: qa.id,
      dateRaised: new Date(Date.now() - 8 * 86400000),
    },
    {
      ticketNumber: 'IF003',
      description: 'Export to CSV includes blank rows between data entries',
      category: 'Low' as const,
      priority: 'P3' as const,
      type: 'SW' as const,
      appModule: 'Export Panel',
      status: 'Pending' as const,
      resolution: 'Added a filter to strip empty rows before serialization',
      systemId: systems[2].id,
      reportedById: pm.id,
      assignedToId: dev.id,
      dateRaised: new Date(Date.now() - 14 * 86400000),
      dateSubmittedToQA: new Date(Date.now() - 3 * 86400000),
      remarks: 'Waiting for QA sign-off on edge cases',
    },
    {
      ticketNumber: 'IF004',
      description: 'Session token not invalidated on logout from other devices',
      category: 'Critical' as const,
      priority: 'P1' as const,
      type: 'SW' as const,
      appModule: 'Session Management',
      status: 'Closed' as const,
      resolution: 'Implemented global session revocation on logout event',
      systemId: systems[0].id,
      reportedById: qa.id,
      assignedToId: dev.id,
      closedById: qa.id,
      dateRaised: new Date(Date.now() - 45 * 86400000),
      dateSubmittedToQA: new Date(Date.now() - 35 * 86400000),
      dateClosed: new Date(Date.now() - 32 * 86400000),
      daysOpen: 13,
    },
  ];

  for (const data of issuesData) {
    await prisma.issue.create({ data: { ...data, projectId: project.id } });
  }

  console.log('✅ Seed complete.');
  console.log('─────────────────────────────────');
  console.log('Demo accounts (password: Password123!):');
  console.log('  PM:  pm@demo.com');
  console.log('  QA:  qa@demo.com');
  console.log('  DEV: dev@demo.com');
  console.log('─────────────────────────────────');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

---

## 14. Deployment Notes

### Docker (local dev)

```yaml
# docker-compose.yml
version: '3.9'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: 2doc_issues
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ./apps/api
    depends_on: [db]
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/2doc_issues
    ports:
      - "4000:4000"

  web:
    build: ./apps/web
    depends_on: [api]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
    ports:
      - "3000:3000"

volumes:
  pgdata:
```

### Database Setup Commands

```bash
# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

### Security Checklist Before Production

- [ ] All secrets rotated from dev values (JWT_SECRET, ENCRYPTION_KEY)
- [ ] HTTPS enforced everywhere
- [ ] Cookies: `Secure=true`, `SameSite=Strict`, `HttpOnly=true`
- [ ] CORS restricted to known frontend origins
- [ ] Rate limiting on auth endpoints (5 req/min on login, 3 req/min on password reset)
- [ ] Input validation with Zod on all endpoints
- [ ] SMTP passwords stored encrypted (AES-256-GCM), never in plain text
- [ ] No sensitive data in JWT payload (only userId, orgId, role)
- [ ] Refresh token rotation on every use
- [ ] Account lockout after 10 failed logins (optional but recommended)
- [ ] Email enumeration protection on forgot-password (always return success)

### Key Decisions & Rationale

| Decision | Rationale |
|---|---|
| PostgreSQL over MySQL | Better JSON support, row-level security, superior for complex queries |
| JWT + httpOnly refresh cookie | Balances security and UX — access token in memory, refresh in cookie |
| Prisma over raw SQL | Type safety, auto-migration, great DX for TypeScript projects |
| Per-org SMTP config | Multi-tenant: each org uses their own domain for emails — more professional |
| Encrypt SMTP password | SMTP credentials give email access — must never be stored plain |
| Ticket numbers per project | `IF001` scope is per-project, not global — avoids sparse number sequences |
| Role at org level, not project level | Simplified v1 model — one role per user per org |
| Activity log as append-only table | Audit trail — never update, never delete, only insert |

---

*End of specification. Build exactly as described. Start with the database migrations, then the backend auth routes, then the frontend auth pages, then the main app shell, then the issue CRUD, then the PM dashboard, then the Settings pages.*
