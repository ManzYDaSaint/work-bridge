import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: evaluations, error: evalError } = await supabase
      .from('application_evaluations')
      .select('*')
      .eq('application_id', applicationId);

    if (evalError) {
      console.error('Error fetching application evaluations:', evalError);
      return NextResponse.json({ error: evalError.message }, { status: 500 });
    }

    return NextResponse.json({ evaluations: evaluations || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { technical_rating, experience_rating, communication_rating, recommendation, notes } = await req.json();

    const tech = Math.min(5, Math.max(1, Number(technical_rating) || 3));
    const exp = Math.min(5, Math.max(1, Number(experience_rating) || 3));
    const comm = Math.min(5, Math.max(1, Number(communication_rating) || 3));
    const overall = Number(((tech + exp + comm) / 3).toFixed(2));

    const { data: evaluation, error: upsertError } = await supabase
      .from('application_evaluations')
      .upsert(
        {
          application_id: applicationId,
          evaluator_id: user.id,
          technical_rating: tech,
          experience_rating: exp,
          communication_rating: comm,
          overall_score: overall,
          recommendation: recommendation || 'YES',
          notes: notes?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'application_id,evaluator_id' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting candidate evaluation:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ evaluation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
