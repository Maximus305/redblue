# OpenAI ChatGPT Integration Setup

## Overview
The Clone Game uses OpenAI's ChatGPT API to generate AI responses that mimic player personalities. If no API key is provided, the game falls back to enhanced personality-aware responses.

## Setting Up OpenAI API Key

1. **Get an OpenAI API Key**:
   - Visit https://platform.openai.com/account/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-proj-...`)

2. **Add to Environment Variables**:
   - Open `.env.local` file
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=sk-proj-your-actual-api-key-here
     ```
   - Restart your development server

3. **Verify Integration**:
   - The game will use ChatGPT for AI responses when a valid key is provided
   - Check console logs for "Using OpenAI API key" message
   - Invalid keys will show 401 Unauthorized errors and fall back to personality responses

## Fallback Behavior
When OpenAI API is unavailable or no key is provided, the game uses enhanced personality-aware responses:

- **Sarcastic**: "Oh, what a totally original question..."
- **Funny**: "That's like asking me to pick my favorite child!"
- **Thoughtful**: "That's a really deep question... I'd need to think about it."
- **Energetic**: "Oh wow! That's such a great question!"
- **Serious**: "That's a very important question to consider."

## API Usage Details
- **Model**: GPT-3.5-turbo
- **Temperature**: 0.8 (creative but consistent)
- **Max Tokens**: 100 (short responses)
- **Response Style**: Natural, conversational, 1-2 sentences
- **Personality Integration**: Uses player's clone description for authentic responses

## Cost Considerations
- GPT-3.5-turbo is very affordable (~$0.002 per 1K tokens)
- Average response costs less than $0.001
- Game is fully functional without OpenAI integration