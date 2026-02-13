/**
 * Test file for AI Quiz Extraction Service
 * Run with: npx tsx lib/services/__tests__/ai-quiz.test.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { AiQuizService } from '../ai-quiz'

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

const sampleLongAnswer = `
Essay Questions

1. Define Market Segmentation and explain its importance in modern business strategy. [10 marks]

Model Answer: Market segmentation is the process of dividing a broad consumer or business market into sub-groups of consumers based on shared characteristics. It is important because it allows businesses to target specific audiences with tailored marketing strategies, improve customer satisfaction, optimize resource allocation, and gain competitive advantage.

2. Discuss the impact of artificial intelligence on employment. Provide examples. [15 marks]

Expected Response: AI has both positive and negative impacts on employment. While it automates repetitive tasks leading to job displacement in some sectors, it also creates new job opportunities in tech, data science, and AI maintenance. Examples include manufacturing robots replacing assembly line workers, but creating demand for robotics engineers.
`

const sampleComprehension = `
Reading Comprehension

Read the following passage and answer the questions below:

The Industrial Revolution, which began in Britain in the late 18th century, marked a major turning point in human history. It transformed economies that had been based on agriculture and handicrafts into economies based on large-scale industry, mechanized manufacturing, and the factory system. New machines, new power sources, and new ways of organizing work made existing industries more productive and efficient. The textile industry, in particular, was transformed by innovations such as the spinning jenny and the power loom.

The revolution also brought significant social changes. Rural populations moved to urban centers in search of factory work, leading to rapid urbanization. While this created economic opportunities, it also resulted in overcrowded cities, poor working conditions, and child labor. Over time, these issues led to labor movements and social reforms.

Questions:

1. According to the passage, when and where did the Industrial Revolution begin? [2 marks]

2. What industry is specifically mentioned as being transformed by innovations? [2 marks]
Answer: The textile industry

3. Describe two social changes that resulted from the Industrial Revolution according to the passage. [5 marks]
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
  console.log('\n📝 TEST 1: Mixed Question Types (MCQ, Boolean, Short Answer, Long Answer)')
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
    const longCount = result1.questions.filter(q => q.type === 'long_answer').length
    
    console.log(`- MCQ: ${mcqCount}`)
    console.log(`- Boolean: ${booleanCount}`)
    console.log(`- Short Answer: ${shortCount}`)
    console.log(`- Long Answer: ${longCount}`)
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

  // Test 5: Long Answer/Essay Questions with Sample Answers
  console.log('\n\n📝 TEST 5: Long Answer Questions with Sample Answers')
  console.log('-'.repeat(80))
  try {
    const result5 = await AiQuizService.extractFromContent(sampleLongAnswer, 'text/plain')
    console.log('✅ Success!')
    console.log('\nExtracted Quiz:')
    console.log(JSON.stringify(result5, null, 2))
    
    // Validate long answer structure
    const longAnswerCount = result5.questions.filter(q => q.type === 'long_answer').length
    const hasSampleAnswers = result5.questions.some(q => q.sample_answer && q.sample_answer.length > 0)
    const hasNoOptions = result5.questions.every(q => !q.options || q.options.length === 0)
    
    console.log(`\nLong Answer Questions: ${longAnswerCount}`)
    console.log(`Sample answers extracted: ${hasSampleAnswers ? '✅' : '❌'}`)
    console.log(`No options field (correct for essays): ${hasNoOptions ? '✅' : '❌'}`)
  } catch (error: any) {
    console.error('❌ Test 5 Failed:', error.message)
  }

  // Test 6: Comprehension Questions with Reading Passage
  console.log('\n\n📝 TEST 6: Comprehension Questions with Context/Passage')
  console.log('-'.repeat(80))
  try {
    const result6 = await AiQuizService.extractFromContent(sampleComprehension, 'text/plain')
    console.log('✅ Success!')
    console.log('\nExtracted Quiz:')
    console.log(JSON.stringify(result6, null, 2))
    
    // Validate comprehension structure
    const comprehensionCount = result6.questions.filter(q => q.type === 'comprehension').length
    const hasContext = result6.questions.some(q => q.context && q.context.length > 50)
    const contextContainsPassage = result6.questions.some(q => 
      q.context?.includes('Industrial Revolution') || q.context?.includes('textile industry')
    )
    
    console.log(`\nComprehension Questions: ${comprehensionCount}`)
    console.log(`Context/passage extracted: ${hasContext ? '✅' : '❌'}`)
    console.log(`Context contains passage text: ${contextContainsPassage ? '✅' : '❌'}`)
  } catch (error: any) {
    console.error('❌ Test 6 Failed:', error.message)
  }

  console.log('\n' + '='.repeat(80))
  console.log('🎉 All tests completed!')
  console.log('\n💡 Tips:')
  console.log('- Check if correct answers are properly marked for MCQ/Boolean')
  console.log('- Verify question numbers are removed from content')
  console.log('- Confirm point values are extracted correctly')
  console.log('- Ensure boolean questions always have True/False options')
  console.log('- Long answer questions should have sample_answer field')
  console.log('- Comprehension questions should have context field with passage')
  console.log('- Theory questions should NOT have options field')
  console.log('\n')
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
