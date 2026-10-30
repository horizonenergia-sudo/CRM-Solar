import { notFound } from 'next/navigation'
import { SurveyDetail } from '@/components/surveys/SurveyDetail'

interface SurveyDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SurveyDetailPage({ params }: SurveyDetailPageProps) {
  const { id } = await params

  // In a real app, you'd fetch the survey from a server action
  // For now, return not found
  notFound()
}