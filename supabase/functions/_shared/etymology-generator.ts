export interface Etymology {
  saying: string;
  origin: string;
  meaning: string;
  era: string;
}

export interface FeedbackData {
  liked: string[];
  disliked: string[];
}

// Requests `count` etymologies in a single call rather than one-at-a-time -
// with hundreds of previously-used sayings to avoid, asking for one at a time
// and rejecting duplicates client-side meant a bad run could need dozens of
// sequential API calls, risking edge function timeouts. Batching bounds the
// number of round trips regardless of how much history there is to avoid.
export async function generateEtymologyBatch(
  recentSayings: string[],
  feedbackData: FeedbackData,
  count: number
): Promise<Etymology[]> {
  const geminiApiKey = Deno.env.get('GOOGLE_AI_API_KEY');

  const recentList = recentSayings.length > 0
    ? `\n\nDo NOT use any of these already-used sayings: ${recentSayings.join(', ')}`
    : '';

  const feedbackContext = feedbackData.liked.length > 0 || feedbackData.disliked.length > 0
    ? `\n\nBased on subscriber feedback:
${feedbackData.liked.length > 0 ? `- These sayings were LIKED (generate more like these): ${feedbackData.liked.join(', ')}` : ''}
${feedbackData.disliked.length > 0 ? `- These sayings were DISLIKED (avoid similar ones): ${feedbackData.disliked.join(', ')}` : ''}`
    : '';

  const prompt = `Generate ${count} fascinating etymologies for common English sayings or phrases.

Requirements:
- Choose well-known sayings or idioms that people use regularly
- Each one must be a different saying - no repeats within your own answer
- Each origin story should be historically accurate and interesting
- Include the time period or era when each one originated
- Explain what each saying means in modern usage
${recentList}${feedbackContext}

Return ONLY a valid JSON array of exactly ${count} objects, in this exact format (no markdown, no code blocks):
[
  {
    "saying": "the exact saying or phrase",
    "origin": "detailed historical origin story (2-3 sentences)",
    "meaning": "modern meaning and usage (1-2 sentences)",
    "era": "time period (e.g., '16th Century', 'Ancient Rome', '1800s')"
  }
]`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1.0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            saying: { type: 'string' },
            origin: { type: 'string' },
            meaning: { type: 'string' },
            era: { type: 'string' }
          },
          required: ['saying', 'origin', 'meaning', 'era']
        }
      }
    }
  };

  // Three attempts on gemini-2.5-flash with increasing delays (Google recommends ~32s retry on 503)
  const attempts = [
    { model: 'gemini-2.5-flash', delayMs: 0 },
    { model: 'gemini-2.5-flash', delayMs: 15000 },
    { model: 'gemini-2.5-flash', delayMs: 35000 },
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < attempts.length; i++) {
    const { model, delayMs } = attempts[i];

    if (delayMs > 0) {
      console.log(`Waiting ${delayMs}ms before attempt ${i + 1}/${attempts.length}...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    console.log(`Gemini API attempt ${i + 1}/${attempts.length} using ${model} (requesting ${count} etymologies)`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const isRetryable = [500, 502, 503, 429].includes(response.status);

      if (isRetryable && i < attempts.length - 1) {
        console.log(`Retryable error ${response.status} on ${model}, will retry...`);
        lastError = new Error(`Google AI API request failed: ${response.status} - ${errorText}`);
        continue;
      }
      throw new Error(`Google AI API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const finishReason = data.candidates[0].finishReason;
    console.log(`Gemini API finish reason (${model}):`, finishReason);

    if (finishReason === 'MAX_TOKENS' || finishReason === 'RECITATION') {
      if (i < attempts.length - 1) {
        console.log(`Retrying after ${finishReason} on ${model}...`);
        lastError = new Error(`Gemini API response truncated (${finishReason})`);
        continue;
      }
      throw new Error(`Gemini API response truncated (${finishReason}) after all attempts`);
    }

    if (!data.candidates[0].content?.parts?.[0]?.text) {
      console.error('No content in Gemini response:', JSON.stringify(data, null, 2));
      throw new Error('Gemini API returned no content');
    }

    const content = data.candidates[0].content.parts[0].text;
    console.log('Gemini response length:', content.length, 'characters');

    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let etymologies: Etymology[];
    try {
      etymologies = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse JSON response from Gemini API');
      console.error('Raw content:', content);
      console.error('Cleaned content:', cleanContent);
      console.error('Parse error:', parseError);
      throw new Error(`Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    if (!Array.isArray(etymologies)) {
      console.error('Expected an array of etymologies, got:', etymologies);
      throw new Error('Generated response was not an array of etymologies');
    }

    const valid = etymologies.filter(e => e && e.saying && e.origin && e.meaning && e.era);
    if (valid.length < etymologies.length) {
      console.log(`Discarding ${etymologies.length - valid.length} malformed etymologies from the batch`);
    }

    console.log(`Generated ${valid.length} etymologies (${model}, attempt ${i + 1})`);

    return valid;
  }

  throw lastError || new Error('Failed to generate etymologies after all attempts');
}
