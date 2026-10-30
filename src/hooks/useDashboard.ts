'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardMetrics, PipelineStageData, RepPerformanceData } from '@/actions/dashboard'

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [pipeline, setPipeline] = useState<PipelineStageData[]>([])
  const [reps, setReps] = useState<RepPerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [metricsRes, pipelineRes, repsRes] = await Promise.all([
        fetch('/api/dashboard/metrics').then(r => r.json()),
        fetch('/api/dashboard/pipeline').then(r => r.json()),
        fetch('/api/dashboard/reps').then(r => r.json()),
      ])
      setMetrics(metricsRes)
      setPipeline(pipelineRes)
      setReps(repsRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { metrics, pipeline, reps, loading, error, refetch: fetchData }
}