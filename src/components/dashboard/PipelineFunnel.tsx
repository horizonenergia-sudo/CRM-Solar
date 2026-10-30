'use client'

import { PipelineStageData } from '@/actions/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STAGE_LABELS: Record<string, string> = {
  new: 'Novo',
  qualified: 'Qualificado',
  survey_scheduled: 'Agendado',
  survey_completed: 'Vistoriado',
  design_ready: 'Projeto',
  proposal_sent: 'Proposta',
  won: 'Ganho',
  lost: 'Perdido',
}

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-blue-500',
  qualified: 'bg-indigo-500',
  survey_scheduled: 'bg-purple-500',
  survey_completed: 'bg-pink-500',
  design_ready: 'bg-orange-500',
  proposal_sent: 'bg-teal-500',
  won: 'bg-green-500',
  lost: 'bg-gray-400',
}

export function PipelineFunnel({ pipeline }: { pipeline: PipelineStageData[] }) {
  const maxCount = Math.max(...pipeline.map(p => p.count), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Funil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pipeline.map((stage, index) => {
            const width = (stage.count / maxCount) * 100
            return (
              <div key={stage.stage} className="group">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium w-24 truncate">{STAGE_LABELS[stage.stage] || stage.stage}</span>
                  <span className="text-muted-foreground">{stage.count}</span>
                  {stage.valueCents > 0 && (
                    <span className="text-xs text-green-600 ml-2">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(stage.valueCents / 100)}
                    </span>
                  )}
                </div>
                <div className="relative h-6 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`${STAGE_COLORS[stage.stage] || 'bg-primary'} h-full transition-all duration-500 ease-out`}
                    style={{ width: `${width}%` }}
                  />
                  {stage.count > 0 && (
                    <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-medium text-white">
                      {stage.count}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}