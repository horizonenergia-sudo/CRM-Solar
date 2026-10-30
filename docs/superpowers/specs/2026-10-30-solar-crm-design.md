# Solar CRM SaaS - Design Specification

**Date:** 2026-10-30  
**Project:** Solar CRM for Residential Installers  
**Approach:** Next.js 14 (App Router) + Supabase (PostgreSQL + Auth + RLS + Realtime)  
**Classification:** Architectural - New Project

---

## 1. Executive Summary

A multi-tenant SaaS CRM purpose-built for **residential solar installation companies** (1-50 employees). The MVP focuses on the **lead-to-contract pipeline**: capturing leads, qualifying them, managing site surveys, generating proposals with designs from Aurora/OpenSolar, and closing contracts. Built on Next.js + Supabase for rapid development, native multi-tenancy via Row-Level Security, and serverless scaling.

---

## 2. Target Audience & Success Criteria

| Dimension | Detail |
|-----------|--------|
| **Primary Users** | Solar sales reps, project coordinators, owners of small-to-mid residential installers |
| **Secondary Users** | Homeowners (customer portal - post-MVP) |
| **Scale Target** | 100+ tenant companies, 10K+ leads, 1K+ concurrent users |
| **Success Metrics** | Lead-to-contract conversion rate ↑, cycle time ↓, design-to-proposal time < 15 min |
| **Launch Timeline** | MVP in 8 weeks, beta in 12 weeks, GA in 16 weeks |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 14 (Vercel)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Marketing  │  │   Dashboard │  │   Customer  │              │
│  │   Pages     │  │   (App)     │  │   Portal    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│              ┌───────────────────────┐                           │
│              │   Supabase Platform   │                           │
│              │  ┌─────────────────┐  │                           │
│              │  │  PostgreSQL     │  │                           │
│              │  │  + RLS Policies │  │                           │
│              │  └────────┬────────┘  │                           │
│              │           │           │                           │
│              │  ┌────────▼────────┐  │                           │
│              │  │  Auth (Email/   │  │                           │
│              │  │  Magic Link/    │  │                           │
│              │  │  OAuth)         │  │                           │
│              │  └─────────────────┘  │                           │
│              │  ┌─────────────────┐  │                           │
│              │  │  Realtime       │  │                           │
│              │  │  (WebSockets)   │  │                           │
│              │  └─────────────────┘  │                           │
│              │  ┌─────────────────┐  │                           │
│              │  │  Edge Functions │  │                           │
│              │  │  (Webhooks,     │  │                           │
│              │  │   Integrations) │  │                           │
│              │  └─────────────────┘  │                           │
│              └───────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Aurora  │    │ OpenSolar│    │  Email/  │
    │   API    │    │   API    │    │  SMS     │
    └──────────┘    └──────────┘    └──────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js App Router** | Server Components reduce bundle, Streaming SSR, built-in API routes |
| **Supabase (PostgreSQL)** | Native RLS for multi-tenancy, Auth included, Realtime for collaborative features |
| **Row-Level Security** | Single database, zero-trust isolation, scales to 1000s of tenants |
| **Server Actions + RPC** | Type-safe mutations, no separate API layer needed |
| **Tailwind CSS + shadcn/ui** | Design system consistency, accessible components, fast iteration |

---

## 4. Data Model (Multi-Tenant)

### Core Tables

