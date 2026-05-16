import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('user_id');
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const { data: zernioData, error: keyError } = await supabase
      .from('user_zernio')
      .select('api_key')
      .eq('user_id', userId)
      .single();

    if (keyError || !zernioData?.api_key) {
      return NextResponse.json({ error: 'Zernio API key not found. Please add it via the ⚡ Zernio button.' }, { status: 400 });
    }

    const response = await fetch('https://zernio.com/api/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${zernioData.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zernio accounts error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch accounts from Zernio' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ accounts: data.accounts || data || [] });
  } catch (err: any) {
    console.error('Zernio accounts fetch error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}