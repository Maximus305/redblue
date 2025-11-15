import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { persona, traits, question } = await request.json();

    if (!traits || !question) {
      return NextResponse.json(
        { error: 'Missing traits or question' },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      // Return a fallback response if API key is not configured
      return NextResponse.json({
        response: generateFallbackResponse(traits, question)
      });
    }

    // Don't log API key in production
    if (process.env.NODE_ENV === 'development') {
      console.log('Using OpenAI API key:', apiKey.substring(0, 10) + '...');
    }

    // Build persona description
    const personaDescription = traits.join(', ');

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
            content: `You are answering a question in a party game called "AI vs Self".

Your personality traits: ${personaDescription}
${persona?.style ? `Style notes: ${persona.style}` : ''}
${persona?.avoid ? `Avoid: ${persona.avoid}` : ''}

Answer the following question naturally, as if you were this person. Keep it conversational, authentic, and 1-2 sentences max. The answer should sound like a real person talking, not overly polished or robotic. Be specific and genuine.`
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.9,
        max_tokens: 100
      })
    });

    if (!openAIResponse.ok) {
      const errorBody = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, openAIResponse.statusText, errorBody);
      return NextResponse.json({
        response: generateFallbackResponse(traits, question)
      });
    }

    const data = await openAIResponse.json();
    const aiResponse = data.choices[0]?.message?.content || generateFallbackResponse(traits, question);

    return NextResponse.json({ response: aiResponse });

  } catch (error) {
    console.error('Error generating RedBlue response:', error);
    return NextResponse.json({
      response: "That's a tough question... I'd have to think about it!"
    });
  }
}

// Fallback response generator based on traits
function generateFallbackResponse(traits: string[], question: string): string {
  const primaryTrait = traits[0] || 'thoughtful';

  const responses: Record<string, string[]> = {
    'sarcastic': [
      "Oh, what a totally original question...",
      "Well, that's definitely something I haven't heard before.",
      "Let me consult my crystal ball... nope, still unclear."
    ],
    'funny': [
      "Ha! You really want to open that can of worms?",
      "That's like asking me to pick my favorite child!",
      "Oh boy, where do I even start with that one?"
    ],
    'thoughtful': [
      "That's a really deep question... I'd need to think about it.",
      "Hmm, there are so many layers to consider with that.",
      "You know, that touches on something I've been pondering lately."
    ],
    'energetic': [
      "Oh wow! That's such a great question!",
      "I LOVE questions like this! So many possibilities!",
      "Ooh, that's exciting to think about!"
    ],
    'serious': [
      "That's a very important question to consider.",
      "I think that deserves a thoughtful response.",
      "That requires careful consideration."
    ]
  };

  // Find matching response set
  let responseSet = responses['thoughtful']; // default
  for (const [key, value] of Object.entries(responses)) {
    if (traits.some(trait => trait.toLowerCase().includes(key))) {
      responseSet = value;
      break;
    }
  }

  return responseSet[Math.floor(Math.random() * responseSet.length)];
}
