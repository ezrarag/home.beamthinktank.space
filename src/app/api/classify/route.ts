import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const VALID_CATEGORIES = [
  'architecture',
  'music', 
  'orchestra',
  'medicine',
  'construction',
  'engineering',
  'support'
];

const CATEGORY_DESCRIPTIONS = {
  architecture: 'Design, building design, architectural planning, urban planning, CAD, drafting',
  music: 'Music education, instruments, performance, composition, music theory',
  orchestra: 'Orchestral music, symphonies, classical music, conducting, orchestral instruments',
  medicine: 'Healthcare, medical training, nursing, pre-med, clinical work, health sciences',
  construction: 'Building, construction work, trades, carpentry, electrical, plumbing, masonry',
  engineering: 'Engineering disciplines, technical design, problem-solving, innovation, technology',
  support: 'Student support, mentoring, tutoring, guidance, community assistance'
};

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Input is required and must be a string' },
        { status: 400 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const categoryDescriptions = Object.entries(CATEGORY_DESCRIPTIONS)
      .map(([category, description]) => `${category}: ${description}`)
      .join('\n');

    const prompt = `Classify the following phrase into the most appropriate category from these options:

${categoryDescriptions}

Respond with just the category name, nothing else. Choose the category that best matches the user's interest or intent.

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
