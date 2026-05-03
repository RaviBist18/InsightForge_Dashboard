import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const next = url.searchParams.get('next') || '/';

    if (code) {
        const supabase = createRouteHandlerClient({ cookies });
        await supabase.auth.exchangeCodeForSession(code);
    }

    return NextResponse.redirect(new URL(next, req.url));
}