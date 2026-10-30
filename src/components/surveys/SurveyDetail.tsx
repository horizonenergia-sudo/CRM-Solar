'use client'

import { format } from 'date-fns'
import { MapPin, Clock, User, Camera, Image, ChevronLeft, Edit, Trash2, Download, CheckCircle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  rescheduled: 'bg-purple-100 text-purple-800',
}

const statusLabels = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  rescheduled: 'Rescheduled',
}

interface SurveyDetailProps {
  survey: {
    id: string
    lead_id: string
    surveyor_id: string
    scheduled_at: string
    completed_at: string | null
    status: keyof typeof statusColors
    roof_photos: string[]
    electrical_panel_photos: string[]
    measurements: Record<string, unknown>
    notes: string
    lead?: {
      first_name: string
      last_name: string
      email: string
      phone: string
      address?: {
        street: string
        city: string
        state: string
        zip: string
      }
    }
    surveyor?: {
      full_name: string
    }
  }
}

export function SurveyDetail({ survey }: SurveyDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/surveys"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to surveys
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {survey.lead ? `${survey.lead.first_name} ${survey.lead.last_name}` : 'Site Survey'}
            </h1>
            <Badge className={cn(statusColors[survey.status])}>
              {statusLabels[survey.status]}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="font-medium">{format(new Date(survey.scheduled_at), 'MMM d, yyyy HH:mm')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {survey.completed_at && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="font-medium">{format(new Date(survey.completed_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {survey.lead?.address && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium text-sm">
                    {survey.lead.address.street}, {survey.lead.address.city}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {survey.surveyor && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <User className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Surveyor</p>
                  <p className="font-medium">{survey.surveyor.full_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="photos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="photos">Photos ({survey.roof_photos.length + survey.electrical_panel_photos.length})</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="photos">
          <div className="space-y-6 pt-4">
            {survey.roof_photos.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Roof Photos
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {survey.roof_photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img src={photo} alt={`Roof photo ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Button variant="ghost" size="icon" className="text-white">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {survey.electrical_panel_photos.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Electrical Panel Photos
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {survey.electrical_panel_photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img src={photo} alt={`Electrical panel photo ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Button variant="ghost" size="icon" className="text-white">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(survey.roof_photos.length === 0 && survey.electrical_panel_photos.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No photos uploaded yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="measurements">
          <div className="pt-4 space-y-4">
            {Object.entries(survey.measurements).length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(survey.measurements).map(([key, value]) => (
                  <Card key={key}>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      <p className="font-medium text-xl">{String(value)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No measurements recorded</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <div className="pt-4">
            {survey.notes ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="whitespace-pre-wrap">{survey.notes}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No notes added</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}