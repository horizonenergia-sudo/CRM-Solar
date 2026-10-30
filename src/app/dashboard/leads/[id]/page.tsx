import { getLeads } from '@/actions/leads'
import { getActivities } from '@/actions/activities'
import { LeadDetail } from '@/components/leads/LeadDetail'
import { notFound } from 'next/navigation'

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params
  const leads = await getLeads()
  const lead = leads.find((l: { id: string }) => l.id === id)

  if (!lead) {
    notFound()
  }

  const activities = await getActivities(id)

  return <LeadDetail lead={lead} activities={activities} />
}