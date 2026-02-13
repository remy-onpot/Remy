import { NextResponse } from 'next/server'
import { supabaseClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, description, students } = await req.json()
    
    if (!name || !students || students.length === 0) {
      return NextResponse.json({ error: 'Roster name and students are required.' }, { status: 400 })
    }

    // 1. Create the Master Roster entry
    const { data: roster, error: rosterError } = await supabaseClient
      .from('saved_rosters')
      .insert({
        lecturer_id: user.id,
        name,
        description
      })
      .select()
      .single()

    if (rosterError || !roster) throw new Error('Failed to create master roster record.')

    // 2. Prepare and Insert the students
    // We deduplicate by index_number just in case the messy input had duplicates
    const uniqueStudentsMap = new Map()
    students.forEach((s: any) => {
      uniqueStudentsMap.set(s.index_number, s.student_name)
    })

    const studentsToInsert = Array.from(uniqueStudentsMap.entries()).map(([index_number, student_name]) => ({
      saved_roster_id: roster.id,
      index_number,
      student_name
    }))

    const { error: studentsError } = await supabaseClient
      .from('saved_roster_students')
      .insert(studentsToInsert)

    if (studentsError) {
      // Rollback if students fail to save
      await supabaseClient.from('saved_rosters').delete().eq('id', roster.id)
      throw new Error('Failed to save student records.')
    }

    return NextResponse.json({ success: true, rosterId: roster.id, count: studentsToInsert.length })

  } catch (error: any) {
    console.error('Save Master Roster Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}