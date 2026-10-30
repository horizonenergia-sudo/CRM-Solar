'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { LeadForm } from './LeadForm'
import { LeadTimeline } from './LeadTimeline'
import { ActivityFeed } from '@/components/activities/ActivityFeed'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Phone, Mail, MapPin, DollarSign, Calendar, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const statusColors = {
  new: 'bg-gray-100 text-gray-800',
  contacted: 'bg-blue-100 text-blue-800',
  qualified: 'bg-green-100 text-green-800',
  survey_scheduled: 'bg-yellow-100 text-yellow-800',
  proposal_sent: 'bg-purple-100 text-purple-800',
  won: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
}

const statusLabels = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  survey_scheduled: 'Survey Scheduled',
  proposal_sent: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
}

interface LeadDetailProps {
  lead: any
  activities: any[]
}

export function LeadDetail({ lead, activities }: LeadDetailProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  const handleUpdate = async (data: any) => {
    // In a real app, this would call a server action
    console.log('Update lead:', data)
    setIsEditing(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this lead?')) {
      // Call delete action
      console.log('Delete lead:', lead.id)
      router.push('/dashboard/leads')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    // Call updateLeadStatus action
    console.log('Update status:', lead.id, newStatus)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/leads"
            className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to leads
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{lead.first_name} {lead.last_name}</h1>
            <Badge className={cn(statusColors[lead.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800')}>
              {statusLabels[lead.status as keyof typeof statusLabels] || lead.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {lead.email && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{lead.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {lead.phone && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{lead.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {lead.address && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {lead.address.city}, {lead.address.state} {lead.address.zip}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {lead.avg_monthly_bill && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Bill</p>
                  <p className="font-medium">${(lead.avg_monthly_bill / 100).toLocaleString()}/mo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          {isEditing ? (
            <LeadForm
              initialData={{
                first_name: lead.first_name,
                last_name: lead.last_name,
                email: lead.email,
                phone: lead.phone,
                source: lead.source,
                address_street: lead.address?.street,
                address_city: lead.address?.city,
                address_state: lead.address?.state,
                address_zip: lead.address?.zip,
                utility_provider: lead.utility_provider,
                avg_monthly_bill: lead.avg_monthly_bill?.toString(),
                roof_type: lead.roof_type,
                shading_notes: lead.shading_notes,
                notes: lead.notes,
              }}
              onSubmit={handleUpdate}
              onClose={() => setIsEditing(false)}
            />
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Source</p>
                      <p className="font-medium capitalize">{lead.source}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned To</p>
                      <p className="font-medium">{lead.assigned_to ? 'Team Member' : 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Utility Provider</p>
                      <p className="font-medium">{lead.utility_provider || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Roof Type</p>
                      <p className="font-medium">{lead.roof_type || '—'}</p>
                    </div>
                    {lead.address?.street && (
                      <div className="sm:col-span-2">
                        <p className="text-sm text-muted-foreground">Full Address</p>
                        <p className="font-medium">
                          {lead.address.street}, {lead.address.city}, {lead.address.state} {lead.address.zip}
                        </p>
                      </div>
                    )}
                    {lead.shading_notes && (
                      <div className="sm:col-span-2">
                        <p className="text-sm text-muted-foreground">Shading Notes</p>
                        <p className="font-medium">{lead.shading_notes}</p>
                      </div>
                    )}
                    {lead.notes && (
                      <div className="sm:col-span-2">
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="font-medium">{lead.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Status Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Change Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <Button
                        key={value}
                        variant={lead.status === value ? 'default' : 'outline'}
                        onClick={() => handleStatusChange(value)}
                        disabled={lead.status === value}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <LeadTimeline activities={activities} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed leadId={lead.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}