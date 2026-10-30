import { test, expect } from '@playwright/test'

test.describe('Lead to Contract Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as owner
    await page.goto('/login')
    await page.fill('input[name="email"]', 'owner@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('complete lead to contract flow', async ({ page }) => {
    // 1. Create a new lead
    await page.goto('/leads')
    await page.click('text=Novo Lead')
    await page.fill('input[name="first_name"]', 'João')
    await page.fill('input[name="last_name"]', 'Silva')
    await page.fill('input[name="email"]', 'joao.silva@example.com')
    await page.fill('input[name="phone"]', '(11) 99999-9999')
    await page.fill('input[name="address.street"]', 'Rua das Flores')
    await page.fill('input[name="address.number"]', '123')
    await page.fill('input[name="address.city"]', 'São Paulo')
    await page.fill('input[name="address.state"]', 'SP')
    await page.fill('input[name="address.zip_code"]', '01234-567')
    await page.fill('input[name="avg_monthly_bill"]', '500')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=João Silva')).toBeVisible()

    // 2. Schedule a survey
    await page.click('text=Agendar Vistoria')
    await page.fill('input[name="scheduled_at"]', '2026-12-01T10:00:00')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Agendado')).toBeVisible()

    // 3. Complete survey (mobile view)
    await page.goto('/survey/survey-token-123')
    await page.click('text=Iniciar Vistoria')
    await page.fill('textarea[name="notes"]', 'Telha cerâmica, bom acesso')
    await page.click('text=Finalizar Vistoria')

    await expect(page.locator('text=Vistoria Concluída')).toBeVisible()

    // 4. Request design (would trigger webhook in real app)
    // For E2E, we'll simulate design approval
    await page.goto('/designs')
    await expect(page.locator('text=Projeto Recebido')).toBeVisible({ timeout: 10000 })
    await page.click('text=Aprovar Projeto')

    await expect(page.locator('text=Aprovado')).toBeVisible()

    // 5. Create and send proposal
    await page.goto('/proposals')
    await page.click('text=Nova Proposta')
    await page.fill('input[name="system_price_cents"]', '2500000')
    await page.fill('input[name="deposit_percent"]', '10')
    await page.click('button[type="submit"]')

    await page.click('text=Enviar Proposta')
    await expect(page.locator('text=Enviada')).toBeVisible()

    // 6. Sign proposal (public view)
    await page.goto('/proposal/proposal-token-123')
    await expect(page.locator('text=João Silva')).toBeVisible()
    await page.click('button:has-text("Assinar")')
    await page.fill('input[name="signature"]', 'data:image/png;base64,signature-data')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Assinada com sucesso')).toBeVisible()

    // 7. Verify contract created
    await page.goto('/contracts')
    await expect(page.locator('text=CTR-')).toBeVisible()
    await expect(page.locator('text=Ativo')).toBeVisible()
  })
})

test.describe('Multi-tenant Isolation', () => {
  test('tenant A cannot see tenant B data', async ({ page }) => {
    // Login as tenant A owner
    await page.goto('/login')
    await page.fill('input[name="email"]', 'owner-a@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.goto('/leads')
    await expect(page.locator('text=Lead Tenant A')).toBeVisible()
    await expect(page.locator('text=Lead Tenant B')).not.toBeVisible()

    // Login as tenant B owner
    await page.goto('/logout')
    await page.fill('input[name="email"]', 'owner-b@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.goto('/leads')
    await expect(page.locator('text=Lead Tenant B')).toBeVisible()
    await expect(page.locator('text=Lead Tenant A')).not.toBeVisible()
  })
})

test.describe('Role Permissions', () => {
  test('rep can only see assigned leads', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'rep@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.goto('/leads')
    await expect(page.locator('text=Meu Lead')).toBeVisible()
    await expect(page.locator('text=Lead do Outro Rep')).not.toBeVisible()

    // Rep cannot access settings
    await page.goto('/dashboard/settings')
    await expect(page.locator('text=Acesso negado')).toBeVisible()
  })

  test('manager can manage team leads', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'manager@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.goto('/leads')
    await expect(page.locator('text=Lead do Rep 1')).toBeVisible()
    await expect(page.locator('text=Lead do Rep 2')).toBeVisible()

    // Manager can access settings but not all tabs
    await page.goto('/dashboard/settings')
    await expect(page.locator('text=Pipeline')).toBeVisible()
    await expect(page.locator('text=Users')).toBeVisible()
  })

  test('owner has full access', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'owner@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.goto('/dashboard/settings')
    await expect(page.locator('text=General')).toBeVisible()
    await expect(page.locator('text=Branding')).toBeVisible()
    await expect(page.locator('text=Pipeline')).toBeVisible()
    await expect(page.locator('text=Users')).toBeVisible()
    await expect(page.locator('text=Integrations')).toBeVisible()
    await expect(page.locator('text=Billing')).toBeVisible()
  })
})