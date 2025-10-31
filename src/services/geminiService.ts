/**
 * Gemini Service - Handles all interactions with Google Gemini API
 * Provides tone and sentiment analysis for product reviews
 */

import dotenv from 'dotenv';

dotenv.config();

export interface ToneSentimentResult {
  tone: string;
  sentiment: string;
}

export class GeminiService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

    if (!this.apiKey) {
      console.warn('⚠️  GEMINI_API_KEY not configured. LLM analysis will use fallback logic.');
    }
  }

  /**
   * Analyze tone and sentiment of a review using Gemini API
   * @param text - The review text to analyze
   * @param stars - Star rating (1-10)
   * @returns Object containing tone and sentiment
   */
  async analyzeToneSentiment(text: string, stars: number): Promise<ToneSentimentResult> {
    // If no API key, use fallback logic
    if (!this.apiKey) {
      return this.fallbackAnalysis(stars);
    }

    try {
      const prompt = this.buildPrompt(text, stars);
      const response = await this.callGeminiAPI(prompt);
      const result = this.parseGeminiResponse(response);

      console.log(`🤖 Gemini analyzed review: tone=${result.tone}, sentiment=${result.sentiment}`);
      return result;
    } catch (error) {
      console.error('❌ Error calling Gemini API:', error);
      return this.fallbackAnalysis(stars);
    }
  }

  /**
   * Build the prompt for Gemini API
   */
  private buildPrompt(text: string, stars: number): string {
    return `Analyze the tone and sentiment of this product review: "${text}" with ${stars} stars out of 10.

Respond ONLY in this exact JSON format (no markdown, no extra text):
{"tone": "positive/negative/neutral/mixed", "sentiment": "happy/sad/angry/satisfied/disappointed/excited/frustrated/pleased/etc"}

Guidelines:
- Tone: Overall attitude (positive, negative, neutral, mixed)
- Sentiment: Specific emotion conveyed (happy, satisfied, disappointed, etc.)
- Consider both the text content and the star rating
- Be concise and accurate`;
  }

  /**
   * Call Gemini API with the prompt
   */
  private async callGeminiAPI(prompt: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent results
          topK: 1,
          topP: 1,
          maxOutputTokens: 100,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Parse Gemini API response
   */
  private parseGeminiResponse(data: any): ToneSentimentResult {
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    // Try to extract JSON from the response
    const jsonMatch = generatedText.match(/\{[^}]+\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          tone: this.validateTone(parsed.tone),
          sentiment: this.validateSentiment(parsed.sentiment),
        };
      } catch (parseError) {
        console.warn('⚠️  Failed to parse Gemini JSON response:', parseError);
      }
    }

    // If parsing fails, try to extract tone and sentiment manually
    const lowerText = generatedText.toLowerCase();
    
    let tone = 'neutral';
    if (lowerText.includes('positive')) tone = 'positive';
    else if (lowerText.includes('negative')) tone = 'negative';
    else if (lowerText.includes('mixed')) tone = 'mixed';

    let sentiment = 'neutral';
    const sentimentKeywords = ['happy', 'sad', 'angry', 'satisfied', 'disappointed', 
                               'excited', 'frustrated', 'pleased'];
    for (const keyword of sentimentKeywords) {
      if (lowerText.includes(keyword)) {
        sentiment = keyword;
        break;
      }
    }

    return { tone, sentiment };
  }

  /**
   * Validate and normalize tone value
   */
  private validateTone(tone: string): string {
    const validTones = ['positive', 'negative', 'neutral', 'mixed'];
    const normalized = tone?.toLowerCase().trim();
    return validTones.includes(normalized) ? normalized : 'neutral';
  }

  /**
   * Validate and normalize sentiment value
   */
  private validateSentiment(sentiment: string): string {
    const validSentiments = [
      'happy', 'sad', 'angry', 'satisfied', 'disappointed', 
      'excited', 'frustrated', 'pleased', 'neutral'
    ];
    const normalized = sentiment?.toLowerCase().trim();
    return validSentiments.includes(normalized) ? normalized : 'neutral';
  }

  /**
   * Fallback analysis based on star rating when API is unavailable
   */
  private fallbackAnalysis(stars: number): ToneSentimentResult {
    console.log(`⚠️  Using fallback analysis for ${stars} stars`);
    
    if (stars >= 8) {
      return { tone: 'positive', sentiment: 'satisfied' };
    } else if (stars >= 6) {
      return { tone: 'neutral', sentiment: 'pleased' };
    } else if (stars >= 4) {
      return { tone: 'neutral', sentiment: 'neutral' };
    } else {
      return { tone: 'negative', sentiment: 'disappointed' };
    }
  }

  /**
   * Batch analyze multiple reviews
   * Note: Processes sequentially to respect API rate limits
   */
  async analyzeBatch(reviews: Array<{ text: string; stars: number }>): Promise<ToneSentimentResult[]> {
    const results: ToneSentimentResult[] = [];

    for (const review of reviews) {
      const result = await this.analyzeToneSentiment(review.text, review.stars);
      results.push(result);
      
      // Small delay to avoid rate limiting
      await this.delay(100);
    }

    return results;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const geminiService = new GeminiService();

// Export for testing or custom instances
export default geminiService;
