import { Card, CardContent } from '@/components/ui/card'
import { Users, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { StudentResult } from '@/app/dashboard/quiz/[id]/analytics/AnalyticsClient'

export default function SummaryCards({ students, formatTime }: { students: StudentResult[], formatTime: (s: number) => string }) {
  const submitted = students.filter(s => s.status === 'submitted' || s.status === 'flagged')
  const inProgress = students.filter(s => s.status === 'in_progress' && s.session_id).length
  const flagged = students.filter(s => s.status === 'flagged').length

  const avgScore = submitted.length > 0 ? Math.round(submitted.reduce((sum, s) => sum + s.percentage, 0) / submitted.length) : 0
  const highest = submitted.length > 0 ? Math.max(...submitted.map(s => s.percentage)) : 0
  const lowest = submitted.length > 0 ? Math.min(...submitted.filter(s => s.score !== null).map(s => s.percentage)) : 0
  
  const medianTime = submitted.length > 0
    ? submitted.filter(s => s.time_taken !== null).sort((a, b) => (a.time_taken || 0) - (b.time_taken || 0))[Math.floor(submitted.length / 2)]?.time_taken || 0
    : 0

  const StatCard = ({ title, value, icon: Icon, valueColor = "", iconColor = "text-muted-foreground" }: any) => (
    <Card className="shadow-sm hover:shadow transition-shadow border-slate-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
            <p className={`text-xl sm:text-2xl font-bold ${valueColor}`}>{value}</p>
          </div>
          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 opacity-80 ${iconColor}`} />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      <StatCard title="Total Roster" value={students.length} icon={Users} />
      <StatCard title="Completed" value={submitted.length} icon={CheckCircle} valueColor="text-green-600" iconColor="text-green-500" />
      <StatCard title="In Progress" value={inProgress} icon={Clock} valueColor="text-blue-600" iconColor="text-blue-500" />
      <StatCard title="Average" value={`${avgScore}%`} icon={TrendingUp} />
      <StatCard title="Highest" value={`${highest}%`} icon={TrendingUp} valueColor="text-green-600" iconColor="text-green-500" />
      <StatCard title="Lowest" value={`${lowest}%`} icon={TrendingDown} valueColor="text-red-600" iconColor="text-red-500" />
      <StatCard title="Flagged" value={flagged} icon={AlertTriangle} valueColor="text-red-600" iconColor="text-red-500" />
      <StatCard title="Med. Time" value={formatTime(medianTime)} icon={Clock} />
    </div>
  )
}