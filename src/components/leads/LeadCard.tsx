'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { MoreHorizontal, User, Phone, Mail, MapPin, DollarSign } from 'lucide-react'

interface LeadCardProps {
  lead: any
}

export function LeadCard({ lead }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card border rounded-lg p-3 shadow-sm transition-shadow',
        'hover:shadow-md cursor-grab active:cursor-grabbing',
        isDragging && 'shadow-lg ring-2 ring-solar-orange'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{lead.first_name} {lead.last_name}</h4>
          {lead.email && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Mail className="h-3 w-3" />
              {lead.email}
            </p>
          )}
          {lead.phone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3" />
              {lead.phone}
            </p>
          )}
          {lead.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {lead.address.city}, {lead.address.state}
            </p>
          )}
          {lead.avg_monthly_bill && (
            <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
              <DollarSign className="h-3 w-3" />
              ${(lead.avg_monthly_bill / 100).toLocaleString()}/mo
            </p>
          )}
        </div>
        {lead.assigned_to && (
          <div className="w-6 h-6 rounded-full bg-solar-orange/10 flex items-center justify-center text-solar-orange text-xs font-medium ml-2 flex-shrink-0">
            <User className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{lead.source}</span>
        <button
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}