// app/lib/services/ai-grading.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_API_KEY?.trim();
if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");

const genAI = new GoogleGenerativeAI(apiKey);

export class AiGradingService {
  static async gradeAnswer(
    questionContent: string, 
    studentAnswer: string, 
    sampleAnswer: string, 
    maxPoints: number
  ) {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite', 
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are a strict but fair university professor grading an exam.
      
      Question: "${questionContent}"
      Maximum Marks Available: ${maxPoints}
      Lecturer's Answer Key / Rubric: "${sampleAnswer}"
      
      Student's Answer: "${studentAnswer}"

      Evaluate the student's answer against the key. 
      Output a JSON object with:
      1. "score": A number between 0 and ${maxPoints}. Use partial credit (e.g., 2.5) if they got part of it right.
      2. "feedback": A short, 1-2 sentence explanation of why they got this score. Be direct.

      EXPECTED JSON SCHEMA:
      {
        "score": 3,
        "feedback": "The student correctly identified X, but failed to mention Y."
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const textResponse = result.response.text();
      return JSON.parse(textResponse) as { score: number, feedback: string };
    } catch (error) {
      console.error("AI Grading failed:", error);
      throw new Error("Failed to generate AI grade.");
    }
  }
}