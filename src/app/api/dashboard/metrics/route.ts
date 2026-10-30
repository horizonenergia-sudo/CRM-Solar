import { NextRequest, NextResponse } from 'next/server'
import { getMetrics } from '@/actions/dashboard'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const metrics = await getMetrics(startDate && endDate ? { startDate, endDate } : undefined)
    return NextResponse.json(metrics)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}