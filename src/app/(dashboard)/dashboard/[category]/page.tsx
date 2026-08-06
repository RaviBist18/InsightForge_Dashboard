"use client";

import React, { useEffect, useState, use } from "react";
import { getAnalyticsByCategory } from "@/lib/data";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const tooltipStyle = {
  backgroundColor: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--text-primary)",
};

const DataTable = React.memo(({ data }: { data: any[] }) => {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleSearch = (e: any) => {
      setSearchQuery(e.detail || "");
    };
    window.addEventListener("globalSearch", handleSearch);
    return () => window.removeEventListener("globalSearch", handleSearch);
  }, []);

  return (
    <div className="overflow-x-auto mt-4 border border-[var(--border)] rounded-xl">
      <table className="w-full text-left text-xs">
        <thead className="bg-[var(--bg-primary)] border-b border-[var(--border)]">
          <tr className="text-[var(--text-secondary)] font-bold uppercase tracking-widest">
            <th className="px-6 py-4">ID</th>
            <th className="px-6 py-4">Name</th>
            <th className="px-6 py-4">Email</th>
            <th className="px-6 py-4">Join Date</th>
            <th className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.map((user) => {
            const searchString =
              `${user.id} ${user.name} ${user.email} ${user.status}`.toLowerCase();
            const isMatch =
              searchQuery === "" || searchString.includes(searchQuery);

            return (
              <tr
                key={user.id}
                className={cn(
                  "hover:bg-[var(--bg-primary)] transition-all",
                  !isMatch && "opacity-30 grayscale",
                )}
              >
                <td className="px-6 py-4 text-[var(--accent)]">{user.id}</td>
                <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">
                  {user.name}
                </td>
                <td className="px-6 py-4 text-[var(--text-secondary)]">
                  {user.email}
                </td>
                <td className="px-6 py-4 text-[var(--text-secondary)]">
                  {user.joinDate}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
                      user.status === "Active"
                        ? "bg-[var(--success-bg)] text-[var(--success)]"
                        : "bg-[var(--border)] text-[var(--text-muted)]",
                    )}
                  >
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
DataTable.displayName = "DataTable";

const DonutChart = React.memo(({ data }: { data: any[] }) => (
  <div className="h-[300px] w-full mt-4 flex items-center justify-center">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          innerRadius={80}
          outerRadius={110}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={{ color: "#fff", fontWeight: "bold" }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
));
DonutChart.displayName = "DonutChart";

const RadialChartComponent = React.memo(({ data }: { data: any }) => (
  <div className="w-full lg:w-1/2 h-[300px]">
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart
        innerRadius="60%"
        outerRadius="100%"
        data={[
          {
            name: "Margin",
            value: data.marginPercentage,
            fill: "var(--accent)",
          },
          { name: "Cost", value: 100 - data.marginPercentage, fill: "#94A3B8" },
        ]}
        startAngle={90}
        endAngle={-270}
      >
        <RadialBar background dataKey="value" cornerRadius={10} />
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={{ color: "var(--text-primary)", fontWeight: "bold" }}
        />
        <Legend />
      </RadialBarChart>
    </ResponsiveContainer>
  </div>
));
RadialChartComponent.displayName = "RadialChartComponent";

const BarChartComponent = React.memo(
  ({ data, primaryColor }: { data: any[]; primaryColor: string }) => (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 10, fontWeight: 600 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 10, fontWeight: 600 }}
            dx={-10}
          />
          <Tooltip
            cursor={{ fill: "var(--bg-primary)" }}
            contentStyle={tooltipStyle}
            itemStyle={{ color: "var(--text-primary)", fontWeight: "bold" }}
          />
          <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ),
);
BarChartComponent.displayName = "BarChartComponent";

const AreaChartComponent = React.memo(
  ({ data, primaryColor }: { data: any[]; primaryColor: string }) => (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 10, fontWeight: 600 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 10, fontWeight: 600 }}
            dx={-10}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            itemStyle={{ color: "var(--text-primary)", fontWeight: "bold" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={primaryColor}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorValue)"
            dot={{ r: 4, fill: primaryColor, strokeWidth: 2 }}
            activeDot={{ r: 8 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  ),
);
AreaChartComponent.displayName = "AreaChartComponent";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const resolvedParams = use(params);
  const { category } = resolvedParams;
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    getAnalyticsByCategory(category).then((res) => {
      if (isMounted) setData(res);
    });
    return () => {
      isMounted = false;
    };
  }, [category]);

  if (!data) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <header className="mb-8 px-2">
          <div className="h-4 bg-[var(--border)] w-48 rounded mb-2"></div>
          <div className="h-8 bg-[var(--border)] w-64 rounded"></div>
        </header>
        <div className="bg-[var(--bg-surface)] p-6 h-[400px] rounded-xl border border-[var(--border)]"></div>
      </div>
    );
  }

  let primaryColor = "#003366"; // Deep Enterprise Navy (accent)
  if (category === "churn-rate") primaryColor = "#C9A66B";
  else if (category === "profit-margin" || category === "total-profit")
    primaryColor = "#4C7A9E";
  else if (category === "active-users") primaryColor = "#94A3B8";
  else if (category === "total-orders") primaryColor = "#4C7A9E";

  const renderContent = () => {
    switch (category) {
      case "active-users":
        return <DataTable data={data.userData} />;

      case "profit-margin":
        return (
          <div className="flex flex-col lg:flex-row gap-8 mt-4">
            <RadialChartComponent data={data} />
            <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-4">
              <h4 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Expense Breakdown
              </h4>
              {data.expenses.map((exp: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border)]"
                >
                  <span className="text-[var(--text-primary)] text-sm font-medium">
                    {exp.category}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--danger)]">
                      ${exp.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {exp.percentage}% of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "total-orders":
        return (
          <BarChartComponent
            data={data.chartData}
            primaryColor={primaryColor}
          />
        );

      case "churn-rate":
        return <DonutChart data={data.pieData} />;

      case "total-revenue":
      case "total-profit":
      default:
        return (
          <AreaChartComponent
            data={data.chartData}
            primaryColor={primaryColor}
          />
        );
    }
  };

  const isPositive = data.growthPercentage >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive
    ? "text-[var(--success)] bg-[var(--success-bg)]"
    : "text-[var(--danger)] bg-[var(--danger-bg)]";

  return (
    <div className="flex flex-col gap-6">
      <header className="mb-8 px-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">
          <Link
            href="/"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            Dashboard
          </Link>
          <span className="opacity-30">/</span>
          <span className="text-[var(--accent)]">{data.title}</span>
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
          {data.title} Analytics
        </h1>
      </header>

      <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border)] group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 flex flex-col items-end">
          <div
            className={cn(
              "flex items-center gap-1 font-bold px-2 py-1 rounded-md",
              trendColor,
            )}
          >
            <TrendIcon size={16} />
            <span>
              {isPositive ? "+" : ""}
              {data.growthPercentage}%
            </span>
          </div>
          <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest mt-2">
            Vs. Last Month
          </span>
        </div>

        <h3 className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mb-2">
          Total{" "}
          {category === "profit-margin"
            ? "Margin"
            : category === "churn-rate"
              ? "Rate"
              : "Value"}
        </h3>
        <p className="text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-8">
          {category === "active-users"
            ? data.totalValue.toLocaleString()
            : category === "profit-margin" || category === "churn-rate"
              ? `${data.totalValue}%`
              : `$${data.totalValue.toLocaleString()}`}
        </p>

        {renderContent()}
      </div>
    </div>
  );
}