```sql
-- Tenants (Solar Companies)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,          -- subdomain: acme-solar.solarcrm.app
  logo_url TEXT,
  settings JSONB DEFAULT '{}',        -- branding, workflow config, integrations
  subscription_tier TEXT DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'trial',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users (belongs to tenant via RLS)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'rep',            -- 'owner' | 'manager' | 'rep' | 'viewer'
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  source TEXT,                        -- 'website' | 'referral' | 'canvassing' | 'purchased'
  status TEXT DEFAULT 'new',          -- 'new' | 'contacted' | 'qualified' | 'survey_scheduled' | 'proposal_sent' | 'won' | 'lost'
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address JSONB,                      -- {street, city, state, zip, lat, lng}
  utility_provider TEXT,
  avg_monthly_bill INTEGER,           -- in cents
  roof_type TEXT,
  shading_notes TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activities (Timeline)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,                 -- 'call' | 'email' | 'meeting' | 'note' | 'task' | 'status_change'
  subject TEXT,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Site Surveys
CREATE TABLE site_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  surveyor_id UUID REFERENCES users(id),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',    -- 'scheduled' | 'in_progress' | 'completed' | 'rescheduled'
  roof_photos TEXT[],
  electrical_panel_photos TEXT[],
  measurements JSONB,                 -- roof dimensions, azimuth, tilt, obstructions
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Designs (from Aurora/OpenSolar)
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  site_survey_id UUID REFERENCES site_surveys(id),
  external_id TEXT,                   -- Aurora/OpenSolar design ID
  external_source TEXT,               -- 'aurora' | 'opensolar'
  name TEXT,
  system_size_kw DECIMAL(6,2),
  panel_count INTEGER,
  inverter_type TEXT,
  battery_count INTEGER DEFAULT 0,
  annual_production_kwh INTEGER,
  shade_report JSONB,
  layout_image_url TEXT,
  proposal_pdf_url TEXT,
  status TEXT DEFAULT 'draft',        -- 'draft' | 'review' | 'approved' | 'rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Proposals
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  design_id UUID REFERENCES designs(id),
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',        -- 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired'
  total_price_cents INTEGER,
  financing_options JSONB,            -- [{lender, term, rate, monthly_payment, down_payment}]
  contract_pdf_url TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contracts (Signed Proposals)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  contract_number TEXT UNIQUE NOT NULL,
  signed_pdf_url TEXT,
  deposit_amount_cents INTEGER,
  deposit_paid_at TIMESTAMPTZ,
  installation_scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',       -- 'active' | 'installing' | 'completed' | 'cancelled'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Integrations Config (per tenant)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                 -- 'aurora' | 'opensolar' | 'loanpal' | 'solarapp'
  config JSONB NOT NULL,              -- encrypted API keys, webhook secrets
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies (Multi-Tenant Isolation)

```sql
-- Enable RLS on all tenant tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their tenant's data
CREATE POLICY "tenant_isolation" ON leads
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Same pattern for all other tables...

-- Policy: Owners/Managers see all, Reps see only assigned
CREATE POLICY "lead_access" ON leads
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager')
      OR assigned_to = auth.uid()
    )
  );
```

---

## 5. Feature Specification (MVP)

### 5.1 Lead Management
- **Lead Capture**: Public form embed, manual entry, CSV import
- **Kanban Board**: Drag-and-drop pipeline (New → Contacted → Qualified → Survey → Proposal → Won/Lost)
- **Lead Detail**: Timeline of all activities, documents, communications
- **Assignment**: Auto-round-robin or manual assign to reps
- **Filtering/Sorting**: By status, source, assignee, date, value

### 5.2 Site Survey Management
- **Scheduling**: Calendar view, drag-to-reschedule, SMS/email reminders
- **Mobile Survey Form**: Offline-capable PWA for field surveyors
- **Photo Upload**: Roof, electrical panel, obstructions (auto-compressed)
- **Measurements**: Roof planes, azimuth, tilt, shading objects
- **Sync**: Auto-create design job in Aurora/OpenSolar

### 5.3 Design Integration (Aurora/OpenSolar)
- **OAuth/Token Storage**: Encrypted per-tenant credentials
- **Design Import**: Webhook receiver for completed designs
- **Design Library**: Versioned designs per lead, comparison view
- **Production Estimates**: Auto-populate from design API
- **Layout Images**: Thumbnail gallery for proposal generation

### 5.4 Proposal Generation
- **Template System**: Brandable PDF templates (cover, scope, pricing, warranty, terms)
- **Dynamic Pricing**: Base + adders (battery, EV charger, panel upgrade, critter guard)
- **Financing Calculator**: Embedded loan/lease/PPA options with real-time payments
- **E-Signature**: DocuSign-style embedded signing (Supabase Edge Function + HelloSign/DocuSign API)
- **Tracking**: Open/view notifications via Realtime

### 5.5 Dashboard & Reporting
- **Pipeline Dashboard**: Funnel metrics, conversion rates, avg deal size, cycle time
- **Rep Leaderboard**: Individual/team performance
- **Forecast**: Weighted pipeline by close probability
- **Activity Feed**: Real-time team activity stream

### 5.6 Settings & Administration
- **Tenant Branding**: Logo, colors, email templates
- **Pipeline Customization**: Add/remove/reorder stages
- **User Management**: Invite, role assignment, deactivate
- **Integration Config**: Aurora/OpenSolar API keys, webhook URLs
- **Subscription/Billing**: Stripe integration (post-MVP)

---

## 6. User Flows

### Flow 1: New Lead to Contract (Happy Path)
```
1. Lead submitted via website form
      ↓
2. Auto-assigned to rep → "New" status
      ↓
3. Rep calls → logs activity → "Contacted"
      ↓
4. Qualifies (bill > $150, roof OK) → "Qualified"
      ↓
5. Schedules site survey → Calendar invite sent
      ↓
6. Surveyor completes mobile survey → photos + measurements
      ↓
