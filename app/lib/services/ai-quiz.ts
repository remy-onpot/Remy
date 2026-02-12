import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'
const pdf = require('pdf-parse')

// Initialize Gemini with the API Key
const apiKey = process.env.GOOGLE_API_KEY?.trim();
if (!apiKey) {
  throw new Error("Missing GOOGLE_API_KEY");
}
const genAI = new GoogleGenerativeAI(apiKey);
// Define the shape of our output to ensure type safety
export interface ExtractedQuiz {
  title: string
  questions: Array<{
    content: string
    type: 'mcq' | 'short_answer' | 'boolean' | 'long_answer' | 'comprehension'
    points: number
    // Context is for the reading passage (Comprehension)
    context?: string
    // Sample answer is for the lecturer's grading guide (Theory)
    sample_answer?: string
    options?: Array<{ content: string; is_correct: boolean }>
  }>
}

export class AiQuizService {
  /**
   * Main entry point: Takes a file buffer or text string and returns a structured quiz
   */
  static async extractFromContent(
    content: Buffer | string, 
    mimeType: string
  ): Promise<ExtractedQuiz> {
    
    // 1. Convert everything to raw text first
    // This is cheaper & faster than sending binary files to the AI
    const textContext = await this.parseToText(content, mimeType)

    // 2. Call Gemini with the text
    return this.generateQuizFromText(textContext)
  }

  /**
   * Helper: extract raw text from PDF or Word
   */
  private static async parseToText(content: Buffer | string, mimeType: string): Promise<string> {
    if (typeof content === 'string') return content // It's already text (Paste feature)

    if (mimeType.includes('pdf')) {
      const data = await pdf(content)
      return data.text
    }
    
    if (mimeType.includes('word') || mimeType.includes('officedocument')) {
      const result = await mammoth.extractRawText({ buffer: content })
      return result.value
    }

    // Default fallback for plain text files
    if (mimeType.includes('text')) {
      return content.toString()
    }

    throw new Error('Unsupported file type')
  }

  /**
   * Helper: The actual AI Prompting logic
   */
  private static async generateQuizFromText(text: string): Promise<ExtractedQuiz> {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite', // Your stable 2026 model
      generationConfig: { responseMimeType: "application/json" }
    })

    const prompt = `
You are an expert educational assistant specializing in digitizing examination questions.

TASK: Extract ALL questions from the provided text and convert them into structured JSON format.

DETECTION RULES:
1. Question Types:
   - MCQ: Multiple choice with 2+ options (A, B, C, D or 1, 2, 3, 4)
   - Boolean: True/False, Yes/No, T/F questions
   - Short Answer: Brief responses, definitions, fill-in-the-blank
   - Long Answer: Essays, detailed explanations, "Explain...", "Discuss...", "Define in detail..."
   - Comprehension: Questions based on a provided reading passage/context

2. Answer Detection (CHECK ALL):
   - Look for: bold text, asterisks (*), underline, checkmarks (✓, ✔)
   - Answer key formats: "Answer: B", "Correct: B", "(B)", "Ans: B"
   - Separate answer section at document end
   - Model answers or marking schemes for theory questions
   - If NO answer found → set ALL options to "is_correct": false

3. Content Cleaning:
   - Remove question numbers (1., Q1, Question 1, etc.)
   - Extract point values: "[5 marks]" → points: 5
   - Preserve formatting for code, math, special characters
   - Keep technical terms and formulas intact

4. Option Handling:
   - MCQ: Extract all lettered/numbered options (minimum 2)
   - Boolean: ALWAYS create exactly 2 options: [{"content": "True", "is_correct": ?}, {"content": "False", "is_correct": ?}]
   - Short Answer / Long Answer: NO options field at all
   - Comprehension: NO options field (unless it's a comprehension-MCQ hybrid)

5. Special Fields:
   - context: For comprehension questions, extract the full reading passage text
   - sample_answer: If the document provides model answers, marking schemes, or expected responses for theory questions, include them here

6. Comprehension Question Rules:
   - Identify reading passages (usually labeled "Read the passage...", "Passage:", or indented text blocks)
   - Put the full passage in 'context' field for the FIRST question related to it
   - For follow-up questions from same passage, include context again or reference it
   - Mark type as 'comprehension' for passage-based questions

OUTPUT SCHEMA (STRICT JSON):
{
  "title": "Extracted or Generated Quiz Title",
  "questions": [
    {
      "content": "What is 2+2?",
      "type": "mcq",
      "points": 1,
      "options": [
        { "content": "3", "is_correct": false },
        { "content": "4", "is_correct": true },
        { "content": "5", "is_correct": false }
      ]
    },
    {
      "content": "Is the Earth flat?",
      "type": "boolean",
      "points": 1,
      "options": [
        { "content": "True", "is_correct": false },
        { "content": "False", "is_correct": true }
      ]
    },
    {
      "content": "Name the capital of France",
      "type": "short_answer",
      "points": 2
    },
    {
      "content": "Define Market Segmentation and explain its importance",
      "type": "long_answer",
      "points": 10,
      "sample_answer": "Market segmentation is the process of dividing a market into distinct groups..."
    },
    {
      "content": "According to the passage, why did the villagers migrate?",
      "type": "comprehension",
      "context": "In the late 19th century, a severe drought struck the region. The villagers, who depended entirely on agriculture, faced crop failures year after year. With no other means of livelihood, many families decided to migrate to urban areas in search of work.",
      "points": 5
    }
  ]
}

IMPORTANT:
- If text is not a quiz, return: {"title": "Untitled Quiz", "questions": []}
- Extract EVERYTHING that looks like a question
- Default points to 1 if not specified
- Preserve original question wording
- For ambiguous questions, make best judgment on type based on phrasing and expected answer length

INPUT TEXT:
${text.slice(0, 50000)}
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const textResponse = response.text()

    try {
      return JSON.parse(textResponse) as ExtractedQuiz
    } catch (e) {
      console.error("AI JSON Parse Error", e)
      throw new Error("Failed to parse AI response")
    }
  }
}