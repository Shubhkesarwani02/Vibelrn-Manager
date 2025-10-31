import { Worker, type Job } from 'bullmq';
import prisma from '../utils/prismaClient.js';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection for workers
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  maxRetriesPerRequest: null,
};

// Helper function to call Gemini API for tone/sentiment analysis
async function getToneSentiment(text: string, stars: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `Analyze the tone and sentiment of this review: "${text}" with ${stars} stars out of 10.
  
  Respond ONLY in this exact JSON format (no markdown, no extra text):
  {"tone": "positive/negative/neutral/mixed", "sentiment": "happy/sad/angry/satisfied/disappointed/excited/etc"}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    // Try to parse JSON from the response
    const jsonMatch = generatedText.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        tone: parsed.tone || 'neutral',
        sentiment: parsed.sentiment || 'neutral',
      };
    }

    // Fallback: basic parsing
    return {
      tone: stars >= 7 ? 'positive' : stars <= 4 ? 'negative' : 'neutral',
      sentiment: stars >= 7 ? 'satisfied' : stars <= 4 ? 'disappointed' : 'neutral',
    };
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // Fallback based on stars
    return {
      tone: stars >= 7 ? 'positive' : stars <= 4 ? 'negative' : 'neutral',
      sentiment: stars >= 7 ? 'satisfied' : stars <= 4 ? 'disappointed' : 'neutral',
    };
  }
}

// LLM Worker - processes tone/sentiment analysis jobs
export const llmWorker = new Worker(
  'llmQueue',
  async (job: Job) => {
    const { id, text, stars } = job.data;

    try {
      // Get tone and sentiment from Gemini
      const { tone, sentiment } = await getToneSentiment(text, stars);

      // Update the review in database
      await prisma.reviewHistory.update({
        where: { id: BigInt(id) },
        data: {
          tone,
          sentiment,
        },
      });

      console.log(`🤖 Analyzed review ${id}: tone=${tone}, sentiment=${sentiment}`);
      return { success: true, tone, sentiment };
    } catch (error) {
      console.error(`❌ Error analyzing review ${id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 LLM requests concurrently
  }
);

llmWorker.on('completed', (job) => {
  console.log(`✅ LLM job ${job.id} completed`);
});

llmWorker.on('failed', (job, err) => {
  console.error(`❌ LLM job ${job?.id} failed:`, err.message);
});

console.log('🤖 LLM worker started');
