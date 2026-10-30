import { NextResponse } from 'next/server'
import { getPipelineData } from '@/actions/dashboard'

export async function GET() {
  try {
    const pipeline = await getPipelineData()
    return NextResponse.json(pipeline)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch pipeline data' },
      { status: 500 }
    )
  }
}