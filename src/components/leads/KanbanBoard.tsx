'use client'

import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LeadCard } from './LeadCard'
import { cn } from '@/lib/utils'

const PIPELINE_STAGES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'survey_scheduled', label: 'Survey Scheduled' },
  { id: 'proposal_sent', label: 'Proposal Sent' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
]

interface KanbanColumnProps {
  stage: typeof PIPELINE_STAGES[0]
  leads: any[]
  onLeadDrop: (leadId: string, newStatus: string) => void
}

function KanbanColumn({ stage, leads, onLeadDrop }: KanbanColumnProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      onLeadDrop(active.id as string, stage.id)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col min-w-[300px] max-w-[300px] bg-muted/30 rounded-lg p-3">
          <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
            {stage.label} ({leads.length})
          </h3>
          <div className="space-y-2 min-h-[200px]">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
            {leads.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-4">
                Drop leads here
              </div>
            )}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  )
}

export function KanbanBoard({ leads, onLeadDrop }: { leads: any[]; onLeadDrop: (leadId: string, newStatus: string) => void }) {
  const leadsByStage = PIPELINE_STAGES.map(stage => ({
    ...stage,
    leads: leads.filter(lead => lead.status === stage.id),
  }))

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {leadsByStage.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          leads={stage.leads}
          onLeadDrop={onLeadDrop}
        />
      ))}
    </div>
  )
}