7. Auto-triggers design request to Aurora/OpenSolar
      ↓
8. Design webhook received → Design record created
      ↓
9. Rep reviews design → builds proposal from template
      ↓
10. Proposal sent → Homeowner views → E-signs
      ↓
11. Contract created → Deposit collected → Installation scheduled
```

### Flow 2: Design Iteration
```
Rep opens lead → Designs tab → "Request Revision" 
      ↓
Comment added (e.g., "Move array to west face") 
      ↓
Edge Function calls Aurora API with revision notes
      ↓
New design version created → Notification to rep
```

---

## 7. API & Integration Specs

### 7.1 Aurora Solar API
- **Auth**: OAuth 2.0 (tenant-level tokens stored encrypted)
- **Endpoints Used**:
  - `POST /api/v2/designs` - Create design job from survey data
  - `GET /api/v2/designs/:id` - Poll for completion
  - `POST /api/v2/designs/:id/revisions` - Request changes
  - Webhook: `design.completed`, `design.failed`
- **Data Mapping**: Survey measurements → Aurora site model

### 7.2 OpenSolar API
- **Auth**: API Key (per tenant)
- **Endpoints Used**:
  - `POST /api/v1/projects` - Create project with site data
  - `POST /api/v1/projects/:id/designs` - Generate design
  - `GET /api/v1/projects/:id/designs/:design_id` - Fetch results
  - Webhook: `design.ready`, `proposal.generated`

### 7.3 Webhook Security
- All webhooks validated via HMAC signature
- Processed in Supabase Edge Functions (deno runtime)
- Idempotency keys prevent duplicate processing
- Retry with exponential backoff (max 3 attempts)

---

## 8. UI/UX Design Direction

### Visual Language
- **Color Palette**: Solar-inspired — sun orange (#F97316), sky blue (#0EA5E9), slate neutrals
- **Typography**: Inter (UI), JetBrains Mono (data/monospace)
- **Components**: shadcn/ui + custom solar-specific components
- **Density**: Comfortable for all-day use, compact tables for pipeline views

### Key Screens
1. **Pipeline Kanban** — Columnar drag-drop, inline edit, quick actions
2. **Lead Detail** — Split view: timeline left, details right, sticky header
3. **Survey Mobile** — Full-screen PWA, camera integration, offline queue
4. **Proposal Builder** — Template preview, pricing table, live preview
5. **Dashboard** — Metric cards, pipeline funnel chart, activity feed

### Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation throughout
- Screen reader tested
- High contrast mode support

---

## 9. Security & Compliance

| Area | Implementation |
|------|----------------|
| **Authentication** | Supabase Auth: Email/password, Magic links, Google/Microsoft OAuth |
| **Authorization** | RLS + Role-based (owner/manager/rep/viewer) |
| **Data Encryption** | At rest (Supabase managed), In transit (TLS 1.3), API keys encrypted via `pgcrypto` |
| **PII Handling** | Minimal collection, right-to-delete via admin panel |
| **Audit Log** | All mutations logged to `audit_log` table via triggers |
| **Rate Limiting** | Supabase built-in + custom per-tenant limits |
| **SOC 2** | Architecture supports future compliance (audit logs, encryption, access control) |

---

## 10. Technical Debt & Known Limitations

| Item | Impact | Mitigation |
|------|--------|------------|
| Single-region Supabase | Latency for non-US tenants | Plan multi-region at scale |
| No offline desktop app | Surveyors need mobile web | PWA with service worker caching |
| Aurora/OpenSolar rate limits | Batch design requests | Queue + retry in Edge Functions |
| PDF generation complexity | Template maintenance | Use React-PDF or Puppeteer service |

---

## 11. Out of Scope (MVP)

- Customer portal (homeowner login)
- Installation project management (permits, inspections, PTO)
- Inventory/warehouse management
- Advanced commission calculations
- Multi-language support
- White-label mobile app
- Accounting integration (QuickBooks/Xero)
- Marketing automation (email sequences)

---

## 12. Next Steps

1. **Spec Review** → User approval
2. **Invoke writing-plans** → Detailed implementation plan with phases
3. **Scaffold Project** → Next.js + Supabase + Tailwind + shadcn/ui
4. **Phase 1** — Auth, Tenants, Leads, Pipeline Kanban
5. **Phase 2** — Activities, Site Surveys, Mobile PWA
6. **Phase 3** — Aurora/OpenSolar Integration, Designs
7. **Phase 4** — Proposals, E-signature, Contracts
8. **Phase 5** — Dashboard, Reporting, Settings
9. **Beta Launch** → 3-5 pilot tenants

---

*End of Specification*