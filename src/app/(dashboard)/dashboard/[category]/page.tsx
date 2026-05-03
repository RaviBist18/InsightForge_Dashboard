"use client";

import React, { useEffect, useState, use } from 'react';
import { getAnalyticsByCategory } from '@/lib/data';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: '#fff'
};

const DataTable = React.memo(({ data }: { data: any[] }) => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleSearch = (e: any) => {
      setSearchQuery(e.detail || '');
    };
    window.addEventListener('globalSearch', handleSearch);
    return () => window.removeEventListener('globalSearch', handleSearch);
  }, []);

  return (
    <div className="overflow-x-auto mt-4 border border-white/5 rounded-xl">
      <table className="w-full text-left text-xs">
        <thead className="bg-white/5 border-b border-white/5">
          <tr className="text-slate-500 font-bold uppercase tracking-widest">
            <th className="px-6 py-4">ID</th>
            <th className="px-6 py-4">Name</th>
            <th className="px-6 py-4">Email</th>
            <th className="px-6 py-4">Join Date</th>
            <th className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((user) => {
            const searchString = `${user.id} ${user.name} ${user.email} ${user.status}`.toLowerCase();
            const isMatch = searchQuery === '' || searchString.includes(searchQuery);

            return (
              <tr key={user.id} className={cn("hover:bg-white/[0.03] transition-all", !isMatch && "opacity-30 grayscale")}>
                <td className="px-6 py-4 font-mono text-sky-400">{user.id}</td>
                <td className="px-6 py-4 font-semibold text-slate-200">{user.name}</td>
                <td className="px-6 py-4 text-slate-400">{user.email}</td>
                <td className="px-6 py-4 text-slate-400">{user.joinDate}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
                    user.status === 'Active' ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
                  )}>
                    {user.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
DataTable.displayName = 'DataTable';

const DonutChart = React.memo(({ data }: { data: any[] }) => (
  <div className="h-[300px] w-full mt-4 flex items-center justify-center">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
));
DonutChart.displayName = 'DonutChart';

const RadialChartComponent = React.memo(({ data }: { data: any }) => (
  <div className="w-full lg:w-1/2 h-[300px]">
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart innerRadius="60%" outerRadius="100%" data={[{ name: 'Margin', value: data.marginPercentage, fill: '#10b981' }, { name: 'Cost', value: 100 - data.marginPercentage, fill: '#f43f5e' }]} startAngle={90} endAngle={-270}>
        <RadialBar background dataKey="value" cornerRadius="{10}" />
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
        <Legend />
      </RadialBarChart>
    </ResponsiveContainer>
  </div>
));
RadialChartComponent.displayName = 'RadialChartComponent';

const BarChartComponent = React.memo(({ data, primaryColor }: { data: any[], primaryColor: string }) => (
  <div className="h-[300px] w-full mt-4">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} dx={-10} />
        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
        <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
));
BarChartComponent.displayName = 'BarChartComponent';

const AreaChartComponent = React.memo(({ data, primaryColor }: { data: any[], primaryColor: string }) => (
  <div className="h-[300px] w-full mt-4">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} dx={-10} />
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
        <Area type="monotone" dataKey="value" stroke={primaryColor} strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" dot={{ r: 4, fill: primaryColor, strokeWidth: 2, className: "animate-pulse" }} activeDot={{ r: 8 }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
));
AreaChartComponent.displayName = 'AreaChartComponent';

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = use(params);
  const { category } = resolvedParams;
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    getAnalyticsByCategory(category).then((res) => {
      if (isMounted) setData(res);
    });
    return () => { isMounted = false; };
  }, [category]);

  if (!data) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <header className="mb-8 px-2">
          <div className="h-4 bg-white/10 w-48 rounded mb-2"></div>
          <div className="h-8 bg-white/10 w-64 rounded"></div>
        </header>
        <div className="glass p-6 h-[400px] rounded-xl border border-white/5"></div>
      </div>
    );
  }

  let primaryColor = "#38bdf8"; // Sky Blue
  if (category === 'churn-rate') primaryColor = "#f43f5e"; // Rose
  else if (category === 'profit-margin' || category === 'total-profit') primaryColor = "#10b981"; // Emerald
  else if (category === 'active-users') primaryColor = "#8b5cf6"; // Violet
  else if (category === 'total-orders') primaryColor = "#f59e0b"; // Amber

  const renderContent = () => {
    switch (category) {
      case 'active-users':
        return <DataTable data={data.userData} />;

      case 'profit-margin':
        return (
          <div className="flex flex-col lg:flex-row gap-8 mt-4">
            <RadialChartComponent data={data} />
            <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Expense Breakdown</h4>
              {data.expenses.map((exp: any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <span className="text-white text-sm font-medium">{exp.category}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-400">${exp.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500">{exp.percentage}% of total</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'total-orders':
        return <BarChartComponent data={data.chartData} primaryColor={primaryColor} />;

      case 'churn-rate':
        return <DonutChart data={data.pieData} />;

      case 'total-revenue':
      case 'total-profit':
      default:
        return <AreaChartComponent data={data.chartData} primaryColor={primaryColor} />;
    }
  };

  const isPositive = data.growthPercentage >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10";

  return (
    <div className="flex flex-col gap-6">
      <header className="mb-8 px-2">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
          <span className="opacity-30">/</span>
          <span className="text-sky-400">{data.title}</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          {data.title} Analytics
        </h1>
      </header>

      <div className="glass p-6 rounded-xl border border-white/5 group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 flex flex-col items-end">
          <div className={cn("flex items-center gap-1 font-bold px-2 py-1 rounded-md", trendColor)}>
            <TrendIcon size={16} />
            <span>{isPositive ? '+' : ''}{data.growthPercentage}%</span>
          </div>
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-2">Vs. Last Month</span>
        </div>

        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
          Total {category === 'profit-margin' ? 'Margin' : category === 'churn-rate' ? 'Rate' : 'Value'}
        </h3>
        <p className="text-4xl font-black text-white tracking-tight mb-8">
          {category === 'active-users' ? data.totalValue.toLocaleString() :
            category === 'profit-margin' || category === 'churn-rate' ? `${data.totalValue}%` :
              `$${data.totalValue.toLocaleString()}`}
        </p>

        {renderContent()}
      </div>
    </div>
  );
}
