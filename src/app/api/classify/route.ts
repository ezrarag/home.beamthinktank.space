import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VALID_CATEGORIES = [
  'architecture',
  'music', 
  'orchestra',
  'medicine',
  'construction',
  'engineering',
  'support'
];

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Input is required and must be a string' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const prompt = `Classify the following phrase into one of these categories: ${VALID_CATEGORIES.join(', ')}. Respond with just the category name, nothing else.

Phrase: "${input}"`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that classifies phrases into predefined categories. Always respond with exactly one category name from the provided list.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const category = completion.choices[0]?.message?.content?.trim().toLowerCase();

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category returned from AI' },
        { status: 500 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to classify input' },
      { status: 500 }
    );
  }
}
