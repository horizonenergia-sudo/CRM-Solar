import { getLeads } from '@/actions/leads'
import { SurveyCalendar } from '@/components/surveys/SurveyCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Filter } from 'lucide-react'
import Link from 'next/link'

export default async function SurveysPage() {
  // In a real app, you'd fetch surveys from a server action
  // For now, we'll pass empty array and the calendar will show empty state
  const surveys: any[] = []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Site Surveys</h1>
          <p className="text-muted-foreground">Schedule and manage site surveys</p>
        </div>
        <Link href="/dashboard/surveys/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Survey
          </Button>
        </Link>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Survey Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SurveyCalendar surveys={surveys} />
        </CardContent>
      </Card>

      {/* Upcoming Surveys List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming Surveys</CardTitle>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No upcoming surveys. Schedule your first survey to get started.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}