import AnalyticsClient from './AnalyticsClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AnalyticsServerPage({ params }: PageProps) {
  const resolvedParams = await params
  return <AnalyticsClient quizId={resolvedParams.id} />
}