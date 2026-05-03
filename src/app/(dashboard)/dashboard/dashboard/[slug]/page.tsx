import { getAnalyticsByCategory, getDashboardStats } from '@/lib/data';
import { notFound } from 'next/navigation';
import { KPIDetailClient } from '@/components/dashboard/KPIDetailClient';

const VALID_SLUGS = [
    'total-revenue',
    'total-profit',
    'profit-margin',
    'total-orders',
    'active-users',
    'churn-rate',
];

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    return VALID_SLUGS.map(slug => ({ slug }));
}

export default async function KPIDetailPage({ params }: PageProps) {
    const { slug } = await params;

    if (!VALID_SLUGS.includes(slug)) notFound();

    const [analytics, stats] = await Promise.all([
        getAnalyticsByCategory(slug),
        getDashboardStats(),
    ]);

    return <KPIDetailClient slug={slug} analytics={analytics} stats={stats} />;
}