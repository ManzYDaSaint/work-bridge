import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify pool ownership
    const { data: pool, error: poolError } = await supabase
      .from('employer_talent_pools')
      .select('id, name')
      .eq('id', poolId)
      .eq('employer_id', user.id)
      .single();

    if (poolError || !pool) {
      return NextResponse.json({ error: 'Talent pool not found' }, { status: 404 });
    }

    // Fetch members with seeker details
    const { data: rawMembers, error: membersError } = await supabase
      .from('talent_pool_members')
      .select('id, notes, added_at, seeker_id')
      .eq('pool_id', poolId)
      .order('added_at', { ascending: false });

    if (membersError) {
      console.error('Error fetching pool members:', membersError);
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    const seekerIds = (rawMembers || []).map((m) => m.seeker_id).filter(Boolean);
    let seekersMap: Record<string, any> = {};

    if (seekerIds.length > 0) {
      const { data: seekerList } = await supabase
        .from('job_seekers')
        .select('id, full_name, headline, location, skills, experience, education, avatar_url, seniority_level, has_badge, public_slug')
        .in('id', seekerIds);

      (seekerList || []).forEach((s) => {
        seekersMap[s.id] = s;
      });
    }

    const members = (rawMembers || []).map((m) => ({
      id: m.id,
      notes: m.notes,
      added_at: m.added_at,
      seeker: seekersMap[m.seeker_id] || { id: m.seeker_id, full_name: 'Candidate' },
    }));

    return NextResponse.json({ pool, members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seeker_id, notes } = await req.json();

    if (!seeker_id) {
      return NextResponse.json({ error: 'seeker_id is required' }, { status: 400 });
    }

    // Verify pool ownership & check plan limit
    const { data: pool, error: poolError } = await supabase
      .from('employer_talent_pools')
      .select('id, employer:employers(plan)')
      .eq('id', poolId)
      .eq('employer_id', user.id)
      .single();

    if (poolError || !pool) {
      return NextResponse.json({ error: 'Talent pool not found' }, { status: 404 });
    }

    const plan = (pool.employer as any)?.plan || 'FREE';

    if (plan === 'FREE') {
      const { count } = await supabase
        .from('talent_pool_members')
        .select('*', { count: 'exact', head: true })
        .eq('pool_id', poolId);

      if (count && count >= 5) {
        return NextResponse.json({
          error: 'Free plan is limited to 5 candidates per talent pool. Upgrade to Aganyu Employer Pro for unlimited candidate storage.',
          code: 'PLAN_LIMIT_REACHED'
        }, { status: 403 });
      }
    }

    const { data: member, error: insertError } = await supabase
      .from('talent_pool_members')
      .upsert(
        {
          pool_id: poolId,
          seeker_id,
          notes: notes?.trim() || null,
        },
        { onConflict: 'pool_id,seeker_id' }
      )
      .select()
      .single();

    if (insertError) {
      console.error('Error adding member to pool:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ member }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const { searchParams } = new URL(req.url);
    const seekerId = searchParams.get('seeker_id');

    if (!seekerId) {
      return NextResponse.json({ error: 'seeker_id parameter is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify pool ownership
    const { data: pool, error: poolError } = await supabase
      .from('employer_talent_pools')
      .select('id')
      .eq('id', poolId)
      .eq('employer_id', user.id)
      .single();

    if (poolError || !pool) {
      return NextResponse.json({ error: 'Talent pool not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('talent_pool_members')
      .delete()
      .eq('pool_id', poolId)
      .eq('seeker_id', seekerId);

    if (deleteError) {
      console.error('Error deleting member from pool:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
