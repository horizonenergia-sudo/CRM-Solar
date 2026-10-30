'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Survey {
  id: string
  lead_id: string
  surveyor_id: string
  scheduled_at: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'rescheduled'
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

interface SurveyCalendarProps {
  surveys: Survey[]
  onSurveyClick?: (survey: Survey) => void
  onDateClick?: (date: Date) => void
}

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

export function SurveyCalendar({ surveys, onSurveyClick, onDateClick }: SurveyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const surveysByDate = new Map<string, Survey[]>()

  surveys.forEach((survey) => {
    if (survey.scheduled_at) {
      const dateKey = format(new Date(survey.scheduled_at), 'yyyy-MM-dd')
      if (!surveysByDate.has(dateKey)) {
        surveysByDate.set(dateKey, [])
      }
      surveysByDate.get(dateKey)!.push(survey)
    }
  })

  const getSurveysForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return surveysByDate.get(dateKey) || []
  }

  const renderDay = (date: Date) => {
    const daySurveys = getSurveysForDate(date)
    const isCurrentMonth = isSameMonth(date, currentMonth)
    const isToday = isSameDay(date, new Date())
    const isSelected = selectedDate && isSameDay(date, selectedDate)

    return (
      <button
        key={date.toISOString()}
        onClick={() => {
          setSelectedDate(date)
          onDateClick?.(date)
        }}
        className={cn(
          'relative min-h-[100px] p-2 border border-gray-200',
          !isCurrentMonth && 'bg-gray-50 text-muted-foreground',
          isToday && 'bg-blue-50 border-blue-200',
          isSelected && 'bg-blue-100 border-blue-300',
          'hover:bg-gray-100 transition-colors'
        )}
        style={{ width: '100%' }}
      >
        <div className={cn('text-sm font-medium', isToday && 'text-blue-600')}>
          {format(date, 'd')}
        </div>
        {daySurveys.length > 0 && (
          <div className="mt-1 space-y-1 max-h-[80px] overflow-y-auto">
            {daySurveys.slice(0, 3).map((survey) => (
              <div
                key={survey.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onSurveyClick?.(survey)
                }}
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer',
                  statusColors[survey.status]
                )}
              >
                {format(new Date(survey.scheduled_at), 'HH:mm')} - {survey.lead?.first_name} {survey.lead?.last_name}
              </div>
            ))}
            {daySurveys.length > 3 && (
              <div className="text-xs text-muted-foreground text-center">
                +{daySurveys.length - 3} more
              </div>
            )}
          </div>
        )}
      </button>
    )
  }

  const days = Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {format(currentMonth, 'MMMM yyyy')}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date) => renderDay(date))}
        </div>

        {/* Selected Date Surveys */}
        {selectedDate && getSurveysForDate(selectedDate).length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium">Surveys on {format(selectedDate, 'MMMM d, yyyy')}</h4>
            {getSurveysForDate(selectedDate).map((survey) => (
              <div
                key={survey.id}
                onClick={() => onSurveyClick?.(survey)}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{survey.lead?.first_name} {survey.lead?.last_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {survey.lead?.address ? `${survey.lead.address.street}, ${survey.lead.address.city}, ${survey.lead.address.state} ${survey.lead.address.zip}` : 'Address not provided'}
                    </p>
                  </div>
                  <Badge className={cn(statusColors[survey.status])}>
                    {statusLabels[survey.status]}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(survey.scheduled_at), 'HH:mm')}
                  </span>
                  {survey.surveyor && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {survey.surveyor.full_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}