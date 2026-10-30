import { NextResponse } from 'next/server'
import { getRepPerformance } from '@/actions/dashboard'

export async function GET() {
  try {
    const reps = await getRepPerformance()
    return NextResponse.json(reps)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch rep performance' },
      { status: 500 }
    )
  }
}