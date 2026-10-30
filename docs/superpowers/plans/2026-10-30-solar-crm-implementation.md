# Solar CRM SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant SaaS CRM for residential solar installers with lead-to-contract pipeline, site survey management, Aurora/OpenSolar design integration, proposal generation with e-signature, and dashboard reporting.

**Architecture:** Next.js 14 App Router on Vercel + Supabase (PostgreSQL, Auth, RLS, Realtime, Edge Functions). Server Components for data fetching, Server Actions for mutations, shadcn/ui + Tailwind for UI. Row-Level Security enforces tenant isolation.

**Tech Stack:** Next.js 14, Supabase (JS client + SSR), TypeScript, Tailwind CSS, shadcn/ui, React Hook Form + Zod, TanStack Query (client), React-PDF, Lucide icons, date-fns

**Spec:** docs/superpowers/specs/2026-10-30-solar-crm-design.md

## Global Constraints

- Node.js 20+, pnpm package manager
- Supabase project created, env vars in `.env.local`
- Strict TypeScript, ESLint (next/core-web-vitals), Prettier
- All database access via Supabase client (no raw SQL in app code)
- RLS policies handle all tenant isolation — no manual `tenant_id` filtering
- Server Actions for all mutations, Server Components for reads
- shadcn/ui components in `components/ui/`, custom components in `components/`
- Path aliases: `@/*` → `src/*`, `@/lib/supabase` for clients

## Review Focus

1. **RLS bypass** — Direct Supabase queries without auth context should return zero rows; test with anon key
2. **Webhook replay** — Duplicate Aurora/OpenSolar webhooks must not create duplicate designs; test idempotency keys
3. **Proposal price tampering** — Client-submitted pricing must be validated server-side against design data
4. **Survey offline queue** — Mobile PWA must sync pending surveys when online; test airplane mode → online
5. **Role escalation** — Rep assigning lead to another tenant's user must be rejected; test cross-tenant assignment

---

### Task 1: Project Scaffold & Supabase Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`
- Create: `.env.local.example`, `.env.local` (gitignored)
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Create: `supabase/config.toml`, `supabase/migrations/001_initial_schema.sql`
- Create: `src/types/database.ts` (generated from Supabase)
- Test: `src/lib/supabase/__tests__/client.test.ts`

**Interfaces:**
- Produces: `createClient()` (browser), `createServerClient()` (Server Components/Actions), `updateSession()` (middleware)

- [ ] **Step 1: Write failing test for Supabase client creation**
```typescript
// src/lib/supabase/__tests__/client.test.ts
import { createClient } from '../client'
test('createClient returns SupabaseClient with auth', () => {
  const client = createClient()
  expect(client).toBeDefined()
  expect(client.auth).toBeDefined()
})
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test src/lib/supabase/__tests__/client.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Scaffold Next.js project with all config files**
```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add -D @types/node
```
Configure `next.config.js` with `images.remotePatterns` for Supabase storage. Create Supabase clients per SSR docs.

- [ ] **Step 4: Write initial migration with all tables from spec**
```sql
-- supabase/migrations/001_initial_schema.sql
-- All CREATE TABLE statements from spec Section 4
-- All RLS policies from spec Section 4
-- Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE leads, activities, designs, proposals, contracts;
```

- [ ] **Step 5: Generate TypeScript types from Supabase**
```bash
pnpm supabase gen types typescript --project-id <ref> > src/types/database.ts
```

- [ ] **Step 6: Run tests and verify pass**
Run: `pnpm test src/lib/supabase/__tests__/client.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**
```bash
git add .
git commit -m "chore: scaffold Next.js + Supabase project with initial schema"
```

---

### Task 2: Authentication & Tenant Onboarding

