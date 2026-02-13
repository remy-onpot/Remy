import { NextResponse } from 'next/server'
import { supabaseClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { quizId, savedRosterIds } = await req.json()

    if (!quizId || !savedRosterIds || !savedRosterIds.length) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 1. Fetch all students from the selected saved rosters
    const { data: sourceStudents, error: fetchError } = await supabaseClient
      .from('saved_roster_students')
      .select('index_number, student_name')
      .in('saved_roster_id', savedRosterIds)

    if (fetchError) throw fetchError

    // 2. Deduplicate (in case a student is in multiple selected rosters)
    const uniqueStudentsMap = new Map()
    sourceStudents.forEach(student => {
      uniqueStudentsMap.set(student.index_number, student.student_name)
    })

    // 3. Prepare data for the Quiz Roster
    const rosterToInsert = Array.from(uniqueStudentsMap.entries()).map(([index_number, student_name]) => ({
      quiz_id: quizId,
      index_number,
      student_name
    }))

    // 4. Insert into the actual Quiz Roster (ignoring conflicts if they are already there)
    const { error: insertError } = await supabaseClient
      .from('roster')
      .upsert(rosterToInsert, { onConflict: 'quiz_id, index_number', ignoreDuplicates: true })

    if (insertError) throw insertError

    return NextResponse.json({ 
      success: true, 
      importedCount: rosterToInsert.length 
    })

  } catch (error: any) {
    console.error('Import Saved Roster Error:', error)
    return NextResponse.json({ error: 'Failed to import roster' }, { status: 500 })
  }
}