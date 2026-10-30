'use client'

import { DashboardMetrics } from '@/actions/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  trend?: { value: number; label: string }
}

function MetricCard({ title, value, description, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {trend && (
          <span className={`text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
}

export function MetricCards({ metrics }: { metrics: DashboardMetrics | null }) {
  if (!metrics) return null

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Leads"
        value={formatNumber(metrics.totalLeads)}
        description="All leads in pipeline"
      />
      <MetricCard
        title="Qualified Leads"
        value={formatNumber(metrics.qualifiedLeads)}
        description="Leads ready for survey"
      />
      <MetricCard
        title="Proposals Sent"
        value={formatNumber(metrics.proposalsSent)}
        description="Proposals delivered to clients"
      />
      <MetricCard
        title="Deals Won"
        value={formatNumber(metrics.proposalsSigned)}
        description={`Conversion: ${metrics.conversionRate.toFixed(1)}%`}
      />
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(metrics.totalRevenueCents)}
        description="Signed contracts value"
      />
      <MetricCard
        title="Avg Cycle Time"
        value={`${metrics.avgCycleDays} days`}
        description="Lead to contract"
      />
    </div>
  )
}