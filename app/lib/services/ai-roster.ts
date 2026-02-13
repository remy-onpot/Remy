// app/lib/services/ai-roster.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'
const pdf = require('pdf-parse')

const apiKey = process.env.GOOGLE_API_KEY?.trim();
if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");

const genAI = new GoogleGenerativeAI(apiKey);

export interface ExtractedStudent {
  index_number: string;
  student_name: string;
}

export class AiRosterService {
  static async extractFromContent(content: Buffer | string, mimeType: string): Promise<ExtractedStudent[]> {
    const textContext = await this.parseToText(content, mimeType);
    return this.generateRosterFromText(textContext);
  }

  private static async parseToText(content: Buffer | string, mimeType: string): Promise<string> {
    if (typeof content === 'string') return content;

    if (mimeType.includes('pdf')) {
      const data = await pdf(content);
      return data.text;
    }
    
    if (mimeType.includes('word') || mimeType.includes('officedocument')) {
      const result = await mammoth.extractRawText({ buffer: content });
      return result.value;
    }

    if (mimeType.includes('text') || mimeType.includes('csv')) {
      return content.toString();
    }

    throw new Error('Unsupported file format. Please paste the text directly.');
  }

  private static async generateRosterFromText(text: string): Promise<ExtractedStudent[]> {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite', 
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert data extraction assistant for a university.
      Extract a list of students (Names and Index/ID Numbers) from the provided text.
      
      RULES:
      - The text might be messy, copied from Word, Excel, or PDF.
      - Identify pairs of Names and ID Numbers.
      - Ignore serial numbers (1, 2, 3), grades, or irrelevant text.
      - "index_number" must be a string (even if it looks like a number).
      - "student_name" should be the full name cleaned of extra spaces.
      
      OUTPUT JSON SCHEMA:
      [
        {
          "index_number": "10293847",
          "student_name": "Kwame Mensah"
        },
        {
          "index_number": "10293848",
          "student_name": "Ama Serwaa"
        }
      ]

      INPUT TEXT:
      ${text.slice(0, 50000)}
    `;

    try {
      const result = await model.generateContent(prompt);
      const textResponse = result.response.text();
      return JSON.parse(textResponse) as ExtractedStudent[];
    } catch (e) {
      console.error("AI Roster Parse Error", e);
      throw new Error("Failed to parse roster data. Please ensure the text contains clear names and IDs.");
    }
  }
}