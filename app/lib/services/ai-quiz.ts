import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'

// Initialize Gemini
const apiKey = process.env.GOOGLE_API_KEY?.trim(); // <--- Add .trim() here

if (!apiKey) {
  throw new Error("Missing GOOGLE_API_KEY");
}

const genAI = new GoogleGenerativeAI(apiKey);
// Define the shape of our output to ensure type safety
export interface ExtractedQuiz {
  title: string
  questions: Array<{
    content: string
    type: 'mcq' | 'short_answer' | 'boolean'
    points: number
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
      // Dynamic import to avoid loading pdf-parse during build time
      const pdfParse = await import('pdf-parse')
      // Handle both default export and CommonJS export
      const pdf = (pdfParse as any).default || pdfParse
      const data = await pdf(content)
      return data.text
    }
    
    if (mimeType.includes('word') || mimeType.includes('officedocument')) {
      const result = await mammoth.extractRawText({ buffer: content })
      return result.value
    }

    throw new Error('Unsupported file type')
  }

  /**
   * Helper: The actual AI Prompting logic
   */
  private static async generateQuizFromText(text: string): Promise<ExtractedQuiz> {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite', // Using stable Gemini model
      generationConfig: { responseMimeType: "application/json" } // Force JSON
    })

    const prompt = `
You are an expert educational assistant specializing in digitizing examination questions.

TASK: Extract ALL questions from the provided text and convert them into structured JSON format.

DETECTION RULES:
1. Question Types:
   - MCQ: Multiple choice with 2+ options (A, B, C, D or 1, 2, 3, 4)
   - Boolean: True/False, Yes/No, T/F questions
   - Short Answer: Essay, theory, or open-ended questions

2. Answer Detection (CHECK ALL):
   - Look for: bold text, asterisks (*), underline, checkmarks (✓, ✔)
   - Answer key formats: "Answer: B", "Correct: B", "(B)", "Ans: B"
   - Separate answer section at document end
   - If NO answer found → set ALL options to "is_correct": false

3. Content Cleaning:
   - Remove question numbers (1., Q1, Question 1, etc.)
   - Extract point values: "[5 marks]" → points: 5
   - Preserve formatting for code, math, special characters

4. Option Handling:
   - MCQ: Extract all lettered/numbered options (minimum 2)
   - Boolean: ALWAYS create exactly 2 options: [{"content": "True", "is_correct": ?}, {"content": "False", "is_correct": ?}]
   - Short Answer: NO options field at all

OUTPUT SCHEMA (STRICT JSON):
{
  "title": "Extracted or Generated Quiz Title",
  "questions": [
    {
      "content": "Clean question text without numbers",
      "type": "mcq",
      "points": 2,
      "options": [
        { "content": "Option text", "is_correct": false },
        { "content": "Option text", "is_correct": true }
      ]
    },
    {
      "content": "Is the sky blue?",
      "type": "boolean",
      "points": 1,
      "options": [
        { "content": "True", "is_correct": true },
        { "content": "False", "is_correct": false }
      ]
    },
    {
      "content": "Explain photosynthesis",
      "type": "short_answer",
      "points": 5
    }
  ]
}

IMPORTANT:
- If text is not a quiz, return: {"title": "Untitled Quiz", "questions": []}
- Extract EVERYTHING that looks like a question
- Default points to 1 if not specified
- Preserve original question wording

INPUT TEXT:
${text.slice(0, 30000)}
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