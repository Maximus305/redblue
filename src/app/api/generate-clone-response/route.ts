import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { cloneData, question, humanAnswer, topic } = await request.json();

    if (!cloneData || !question || !humanAnswer) {
      return NextResponse.json(
        { error: 'Missing cloneData, question, or humanAnswer' },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      // Return a fallback response if API key is not configured
      return NextResponse.json({
        response: generateFallbackResponse(humanAnswer)
      });
    }

    // Don't log API key in production
    if (process.env.NODE_ENV === 'development') {
      console.log('Using OpenAI API key:', apiKey.substring(0, 10) + '...');
    }

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are creating a clone response for a party game.

Personality Profile: ${cloneData}
Topic: ${topic || 'General'}
Question: ${question}
Human's Real Answer: ${humanAnswer}

Generate a response that sounds like this person would answer, but is NOT identical to their real answer. Make it believable but subtly different. Keep it natural, conversational, and 1-2 sentences max. The clone should be similar enough to fool people, but with slight variations in wording or phrasing.`
          },
          {
            role: 'user',
            content: `Based on the human's answer "${humanAnswer}", generate a clone version that sounds like this person.`
          }
        ],
        temperature: 0.8,
        max_tokens: 100
      })
    });

    if (!openAIResponse.ok) {
      const errorBody = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, openAIResponse.statusText, errorBody);
      return NextResponse.json({
        response: generateFallbackResponse(humanAnswer)
      });
    }

    const data = await openAIResponse.json();
    const aiResponse = data.choices[0]?.message?.content || generateFallbackResponse(humanAnswer);

    return NextResponse.json({ response: aiResponse });

  } catch (error) {
    console.error('Error generating clone response:', error);
    return NextResponse.json({
      response: "I'd have to think about that one... it's a tough question!"
    });
  }
}

// Simple fallback - transform the human's answer slightly
function generateFallbackResponse(humanAnswer: string): string {
  const variations = [
    `I'd say ${humanAnswer.toLowerCase()}`,
    `Probably ${humanAnswer.toLowerCase()}`,
    `I think ${humanAnswer.toLowerCase()}`,
    `Definitely ${humanAnswer.toLowerCase()}`,
    `For sure ${humanAnswer.toLowerCase()}`
  ];

  return variations[Math.floor(Math.random() * variations.length)];
}