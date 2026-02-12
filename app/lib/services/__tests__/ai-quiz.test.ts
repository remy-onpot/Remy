/**
 * Test file for AI Quiz Extraction Service
 * Run with: npx tsx lib/services/__tests__/ai-quiz.test.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { AiQuizService } from '../ai-quiz.js'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../../../.env.local') })

// Sample quiz text with various formats
const sampleQuizText = `
Computer Science Midterm Exam

1. What does CPU stand for? [2 marks]
A) Central Processing Unit
B) Computer Personal Unit
C) Central Power Unit
D) Computer Processing Unit
Answer: A

2. Which programming language is known as the "mother of all languages"?
a) Python
b) C
c) Java
d) Assembly
Correct Answer: (d)

3. True or False: HTML is a programming language. [1 mark]
Answer: False

4. RAM stands for Random Access Memory.
T/F
(True)

5. Explain the difference between compiler and interpreter. [5 marks]

6. Which of the following is NOT an operating system?
1. Windows
2. Linux
3. Microsoft Word *
4. macOS

Answer Key:
Q1: A
Q2: d
Q3: False
Q4: True
Q5: (Essay question - no single answer)
Q6: 3
`

const sampleBooleanQuiz = `
True/False Quiz

1. The Earth is flat.
Answer: False

2. JavaScript and Java are the same language.
Ans: F

3. Binary uses only 0s and 1s. ✓
`

const sampleMCQOnly = `
Multiple Choice Questions

Question 1: What is 2 + 2?
A. 3
B. 4 ✓
C. 5
D. 6

Question 2 [3 pts]: Which is a primary color?
(a) Green
(b) Red *
(c) Purple
(d) Orange
`

async function runTests() {
  console.log('🧪 Starting AI Quiz Extraction Tests...\n')
  
  // Check if API key is set
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ ERROR: GOOGLE_API_KEY not found in environment variables')
    console.error('\n📝 Please add your Google API key to .env.local:')
    console.error('GOOGLE_API_KEY=your-api-key-here')
    console.error('\nGet your key from: https://aistudio.google.com/app/apikey')
    process.exit(1)
  }
  
  console.log(`🔑 API Key found: ${process.env.GOOGLE_API_KEY.substring(0, 20)}...`)
  console.log('=' .repeat(80))

  // Test 1: Mixed question types
  console.log('\n📝 TEST 1: Mixed Question Types (MCQ, Boolean, Short Answer)')
  console.log('-'.repeat(80))
  try {
    const result1 = await AiQuizService.extractFromContent(sampleQuizText, 'text/plain')
    console.log('✅ Success!')
    console.log('\nExtracted Quiz:')
    console.log(JSON.stringify(result1, null, 2))
    console.log(`\nTotal Questions: ${result1.questions.length}`)
    
    // Validate structure
    const mcqCount = result1.questions.filter(q => q.type === 'mcq').length
    const booleanCount = result1.questions.filter(q => q.type === 'boolean').length
    const shortCount = result1.questions.filter(q => q.type === 'short_answer').length
    
    console.log(`- MCQ: ${mcqCount}`)
    console.log(`- Boolean: ${booleanCount}`)
    console.log(`- Short Answer: ${shortCount}`)
  } catch (error: any) {
    console.error('❌ Test 1 Failed:', error.message)
  }

  // Test 2: Boolean only
  console.log('\n\n📝 TEST 2: Boolean Questions Only')
  console.log('-'.repeat(80))
  try {
    const result2 = await AiQuizService.extractFromContent(sampleBooleanQuiz, 'text/plain')
    console.log('✅ Success!')
    console.log('\nExtracted Quiz:')
    console.log(JSON.stringify(result2, null, 2))
    
    // Validate boolean structure
    const allHaveTwoOptions = result2.questions.every(q => 
      q.type === 'boolean' && q.options?.length === 2
    )
    console.log(`\nAll Boolean questions have 2 options: ${allHaveTwoOptions ? '✅' : '❌'}`)
  } catch (error: any) {
    console.error('❌ Test 2 Failed:', error.message)
  }

  // Test 3: MCQ with point values
  console.log('\n\n📝 TEST 3: MCQ with Point Values')
  console.log('-'.repeat(80))
  try {
    const result3 = await AiQuizService.extractFromContent(sampleMCQOnly, 'text/plain')
    console.log('✅ Success!')
    console.log('\nExtracted Quiz:')
    console.log(JSON.stringify(result3, null, 2))
    
    // Check if points were extracted
    const hasCustomPoints = result3.questions.some(q => q.points > 1)
    console.log(`\nCustom points extracted: ${hasCustomPoints ? '✅' : '⚠️'}`)
    
    // Check if correct answers were detected
    const hasCorrectAnswers = result3.questions.some(q => 
      q.options?.some(opt => opt.is_correct)
    )
    console.log(`Correct answers detected: ${hasCorrectAnswers ? '✅' : '❌'}`)
  } catch (error: any) {
    console.error('❌ Test 3 Failed:', error.message)
  }

  // Test 4: Empty/Invalid input
  console.log('\n\n📝 TEST 4: Invalid Input Handling')
  console.log('-'.repeat(80))
  try {
    const result4 = await AiQuizService.extractFromContent('This is just random text with no questions.', 'text/plain')
    console.log('✅ Success!')
    console.log('\nResult:', JSON.stringify(result4, null, 2))
    console.log(`Questions extracted: ${result4.questions.length} (should be 0 or low)`)
  } catch (error: any) {
    console.error('❌ Test 4 Failed:', error.message)
  }

  console.log('\n' + '='.repeat(80))
  console.log('🎉 All tests completed!')
  console.log('\n💡 Tips:')
  console.log('- Check if correct answers are properly marked')
  console.log('- Verify question numbers are removed from content')
  console.log('- Confirm point values are extracted correctly')
  console.log('- Ensure boolean questions always have True/False options')
  console.log('\n')
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