**Files:**
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`
- Create: `src/app/(auth)/callback/route.ts`
- Create: `src/app/onboarding/page.tsx`
- Create: `src/components/auth/LoginForm.tsx`, `RegisterForm.tsx`, `OnboardingForm.tsx`
- Create: `src/actions/auth.ts` (signIn, signUp, signOut, resendConfirmation)
- Create: `src/actions/tenant.ts` (createTenant, updateTenant, getTenant)
- Test: `src/actions/__tests__/auth.test.ts`, `src/actions/__tests__/tenant.test.ts`

**Interfaces:**
- Consumes: `createServerClient()` from Task 1
- Produces: `signIn(email, password)`, `signUp(email, password, tenantName)`, `createTenant(name, slug)`, `getTenant()`

- [ ] **Step 1: Write failing tests for auth actions**
```typescript
// src/actions/__tests__/auth.test.ts
test('signUp creates user and tenant', async () => {
  const result = await signUp('test@example.com', 'password', 'Test Solar')
  expect(result.user).toBeDefined()
  expect(result.tenant).toBeDefined()
})
```

- [ ] **Step 2: Implement auth actions using Supabase Auth**
- [ ] **Step 3: Build login/register pages with shadcn/ui forms**
- [ ] **Step 4: Implement onboarding flow (tenant name, slug, logo, first user)**
- [ ] **Step 5: Middleware protects `/dashboard/*` routes, redirects to login**
- [ ] **Step 6: Run tests and verify pass**
- [ ] **Step 7: Commit**

---

### Task 3: Lead Management & Pipeline Kanban

**Files:**
- Create: `src/app/dashboard/leads/page.tsx` (Kanban board)
- Create: `src/app/dashboard/leads/[id]/page.tsx` (Lead detail)
- Create: `src/components/leads/KanbanBoard.tsx`, `KanbanColumn.tsx`, `LeadCard.tsx`
- Create: `src/components/leads/LeadDetail.tsx`, `LeadTimeline.tsx`, `LeadForm.tsx`
- Create: `src/actions/leads.ts` (CRUD, status transitions, assignment)
- Create: `src/hooks/useLeads.ts` (TanStack Query)
- Test: `src/actions/__tests__/leads.test.ts`, `src/components/leads/__tests__/KanbanBoard.test.tsx`

**Interfaces:**
- Consumes: `getTenant()` from Task 2, Supabase client
- Produces: `getLeads(filters)`, `createLead(data)`, `updateLead(id, data)`, `updateLeadStatus(id, status)`, `assignLead(id, userId)`

- [ ] **Step 1: Write failing tests for lead actions**
```typescript
test('createLead inserts lead with tenant_id from auth', async () => {
  const lead = await createLead({ first_name: 'John', last_name: 'Doe', email: 'john@example.com' })
  expect(lead.tenant_id).toEqual(currentTenantId())
})
```

- [ ] **Step 2: Implement lead Server Actions with RLS-safe queries**
- [ ] **Step 3: Build KanbanBoard with @dnd-kit for drag-drop status changes**
- [ ] **Step 4: Build LeadDetail with timeline (activities) and inline editing**
- [ ] **Step 5: Add lead capture public API route (no auth, creates lead in default tenant)**
- [ ] **Step 6: Run tests and verify pass**
- [ ] **Step 7: Commit**

---

### Task 4: Activities & Timeline

**Files:**
- Create: `src/components/activities/ActivityFeed.tsx`, `ActivityItem.tsx`, `ActivityForm.tsx`
- Create: `src/actions/activities.ts` (logActivity, getActivities)
- Test: `src/actions/__tests__/activities.test.ts`

**Interfaces:**
- Consumes: Lead ID from Task 3
- Produces: `logActivity(leadId, type, subject, body, metadata)`, `getActivities(leadId)`

- [ ] **Step 1: Write failing test for activity logging**
- [ ] **Step 2: Implement activity Server Actions**
- [ ] **Step 3: Build ActivityFeed component (real-time via Supabase Realtime)**
- [ ] **Step 4: Integrate ActivityFeed into LeadDetail**
- [ ] **Step 5: Add activity types: call, email, meeting, note, task, status_change**
- [ ] **Step 6: Run tests and verify pass**
- [ ] **Step 7: Commit**

---

### Task 5: Site Survey Management & Mobile PWA

**Files:**
- Create: `src/app/dashboard/surveys/page.tsx` (Calendar view)
- Create: `src/app/dashboard/surveys/[id]/page.tsx` (Survey detail)
- Create: `src/app/survey/[token]/page.tsx` (Public mobile survey form — no auth)
- Create: `src/components/surveys/SurveyCalendar.tsx`, `SurveyForm.tsx`, `PhotoUpload.tsx`
- Create: `src/actions/surveys.ts` (CRUD, schedule, complete, photo upload)
- Create: `public/manifest.json`, `public/sw.js` (Workbox for offline)
- Test: `src/actions/__tests__/surveys.test.ts`

**Interfaces:**
- Consumes: Lead ID, User ID (surveyor)
- Produces: `createSurvey(leadId, scheduledAt, surveyorId)`, `completeSurvey(id, data, photos)`, `getSurveyByToken(token)`

- [ ] **Step 1: Write failing tests for survey actions**
- [ ] **Step 2: Implement survey Server Actions with photo upload to Supabase Storage**
- [ ] **Step 3: Build SurveyCalendar (react-day-picker or FullCalendar)**
- [ ] **Step 4: Build mobile SurveyForm PWA — camera capture, offline IndexedDB queue**
- [ ] **Step 5: On survey completion, trigger design request to Aurora/OpenSolar (Edge Function)**
- [ ] **Step 6: Run tests and verify pass**
- [ ] **Step 7: Commit**

---

### Task 6: Aurora/OpenSolar Integration (Edge Functions)

**Files:**
- Create: `supabase/functions/aurora-webhook/index.ts`
- Create: `supabase/functions/opensolar-webhook/index.ts`
- Create: `supabase/functions/design-request/index.ts`
- Create: `src/actions/integrations.ts` (configure, test connection)
- Create: `src/components/integrations/IntegrationConfig.tsx`
- Test: `supabase/functions/__tests__/aurora-webhook.test.ts`

**Interfaces:**
- Consumes: Survey data, Integration config (encrypted API keys)
- Produces: `requestDesign(surveyId, provider)`, webhook handlers that create Design records

- [ ] **Step 1: Write failing test for Aurora webhook signature validation**
```typescript
test('valid HMAC signature passes', () => {
  const payload = JSON.stringify({ design_id: '123', status: 'completed' })
  const sig = hmacSha256(payload, secret)
  expect(verifySignature(payload, sig, secret)).toBe(true)
})
```

- [ ] **Step 2: Implement Aurora webhook Edge Function (HMAC verify, idempotency, create Design)**
- [ ] **Step 3: Implement OpenSolar webhook Edge Function**
- [ ] **Step 4: Implement design-request Edge Function (called from survey completion)**
- [ ] **Step 5: Build IntegrationConfig UI for tenants to enter API keys (encrypted storage)**
- [ ] **Step 6: Deploy functions: `pnpm supabase functions deploy`**
- [ ] **Step 7: Run tests and verify pass**
- [ ] **Step 8: Commit**

---

### Task 7: Designs Library & Versioning

**Files:**
- Create: `src/app/dashboard/leads/[id]/designs/page.tsx`
- Create: `src/components/designs/DesignGallery.tsx`, `DesignViewer.tsx`, `DesignComparison.tsx`
- Create: `src/actions/designs.ts` (getDesigns, requestRevision, approveDesign)
- Test: `src/actions/__tests__/designs.test.ts`

**Interfaces:**
- Consumes: Design records from Task 6 webhooks
- Produces: `getDesigns(leadId)`, `requestRevision(designId, notes)`, `approveDesign(designId)`

- [ ] **Step 1: Write failing tests for design actions**
- [ ] **Step 2: Implement design Server Actions**
- [ ] **Step 3: Build DesignGallery (thumbnail grid, version badges, status chips)**
- [ ] **Step 4: Build DesignViewer (full-screen layout image, specs panel, shade report)**
- [ ] **Step 5: Build DesignComparison (side-by-side spec diff)**
- [ ] **Step 6: Add "Request Revision" → calls design-request Edge Function**
- [ ] **Step 7: Run tests and verify pass**
- [ ] **Step 8: Commit**

---

### Task 8: Proposal Generation & E-Signature

**Files:**
- Create: `src/app/dashboard/leads/[id]/proposals/page.tsx`
- Create: `src/app/proposal/[token]/page.tsx` (Public proposal view — no auth)
- Create: `src/components/proposals/ProposalBuilder.tsx`, `PricingTable.tsx`, `FinancingCalculator.tsx`
- Create: `src/components/proposals/ProposalPDF.tsx` (React-PDF template)
- Create: `src/actions/proposals.ts` (create, send, track views, sign)
- Create: `supabase/functions/esign-webhook/index.ts` (DocuSign/HelloSign callback)
- Test: `src/actions/__tests__/proposals.test.ts`

**Interfaces:**
- Consumes: Approved Design, Lead, Tenant branding
- Produces: `createProposal(leadId, designId, pricing)`, `sendProposal(id)`, `signProposal(token, signature)`

- [ ] **Step 1: Write failing tests for proposal actions**
- [ ] **Step 2: Implement proposal Server Actions with pricing validation**
- [ ] **Step 3: Build ProposalBuilder — template selector, dynamic pricing table, financing options**
- [ ] **Step 4: Build ProposalPDF with React-PDF (cover, scope, pricing, warranty, terms)**
- [ ] **Step 5: Implement public proposal view with view tracking (Realtime notification)**
- [ ] **Step 6: Integrate e-signature (DocuSign embedded or HelloSign) via Edge Function**
- [ ] **Step 7: On signed → create Contract record, notify rep via Realtime**
- [ ] **Step 8: Run tests and verify pass**
- [ ] **Step 9: Commit**

---

### Task 9: Contracts & Project Handoff

**Files:**
- Create: `src/app/dashboard/contracts/page.tsx`
- Create: `src/app/dashboard/contracts/[id]/page.tsx`
- Create: `src/components/contracts/ContractList.tsx`, `ContractDetail.tsx`
- Create: `src/actions/contracts.ts` (getContracts, updateStatus, scheduleInstallation)
- Test: `src/actions/__tests__/contracts.test.ts`

**Interfaces:**
- Consumes: Signed Proposal from Task 8
- Produces: `getContracts(filters)`, `updateContractStatus(id, status)`, `scheduleInstallation(id, date)`

- [ ] **Step 1: Write failing tests for contract actions**
- [ ] **Step 2: Implement contract Server Actions**
- [ ] **Step 3: Build ContractList (filterable table: active, installing, completed)**
- [ ] **Step 4: Build ContractDetail (deposit tracking, installation schedule, documents)**
- [ ] **Step 5: Add status workflow: active → installing → completed / cancelled**
- [ ] **Step 6: Run tests and verify pass**
- [ ] **Step 7: Commit**

---

### Task 10: Dashboard & Reporting

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/dashboard/MetricCards.tsx`, `PipelineFunnel.tsx`, `RepLeaderboard.tsx`, `ActivityFeed.tsx`
- Create: `src/actions/dashboard.ts` (getMetrics, getPipelineData, getRepPerformance)
- Create: `src/hooks/useDashboard.ts`
- Test: `src/actions/__tests__/dashboard.test.ts`

**Interfaces:**
- Consumes: All lead/proposal/contract data
- Produces: `getMetrics(tenantId, dateRange)`, `getPipelineData(tenantId)`, `getRepPerformance(tenantId)`

- [ ] **Step 1: Write failing tests for dashboard metrics**
- [ ] **Step 2: Implement dashboard Server Actions (aggregated queries via Supabase RPC)**
- [ ] **Step 3: Build MetricCards (total leads, qualified, proposals sent, won, conversion rate, avg cycle time)**
- [ ] **Step 4: Build PipelineFunnel chart (Recharts or Tremor)**
- [ ] **Step 5: Build RepLeaderboard (sortable table)**
- [ ] **Step 6: Build real-time ActivityFeed (Supabase Realtime subscription)**
- [ ] **Step 7: Run tests and verify pass**
- [ ] **Step 8: Commit**

---

### Task 11: Settings & Administration

**Files:**
- Create: `src/app/dashboard/settings/page.tsx` (tabs: General, Branding, Pipeline, Users, Integrations, Billing)
- Create: `src/components/settings/*.tsx` (one per tab)
- Create: `src/actions/settings.ts` (updateBranding, updatePipeline, inviteUser, updateUserRole)
- Test: `src/actions/__tests__/settings.test.ts`

**Interfaces:**
- Consumes: Tenant, Users, Integrations tables
- Produces: `updateTenantSettings(data)`, `inviteUser(email, role)`, `updateUserRole(userId, role)`

- [ ] **Step 1: Write failing tests for settings actions**
- [ ] **Step 2: Implement settings Server Actions**
- [ ] **Step 3: Build Settings tabs with shadcn/ui Tabs**
- [ ] **Step 4: General — tenant name, slug, timezone, currency**
- [ ] **Step 5: Branding — logo upload, primary color, email templates**
- [ ] **Step 6: Pipeline — drag-drop stage editor (add/remove/reorder)**
- [ ] **Step 7: Users — invite (Supabase Auth admin), role assignment, deactivate**
- [ ] **Step 8: Integrations — Aurora/OpenSolar config (encrypted), webhook URLs**
- [ ] **Step 9: Run tests and verify pass**
- [ ] **Step 10: Commit**

---

### Task 12: Polish, E2E Tests & Deployment Prep

**Files:**
- Create: `playwright.config.ts`, `e2e/*.spec.ts` (critical paths)
- Modify: `package.json` (add test scripts)
- Create: `.github/workflows/ci.yml` (lint, typecheck, test, build)
- Create: `vercel.json` (if needed)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Passing CI, deployable Vercel preview

- [ ] **Step 1: Write E2E tests for critical paths**
  - Lead → Survey → Design → Proposal → Sign → Contract
  - Multi-tenant isolation (two tenants, verify data separation)
  - Role permissions (rep vs manager vs owner)
- [ ] **Step 2: Configure CI pipeline (GitHub Actions)**
- [ ] **Step 3: Run full test suite: `pnpm test && pnpm e2e`**
- [ ] **Step 4: Build production: `pnpm build`**
- [ ] **Step 5: Deploy to Vercel preview, verify Supabase connection**
- [ ] **Step 6: Commit**

---

**Plan complete and saved to `docs/superpowers/plans/2026-10-30-solar-crm-implementation.md`. Please review the plan. Which execution approach would you prefer?**

- **Subagent-driven** - A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** - I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end. Runs well with a mid-tier session model, since the plan carries the design.

**For this plan I recommend Native**, because the 12 tasks have strong sequential dependencies (each task's interfaces feed the next), the plan is detailed with exact signatures, and a single context can hold the full architecture. Subagent-driven would add overhead without much benefit here.

Does the plan capture what you want, and which approach should we use?