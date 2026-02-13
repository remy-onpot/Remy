import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { QuestionStats } from '@/app/dashboard/quiz/[id]/analytics/AnalyticsClient'

export default function QuestionAnalysisTable({ stats }: { stats: QuestionStats[] }) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle>Question Analysis</CardTitle>
        <CardDescription>Performance breakdown by question</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Question Snippet</TableHead>
              <TableHead className="text-center">Correct</TableHead>
              <TableHead className="text-center">Wrong</TableHead>
              <TableHead className="text-center">Unanswered</TableHead>
              <TableHead className="text-center">Correct %</TableHead>
              <TableHead className="text-center">Difficulty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((q) => (
              <TableRow key={q.question_id} className="hover:bg-slate-50">
                <TableCell className="text-center font-medium text-slate-500">{q.position}</TableCell>
                <TableCell className="max-w-[300px] truncate text-slate-700">{q.content}</TableCell>
                <TableCell className="text-center text-green-600 font-medium">{q.correct_count}</TableCell>
                <TableCell className="text-center text-red-500">{q.wrong_count}</TableCell>
                <TableCell className="text-center text-slate-500">{q.unanswered_count}</TableCell>
                <TableCell className="text-center font-bold">{q.correct_percentage}%</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={
                    q.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-200' :
                    q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }>{q.difficulty}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}