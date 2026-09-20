import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure employer
    const { data: employer, error: employerError } = await supabase
      .from('employers')
      .select('id')
      .eq('id', user.id)
      .single();

    if (employerError || !employer) {
      return NextResponse.json({ error: 'Employer record not found' }, { status: 403 });
    }

    // Fetch pools with member counts
    const { data: pools, error: poolsError } = await supabase
      .from('employer_talent_pools')
      .select(`
        *,
        members:talent_pool_members(count)
      `)
      .eq('employer_id', employer.id)
      .order('created_at', { ascending: false });

    if (poolsError) {
      console.error('Error fetching talent pools:', poolsError);
      return NextResponse.json({ error: poolsError.message }, { status: 500 });
    }

    const formattedPools = pools.map((pool: any) => ({
      ...pool,
      member_count: pool.members?.[0]?.count || 0
    }));

    return NextResponse.json({ pools: formattedPools });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, color_tag } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Pool name is required' }, { status: 400 });
    }

    // Check employer plan and pool creation limits
    const { data: employer } = await supabase
      .from('employers')
      .select('plan')
      .eq('id', user.id)
      .single();

    const plan = employer?.plan || 'FREE';

    if (plan === 'FREE') {
      const { count } = await supabase
        .from('employer_talent_pools')
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', user.id);

      if (count && count >= 1) {
        return NextResponse.json({
          error: 'Free plan is limited to 1 Talent Pool folder. Upgrade to Aganyu Employer Pro for unlimited talent pools.',
          code: 'PLAN_LIMIT_REACHED'
        }, { status: 403 });
      }
    }

    const { data: pool, error: createError } = await supabase
      .from('employer_talent_pools')
      .insert({
        employer_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        color_tag: color_tag || '#3B82F6',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating talent pool:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ pool }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
