import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'
import { StudentResult } from '@/app/dashboard/quiz/[id]/analytics/AnalyticsClient'

export default function StudentResultsTable({ students, searchTerm, setSearchTerm, statusFilter, setStatusFilter, formatTime }: any) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-slate-50/50 border-b pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Student Results</CardTitle>
            <CardDescription>Individual performance data</CardDescription>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-white" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Index No.</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center">%</TableHead>
              <TableHead className="text-center">Time</TableHead>
              <TableHead className="text-center">Violations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student: StudentResult) => (
              <TableRow key={student.index_number}>
                <TableCell className="font-mono text-slate-500 pl-6">{student.index_number}</TableCell>
                <TableCell className="font-medium">{student.student_name}</TableCell>
                <TableCell className="text-center">{student.score !== null ? student.score : '-'}</TableCell>
                <TableCell className="text-center font-bold">
                  <span className={student.percentage >= 70 ? 'text-green-600' : student.percentage < 50 ? 'text-red-500' : 'text-slate-700'}>
                    {student.percentage}%
                  </span>
                </TableCell>
                <TableCell className="text-center text-slate-500 text-sm">{student.time_taken ? formatTime(student.time_taken) : '-'}</TableCell>
                <TableCell className="text-center">
                  {student.violations > 0 ? <Badge variant="destructive" className="bg-red-500">{student.violations}</Badge> : <span className="text-slate-300">-</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    student.status === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    student.status === 'flagged' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }>
                    {student.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {student.session_id && (student.status === 'submitted' || student.status === 'flagged') && (
                    <Link href={`/exam/session/${student.session_id}/results`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}