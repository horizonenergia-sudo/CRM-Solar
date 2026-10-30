import { getSurveyByToken } from '@/actions/surveys'
import { completeSurvey } from '@/actions/surveys'
import { SurveyForm } from '@/components/surveys/SurveyForm'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

interface SurveyPageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: SurveyPageProps): Promise<Metadata> {
  const { token } = await params
  try {
    const survey = await getSurveyByToken(token)
    if (survey?.lead) {
      return {
        title: `Site Survey - ${survey.lead.first_name} ${survey.lead.last_name}`,
        description: 'Complete your solar site survey',
      }
    }
  } catch {
    // Ignore errors, fallback to default
  }
  return {
    title: 'Site Survey',
    description: 'Complete your solar site survey',
  }
}

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { token } = await params

  const survey = await getSurveyByToken(token)

  if (!survey) {
    notFound()
  }

  if (survey.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Survey Already Completed</h1>
            <p className="text-muted-foreground mb-6">
              This survey has already been completed. Thank you for your time!
            </p>
            <p className="text-sm text-muted-foreground">
              {survey.lead?.first_name} {survey.lead?.last_name} • {new Date(survey.scheduled_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleComplete = async (data: {
    roof_photos: string[]
    electrical_panel_photos: string[]
    measurements: Record<string, unknown>
    notes: string
  }) => {
    await completeSurvey(survey.id, data)
  }

  const handleCancel = () => {
    // Could redirect to a thank you page or just close
    window.history.back()
  }

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Solar Survey" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-gray-50">
        <SurveyForm
          survey={survey}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}