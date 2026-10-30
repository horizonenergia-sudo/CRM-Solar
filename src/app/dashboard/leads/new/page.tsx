import { LeadForm } from '@/components/leads/LeadForm'
import { createLead } from '@/actions/leads'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NewLeadPage() {
  const handleSubmit = async (data: any) => {
    const lead = await createLead(data)
    redirect(`/dashboard/leads/${lead.id}`)
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/leads"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to leads
      </Link>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>New Lead</CardTitle>
            <CardDescription>Enter the lead information to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadForm onSubmit={handleSubmit} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}