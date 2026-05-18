import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // Get user's Zernio API key
    const { data: zernio } = await supabase
      .from('user_zernio')
      .select('api_key')
      .eq('user_id', userId)
      .single();

    if (!zernio?.api_key) {
      return NextResponse.json({ error: 'No Zernio key found' }, { status: 401 });
    }

    // Call Zernio Analytics API
    const zernioRes = await fetch('https://zernio.com/api/v1/analytics', {
      headers: {
        'Authorization': `Bearer ${zernio.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!zernioRes.ok) {
      const errorText = await zernioRes.text();
      console.error('Zernio analytics error:', errorText);
      return NextResponse.json({ error: 'Zernio API error' }, { status: zernioRes.status });
    }

    const zernioData = await zernioRes.json();

    return NextResponse.json({
      success: true,
      metrics: zernioData,
      message: 'Zernio analytics fetched successfully'
    });
  } catch (err: any) {
    console.error('Zernio analytics route error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch Zernio analytics' }, { status: 500 });
  }
}