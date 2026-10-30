'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Activity {
  id: string
  type: string
  description: string
  user_name?: string
  created_at: string
  lead_id?: string
  lead_name?: string
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch initial activities
    const fetchActivities = async () => {
      const { data } = await supabase
        .from('activities')
        .select(`
          *,
          user:users(full_name),
          lead:leads(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        setActivities(data.map(a => ({
          id: a.id,
          type: a.type,
          description: a.description,
          user_name: a.user?.full_name,
          created_at: a.created_at,
          lead_id: a.lead_id,
          lead_name: a.lead ? `${a.lead.first_name} ${a.lead.last_name}` : undefined,
        })))
      }
      setLoading(false)
    }

    fetchActivities()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('activities')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities' },
        async (payload) => {
          const newActivity = payload.new as Activity & { user?: { full_name: string }; lead?: { first_name: string; last_name: string } }
          setActivities(prev => [{
            id: newActivity.id,
            type: newActivity.type,
            description: newActivity.description,
            user_name: newActivity.user?.full_name,
            created_at: newActivity.created_at,
            lead_id: newActivity.lead_id,
            lead_name: newActivity.lead ? `${newActivity.lead.first_name} ${newActivity.lead.last_name}` : undefined,
          }, ...prev.slice(0, 19)])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('pt-BR')
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lead_created': return '👤'
      case 'lead_updated': return '✏️'
      case 'survey_scheduled': return '📅'
      case 'survey_completed': return '✅'
      case 'design_requested': return '🎨'
      case 'design_received': return '📐'
      case 'proposal_created': return '📄'
      case 'proposal_sent': return '📤'
      case 'proposal_signed': return '✍️'
      case 'contract_created': return '📋'
      case 'contract_updated': return '🔄'
      case 'payment_received': return '💰'
      default: return '📝'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma atividade recente</p>
            ) : (
              activities.map(activity => (
                <div key={activity.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {activity.user_name && <span>{activity.user_name}</span>}
                      {activity.lead_name && <span>• {activity.lead_name}</span>}
                      <span>{formatTime(activity.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}