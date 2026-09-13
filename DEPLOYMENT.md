# JNS Video Production Operations — Production Deployment Guide

This guide documents the exact configuration, environment variables, database setup, and deployment procedure for deploying JNS Video Production Operations on [Railway](https://railway.com) or any cloud container environment.

---

## 1. Required Production Environment Variables

In production (`NODE_ENV=production`), the application enforces strict startup validation. The system will fail to start if any of the mandatory security credentials are absent.

| Environment Variable | Required | Description | Example |
|---|---|---|---|
| `NODE_ENV` | **YES** | Set runtime environment | `production` |
| `DATABASE_URL` | **YES** | PostgreSQL connection URI | `postgresql://postgres:password@junction.proxy.rlwy.net:5432/railway` |
| `NEXTAUTH_SECRET` | **YES** | High-entropy 32+ character key for JWT signing | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | **YES** | Canonical URL of your deployed application | `https://jns-tasks.up.railway.app` |
| `GOOGLE_CLIENT_ID` | **YES** | Google Cloud OAuth 2.0 Client ID | `123456789-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | **YES** | Google Cloud OAuth 2.0 Client Secret | `GOCSPX-xxxxxxxxxxxx` |
| `NEXT_PUBLIC_APP_URL` | Optional | Public application base URL for links in email notifications | `https://jns-tasks.up.railway.app` |
| `RESEND_API_KEY` | Required for email | Resend sending API key | `re_xxxxxxxxx` |
| `RESEND_FROM` | Required for email | Sender on a Resend-verified domain | `JNS Video Production <notifications@jns-video.com>` |
| `RESEND_REPLY_TO` | Optional | Address that receives replies | `production@jns.org` |
| `ENABLE_EMAIL_DISPATCH` | Required for production email | Must be exactly `true` to send | `true` |
| `ADMIN_RESET_SECRET` | Optional | Custom secret header token for database resets in production | Strong random token |

---

## 2. Google OAuth 2.0 Client Configuration

Because production strictly enforces Google Workspace single sign-on (`@jns.org`), configure your Google Cloud Console OAuth Client as follows:

1. **Google Cloud Console** > **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**.
2. **Application Type**: Web application.
3. **Authorized JavaScript Origins**:
   - `https://your-app.up.railway.app` (and your custom domain if applicable)
4. **Authorized Redirect URIs**:
   - `https://your-app.up.railway.app/api/auth/callback/google`
5. **Scopes**:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
6. Under OAuth Consent Screen, configure User Type as **Internal** (restricted to `@jns.org` domain users).

---

## 3. Database Migration & Initialization Command

To create all PostgreSQL tables, indexes, row-level schemas, and initial seed data, run the migration command:

```bash
npm run db:migrate
```

### What this command executes:
- Runs `tsx scripts/migrate-db.ts`
- Connects to PostgreSQL using `DATABASE_URL`
- Creates all required production tables:
  - `users`
  - `shows`
  - `productions`
  - `comments`
  - `audit_logs`
  - `meetings`
  - `improvements`
  - `problem_reports`
  - `show_ideas`
  - `equipment_requests`
  - `gear_inventory`
  - `gear_checkouts`
  - `system_settings`
  - `notifications`
  - `jns_app_state`
- Seeds the initial team roster, active studio shows, active pipelines, and gear inventory if the database is brand new.

---

## 4. Railway Deployment Steps

1. **Create a New Project on Railway**:
   - Navigate to [railway.com/new](https://railway.com/new).
   - Select **Deploy from GitHub repo** and choose `Yourecords/jns-tasks-operations-2`.
2. **Add a PostgreSQL Database**:
   - In your Railway project canvas, click **+ New** > **Database** > **Add PostgreSQL**.
   - Railway automatically generates a `DATABASE_URL` variable.
3. **Configure Environment Variables**:
   - Go to your service's **Variables** tab in Railway.
   - Reference `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - Add `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NODE_ENV=production`.
4. **Deploy**:
   - Railway reads `railway.json` and builds via Nixpacks.
   - The healthcheck endpoint is verified at `/login`.
5. **Run Initial Database Migration**:
   - Open the service's **Settings** or **CLI** tab on Railway, or use the Railway CLI:
     ```bash
     railway run npm run db:migrate
     ```
   - All tables are created and seeded with JNS production records.
