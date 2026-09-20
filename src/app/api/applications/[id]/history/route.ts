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

    const { data: history, error: historyError } = await supabase
      .from('application_history')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Error fetching application history:', historyError);
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    return NextResponse.json({ history: history || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
