'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Phone, Mail, Calendar, MessageSquare, TrendingUp, Clock, MoreHorizontal } from 'lucide-react'

interface Activity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'status_change'
  subject: string
  body: string
  metadata?: Record<string, unknown>
  created_at: string
  user?: {
    full_name: string | null
    avatar_url: string | null
  }
}

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  task: TrendingUp,
  status_change: Clock,
}

const activityColors = {
  call: 'text-green-600 bg-green-100',
  email: 'text-blue-600 bg-blue-100',
  meeting: 'text-purple-600 bg-purple-100',
  note: 'text-gray-600 bg-gray-100',
  task: 'text-yellow-600 bg-yellow-100',
  status_change: 'text-orange-600 bg-orange-100',
}

export function ActivityFeed({ leadId }: { leadId: string }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchActivities() {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          user:users!activities_user_id_fkey(full_name, avatar_url)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setActivities(data)
      }
      setLoading(false)
    }

    fetchActivities()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`activities:${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          setActivities((prev) => [payload.new as Activity, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
        <p>No activity yet. Start by logging a call, email, or note.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.type] || MessageSquare
        const colorClass = activityColors[activity.type] || 'text-gray-600 bg-gray-100'
        const isLast = index === activities.length - 1

        return (
          <div key={activity.id} className="relative">
            {!isLast && (
              <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-muted" />
            )}
            <div className="relative flex gap-4">
              <div className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <div className={cn('w-2 h-2 rounded-full', colorClass)} />
              </div>
              <div className="flex-1 space-y-2 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{activity.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.user?.full_name || 'Unknown'} · {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {activity.body && (
                  <p className="text-sm text-foreground pl-2">{activity.body}</p>
                )}
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <details className="text-xs text-muted-foreground pl-2">
                    <summary className="cursor-pointer">Show details</summary>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(activity.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}