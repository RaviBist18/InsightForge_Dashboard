import { notFound } from 'next/navigation';
import { KPIDetailClient } from '@/components/dashboard/KPIDetailClient';
import { getDashboardStats } from '@/lib/data';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const VALID_SLUGS = [
    'total-revenue', 'total-profit', 'profit-margin',
    'total-orders', 'active-users', 'churn-rate',
];

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    return VALID_SLUGS.map(slug => ({ slug }));
}

async function getUserRole(): Promise<'admin' | 'user'> {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 'user';
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        return (profile?.role === 'admin') ? 'admin' : 'user';
    } catch {
        return 'user';
    }
}

export default async function KPIDetailPage({ params }: PageProps) {
    const { slug } = await params;
    if (!VALID_SLUGS.includes(slug)) notFound();

    const [stats, role] = await Promise.all([
        getDashboardStats('30d'),
        getUserRole(),
    ]);

    return (
        <KPIDetailClient
            slug={slug}
            analytics={{}}
            stats={stats}
            role={role}
            persona="balanced"
        />
    );
}