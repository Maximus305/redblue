import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { cloneData, question, topic } = await request.json();

    if (!cloneData || !question) {
      return NextResponse.json(
        { error: 'Missing cloneData or question' },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      // Return a fallback response if API key is not configured
      return NextResponse.json({
        response: generateFallbackResponse(cloneData, question)
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
            content: `You are playing a party game where you need to impersonate a person based on their personality description. 
            The topic is: ${topic || 'General'}
            
            Personality description: ${cloneData}
            
            Answer questions as if you are this person. Keep responses natural, conversational, and 1-2 sentences max. 
            Don't be too obvious or use exact words from the personality description. 
            Be subtle and authentic to how a real person would answer.`
          },
          {
            role: 'user',
            content: question
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
        response: generateFallbackResponse(cloneData, question)
      });
    }

    const data = await openAIResponse.json();
    const aiResponse = data.choices[0]?.message?.content || generateFallbackResponse(cloneData, question);

    return NextResponse.json({ response: aiResponse });

  } catch (error) {
    console.error('Error generating clone response:', error);
    return NextResponse.json({
      response: "I'd have to think about that one... it's a tough question!"
    });
  }
}

// Enhanced fallback response generator
function generateFallbackResponse(cloneData: string, question: string): string {
  const lowerData = cloneData.toLowerCase();
  const lowerQuestion = question.toLowerCase();
  
  // Base responses by personality type
  const responses = {
    sarcastic: [
      "Oh, what a totally original question...",
      "Well, that's definitely something I haven't heard before.",
      "Let me consult my crystal ball... nope, still unclear.",
      "Wow, really making me think outside the box here.",
    ],
    funny: [
      "That's like asking me to pick my favorite child!",
      "Ha! You really want to open that can of worms?",
      "Oh boy, where do I even start with that one?",
      "That's a question that could start a whole debate!",
    ],
    thoughtful: [
      "That's a really deep question... I'd need to think about it.",
      "Hmm, there are so many layers to consider with that.",
      "You know, that touches on something I've been pondering lately.",
      "That's the kind of question that keeps me up at night.",
    ],
    energetic: [
      "Oh wow! That's such a great question!",
      "I LOVE questions like this! So many possibilities!",
      "Ooh, that's exciting to think about!",
      "Yes! Finally someone asking the good questions!",
    ],
    serious: [
      "That's a very important question to consider.",
      "I think that deserves a thoughtful response.",
      "That's something I take quite seriously.",
      "That requires careful consideration.",
    ]
  };
  
  // Default responses
  const defaultResponses = [
    "That's an interesting question... I'd say it depends.",
    "Hmm, I have mixed feelings about that.",
    "You know, that's actually pretty intriguing.",
    "I'd probably approach it differently than most people.",
  ];
  
  // Determine personality type and select appropriate response
  let selectedResponses = defaultResponses;
  
  if (lowerData.includes('sarcastic') || lowerData.includes('sarcasm')) {
    selectedResponses = responses.sarcastic;
  } else if (lowerData.includes('funny') || lowerData.includes('humor') || lowerData.includes('comedian')) {
    selectedResponses = responses.funny;
  } else if (lowerData.includes('thoughtful') || lowerData.includes('philosophical') || lowerData.includes('deep')) {
    selectedResponses = responses.thoughtful;
  } else if (lowerData.includes('energetic') || lowerData.includes('outgoing') || lowerData.includes('enthusiastic')) {
    selectedResponses = responses.energetic;
  } else if (lowerData.includes('serious') || lowerData.includes('professional') || lowerData.includes('formal')) {
    selectedResponses = responses.serious;
  }
  
  return selectedResponses[Math.floor(Math.random() * selectedResponses.length)];
}