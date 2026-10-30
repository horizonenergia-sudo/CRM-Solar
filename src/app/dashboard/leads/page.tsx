import { getLeads } from '@/actions/leads'
import { KanbanBoard } from '@/components/leads/KanbanBoard'
import { LeadForm } from '@/components/leads/LeadForm'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function LeadsPage() {
  const leads = await getLeads()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads Pipeline</h1>
          <p className="text-muted-foreground">Manage your leads from first contact to signed contract</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/leads/new">
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Link>
        </Button>
      </div>

      <KanbanBoard
        leads={leads}
        onLeadDrop={async (leadId, newStatus) => {
          // This would call a server action in a real app
          console.log('Move lead:', leadId, 'to:', newStatus)
        }}
      />
    </div>
  )
}