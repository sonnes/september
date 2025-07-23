import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { persona } = await request.json();

    if (!persona) {
      return NextResponse.json({ error: 'Persona is required' }, { status: 400 });
    }

    // Generate corpus based on persona
    // This is a simple implementation - you can enhance this with AI generation
    const generatedCorpus = generateCorpusFromPersona(persona);

    return NextResponse.json({ corpus: generatedCorpus });
  } catch (error) {
    console.error('Error generating corpus:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateCorpusFromPersona(persona: string): string {
  // Simple corpus generation based on persona
  // This can be enhanced with actual AI generation using OpenAI, Gemini, etc.

  const personaLower = persona.toLowerCase();

  if (personaLower.includes('teacher') || personaLower.includes('educator')) {
    return `Educational Context:
- Teaching methodologies and best practices
- Student engagement strategies
- Assessment and evaluation techniques
- Curriculum development principles
- Classroom management approaches
- Learning theories and cognitive development
- Educational technology integration
- Special education considerations
- Professional development for educators
- Parent-teacher communication strategies`;
  }

  if (personaLower.includes('business') || personaLower.includes('consultant')) {
    return `Business Context:
- Strategic planning and execution
- Market analysis and competitive intelligence
- Financial management and budgeting
- Leadership and team management
- Customer relationship management
- Process optimization and efficiency
- Risk management and compliance
- Innovation and change management
- Stakeholder communication
- Performance measurement and KPIs`;
  }

  if (personaLower.includes('creative') || personaLower.includes('artist')) {
    return `Creative Context:
- Artistic techniques and mediums
- Creative process and inspiration
- Design principles and aesthetics
- Storytelling and narrative structure
- Color theory and composition
- Cultural and historical art movements
- Digital tools and software
- Portfolio development and presentation
- Creative collaboration and feedback
- Artistic business and marketing`;
  }

  // Default corpus for general assistance
  return `General Knowledge Context:
- Communication best practices
- Problem-solving methodologies
- Critical thinking and analysis
- Research and information gathering
- Time management and productivity
- Interpersonal skills and empathy
- Professional development
- Technology and digital literacy
- Cultural awareness and diversity
- Continuous learning and adaptation`;
}
