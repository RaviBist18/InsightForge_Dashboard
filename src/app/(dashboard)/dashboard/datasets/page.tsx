"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UploadCloud,
  Loader2,
  AlertCircle,
  FileText,
  Trash2,
  Sparkles,
  Copy,
  TriangleAlert,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  ArrowLeft,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

interface ColumnInfo {
  name: string;
  dtype: string;
  null_count: number;
  role: string;
  confidence: string;
}
interface EngineeredFeature {
  name: string;
  source_column: string;
  type: string;
  top_5?: { customer_id: string; order_count: number }[];
}
interface UploadResult {
  id: string;
  filename: string;
  row_count: number | string;
  columns: ColumnInfo[];
  preview: Record<string, unknown>[];
  duplicate_count: number;
  duplicate_rows_preview: Record<string, unknown>[];
  outliers_by_column: Record<
    string,
    {
      count: number;
      lower_bound: number;
      upper_bound: number;
      rows: Record<string, unknown>[];
    }
  >;
  engineered_features: EngineeredFeature[];
}

interface KPIData {
  row_count: number;
  total_revenue?: number;
  avg_order_value?: number;
  max_order_value?: number;
  date_range_start?: string;
  date_range_end?: string;
  unique_customers?: number;
  top_customer?: { customer_id: string; order_count: number };
}
interface RevenuePoint {
  date: string;
  revenue: number;
}
interface CustomerAnalytics {
  available: boolean;
  unique_customers?: number;
  repeat_customers?: number;
  one_time_customers?: number;
  top_by_orders?: { customer_id: string; order_count: number }[];
  top_by_revenue?: { customer_id: string; total_revenue: number }[];
}

interface SalesAnalytics {
  available: boolean;
  reason?: string;
  metric_used?: string;
  summary?: { total_sales?: number; avg_sale?: number };
  by_product?: { product: string; total: number }[];
  by_region?: { region: string; total: number }[];
  sales_series?: { date: string; sales: number }[];
}
interface MarketingAnalytics {
  available: boolean;
  reason?: string;
  summary?: { total_spend?: number; total_revenue?: number; roi?: number };
  spend_series?: { date: string; spend: number }[];
}

interface RevenueForecast {
  available: boolean;
  reason?: string;
  historical?: { date: string; revenue: number }[];
  forecast?: { date: string; predicted_revenue: number }[];
  confidence?: "high" | "medium" | "low";
  r_squared?: number;
  trend?: "growing" | "declining" | "flat";
  daily_change_rate?: number;
}

interface SalesForecast {
  available: boolean;
  reason?: string;
  metric_used?: string;
  historical?: { date: string; sales: number }[];
  forecast?: { date: string; predicted_sales: number }[];
  confidence?: "high" | "medium" | "low";
  r_squared?: number;
  trend?: "growing" | "declining" | "flat";
  daily_change_rate?: number;
}

interface ChurnPrediction {
  available: boolean;
  reason?: string;
  total_customers?: number;
  risk_summary?: { high: number; medium: number; low: number };
  customers?: {
    customer_id: string;
    days_since_last_order: number;
    order_count: number;
    churn_risk: "high" | "medium" | "low";
    total_revenue?: number;
  }[];
}

interface CustomerLifetimeValue {
  available: boolean;
  reason?: string;
  assumptions?: {
    estimated_lifespan_years: number;
    observation_period_days: number;
  };
  segment_summary?: { gold: number; silver: number; bronze: number };
  customers?: {
    customer_id: string;
    clv: number;
    avg_order_value: number;
    order_count: number;
    segment: "Gold" | "Silver" | "Bronze";
  }[];
}

interface InventoryForecast {
  available: boolean;
  reason?: string;
  low_stock_threshold?: number;
  products?: {
    product: string;
    current_inventory: number;
    daily_change_rate: number;
    forecast: { date: string; predicted_inventory: number }[];
    will_run_low: boolean;
    predicted_low_stock_date: string | null;
  }[];
}

interface MarketingRoiPrediction {
  available: boolean;
  reason?: string;
  confidence?: "high" | "medium" | "low";
  r_squared?: number;
  revenue_per_spend_dollar?: number;
  current_avg_spend?: number;
  current_avg_revenue?: number;
  hypothetical_spend?: number;
  predicted_revenue?: number;
  predicted_roi?: number;
  curve?: { spend: number; predicted_revenue: number }[];
}

interface RiskPrediction {
  available: boolean;
  overall_risk_level?: "high" | "medium" | "low";
  risk_count?: { high: number; medium: number };
  risks?: { category: string; severity: "high" | "medium"; message: string }[];
}
interface TrendDetection {
  available: boolean;
  reason?: string;
  trends?: {
    metric: string;
    direction: "growing" | "declining" | "flat";
    daily_change: number;
    confidence: number;
    summary: string;
  }[];
}

interface InventoryAnalytics {
  available: boolean;
  reason?: string;
  low_stock_threshold?: number;
  latest_by_product?: {
    product: string;
    inventory: number;
    low_stock: boolean;
    min_inventory: number;
    had_low_stock_event: boolean;
  }[];
  low_stock_alerts?: {
    product: string;
    inventory: number;
    low_stock: boolean;
  }[];
  historical_dip_alerts?: {
    product: string;
    inventory: number;
    min_inventory: number;
  }[];
}

interface DatasetSummary {
  id: string;
  filename: string;
  row_count: number;
  column_schema: ColumnInfo[];
  created_at: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not signed in — please log in again.");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function DatasetsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [deleteConfirmBulk, setDeleteConfirmBulk] = useState<
    "selected" | "all" | null
  >(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cleaning, setCleaning] = useState(false);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([]);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [customerAnalytics, setCustomerAnalytics] =
    useState<CustomerAnalytics | null>(null);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(
    null,
  );
  const [marketingAnalytics, setMarketingAnalytics] =
    useState<MarketingAnalytics | null>(null);
  const [inventoryAnalytics, setInventoryAnalytics] =
    useState<InventoryAnalytics | null>(null);
  const [revenueForecast, setRevenueForecast] =
    useState<RevenueForecast | null>(null);
  const [salesForecast, setSalesForecast] = useState<SalesForecast | null>(
    null,
  );
  const [churnPrediction, setChurnPrediction] =
    useState<ChurnPrediction | null>(null);
  const [clvData, setClvData] = useState<CustomerLifetimeValue | null>(null);
  const [inventoryForecast, setInventoryForecast] =
    useState<InventoryForecast | null>(null);
  const [marketingRoi, setMarketingRoi] =
    useState<MarketingRoiPrediction | null>(null);
  const [riskPrediction, setRiskPrediction] = useState<RiskPrediction | null>(
    null,
  );
  const [trendDetection, setTrendDetection] = useState<TrendDetection | null>(
    null,
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterOptions, setFilterOptions] = useState<{
    regions: string[];
    products: string[];
  }>({ regions: [], products: [] });
  const [visibleSections, setVisibleSections] = useState<
    Record<string, boolean>
  >({
    revenue: true,
    customer: true,
    sales: true,
    marketing: true,
    inventory: true,
    forecast: true,
    salesForecast: true,
    churn: true,
    clv: true,
    inventoryForecast: true,
    marketingRoi: true,
    risk: true,
    trends: true,
  });

  const [showCustomize, setShowCustomize] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const loadDatasets = useCallback(async () => {
    setDatasetsLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${BACKEND_URL}/datasets`, { headers });
      if (!res.ok) throw new Error("Failed to load datasets");
      const data: DatasetSummary[] = await res.json();
      setDatasets(data);
    } catch {
      setDatasets([]);
    } finally {
      setDatasetsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatasets();
    const saved = localStorage.getItem("insightforge_visible_sections");
    if (saved) {
      try {
        setVisibleSections((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {}
    }
  }, [loadDatasets]);

  const toggleSection = (key: string) => {
    setVisibleSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(
        "insightforge_visible_sections",
        JSON.stringify(next),
      );
      return next;
    });
  };

  useEffect(() => {
    if (viewingId) {
      loadKpis(viewingId);
      loadSalesAnalytics(viewingId);
      loadMarketingAnalytics(viewingId);
      loadInventoryAnalytics(viewingId);
      loadSalesForecast(viewingId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRegion, filterProduct]);
  const handleViewDataset = async (id: string) => {
    setViewingId(id);
    setError(null);
    setFilterRegion("");
    setFilterProduct("");
    loadFilterOptions(id);
    setTimeout(() => {
      document.getElementById("dataset-details")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${BACKEND_URL}/datasets/${id}`, { headers });
      if (!res.ok) throw new Error("Failed to load dataset");
      const data = await res.json();
      if (!data.analysis) {
        throw new Error(
          "This dataset was uploaded before analysis-saving was added — delete it and re-upload to view details.",
        );
      }
      setResult({
        id: data.id,
        filename: data.filename,
        row_count: data.row_count,
        columns: data.analysis.columns,
        preview: data.analysis.preview,
        duplicate_count: data.analysis.duplicate_count,
        duplicate_rows_preview: data.analysis.duplicate_rows_preview,
        outliers_by_column: data.analysis.outliers_by_column,
        engineered_features: data.analysis.engineered_features || [],
      });
      loadKpis(id);
      loadCustomerAnalytics(id);
      loadSalesAnalytics(id);
      loadMarketingAnalytics(id);
      loadInventoryAnalytics(id);
      loadRevenueForecast(id);
      loadSalesForecast(id);
      loadChurnPrediction(id);
      loadClvData(id);
      loadInventoryForecast(id);
      loadMarketingRoi(id);
      loadRiskPrediction(id);
      loadTrendDetection(id);
    } catch (e: any) {
      setError(e.message || "Failed to load dataset");
      setViewingId(null);
    }
  };

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filterRegion) params.set("region", filterRegion);
    if (filterProduct) params.set("product", filterProduct);
    return params.toString();
  }, [filterRegion, filterProduct]);

  const loadFilterOptions = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${BACKEND_URL}/datasets/${id}/filter-options`, {
        headers,
      });
      if (!res.ok) throw new Error("Failed to load filter options");
      setFilterOptions(await res.json());
    } catch {
      setFilterOptions({ regions: [], products: [] });
    }
  }, []);

  const loadRevenueForecast = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(
        `${BACKEND_URL}/datasets/${id}/revenue-forecast`,
        { headers },
      );
      if (!res.ok) throw new Error("Failed to load revenue forecast");
      setRevenueForecast(await res.json());
    } catch {
      setRevenueForecast(null);
    }
  }, []);

  const loadSalesForecast = useCallback(
    async (id: string) => {
      try {
        const headers = await getAuthHeader();
        const qs = buildFilterParams();
        const res = await fetch(
          `${BACKEND_URL}/datasets/${id}/sales-forecast${qs ? `?${qs}` : ""}`,
          { headers },
        );
        if (!res.ok) throw new Error("Failed to load sales forecast");
        setSalesForecast(await res.json());
      } catch {
        setSalesForecast(null);
      }
    },
    [buildFilterParams],
  );

  const loadChurnPrediction = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(
        `${BACKEND_URL}/datasets/${id}/churn-prediction`,
        {
          headers,
        },
      );
      if (!res.ok) throw new Error("Failed to load churn prediction");
      setChurnPrediction(await res.json());
    } catch {
      setChurnPrediction(null);
    }
  }, []);

  const loadClvData = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(
        `${BACKEND_URL}/datasets/${id}/customer-lifetime-value`,
        { headers },
      );
      if (!res.ok) throw new Error("Failed to load CLV");
      setClvData(await res.json());
    } catch {
      setClvData(null);
    }
  }, []);

  const loadInventoryForecast = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(
        `${BACKEND_URL}/datasets/${id}/inventory-forecast`,
        { headers },
      );
      if (!res.ok) throw new Error("Failed to load inventory forecast");
      setInventoryForecast(await res.json());
    } catch {
      setInventoryForecast(null);
    }
  }, []);

  const loadMarketingRoi = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(
        `${BACKEND_URL}/datasets/${id}/marketing-roi-prediction`,
        { headers },
      );
      if (!res.ok) throw new Error("Failed to load marketing ROI prediction");
      setMarketingRoi(await res.json());
    } catch {
      setMarketingRoi(null);
    }
  }, []);

  const loadRiskPrediction = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${BACKEND_URL}/datasets/${id}/risk-prediction`, {
        headers,
      });
      if (!res.ok) throw new Error("Failed to load risk prediction");
      setRiskPrediction(await res.json());
    } catch {
      setRiskPrediction(null);
    }
  }, []);

  const loadTrendDetection = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${BACKEND_URL}/datasets/${id}/trend-detection`, {
        headers,
      });
      if (!res.ok) throw new Error("Failed to load trend detection");
      setTrendDetection(await res.json());
    } catch {
      setTrendDetection(null);
    }
  }, []);

  const loadKpis = useCallback(
    async (id: string) => {
      setKpisLoading(true);
      try {
        const headers = await getAuthHeader();
        const qs = buildFilterParams();
        const res = await fetch(
          `${BACKEND_URL}/datasets/${id}/kpis${qs ? `?${qs}` : ""}`,
          { headers },
        );
        if (!res.ok) throw new Error("Failed to load KPIs");
        const data = await res.json();
        setKpis(data.kpis);
        setRevenueSeries(data.revenue_series || []);
      } catch {
        setKpis(null);
        setRevenueSeries([]);
      } finally {
        setKpisLoading(false);
      }
    },
    [buildFilterParams],
  );

  const loadCustomerAnalytics = useCallback(async (id: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(
        `${BACKEND_URL}/datasets/${id}/customer-analytics`,
        { headers },
      );
      if (!res.ok) throw new Error("Failed to load customer analytics");
      const data = await res.json();
      setCustomerAnalytics(data);
    } catch {
      setCustomerAnalytics(null);
    }
  }, []);

  const loadSalesAnalytics = useCallback(
    async (id: string) => {
      try {
        const headers = await getAuthHeader();
        const qs = buildFilterParams();
        const res = await fetch(
          `${BACKEND_URL}/datasets/${id}/sales-analytics${qs ? `?${qs}` : ""}`,
          { headers },
        );
        if (!res.ok) throw new Error("Failed to load sales analytics");
        setSalesAnalytics(await res.json());
      } catch {
        setSalesAnalytics(null);
      }
    },
    [buildFilterParams],
  );

  const loadMarketingAnalytics = useCallback(
    async (id: string) => {
      try {
        const headers = await getAuthHeader();
        const qs = buildFilterParams();
        const res = await fetch(
          `${BACKEND_URL}/datasets/${id}/marketing-analytics${qs ? `?${qs}` : ""}`,
          { headers },
        );
        if (!res.ok) throw new Error("Failed to load marketing analytics");
        setMarketingAnalytics(await res.json());
      } catch {
        setMarketingAnalytics(null);
      }
    },
    [buildFilterParams],
  );

  const loadInventoryAnalytics = useCallback(
    async (id: string) => {
      try {
        const headers = await getAuthHeader();
        const qs = buildFilterParams();
        const res = await fetch(
          `${BACKEND_URL}/datasets/${id}/inventory-analytics${qs ? `?${qs}` : ""}`,
          { headers },
        );
        if (!res.ok) throw new Error("Failed to load inventory analytics");
        setInventoryAnalytics(await res.json());
      } catch {
        setInventoryAnalytics(null);
      }
    },
    [buildFilterParams],
  );

  const handleDeleteDataset = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    const id = deleteConfirmId;
    if (!id) return;
    setDeleteConfirmId(null);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${BACKEND_URL}/datasets/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to delete dataset");
      if (viewingId === id) {
        setResult(null);
        setViewingId(null);
      }
      loadDatasets();
    } catch (e: any) {
      setError(e.message || "Failed to delete dataset");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClean = async (actions: string[]) => {
    if (!result) return;
    setCleaning(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${BACKEND_URL}/datasets/${result.id}/clean`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(actions),
      });
      if (!res.ok) throw new Error("Failed to clean dataset");
      const data: UploadResult = await res.json();
      setResult(data);
      loadDatasets();
    } catch (e: any) {
      setError(e.message || "Failed to clean dataset");
    } finally {
      setCleaning(false);
    }
  };

  const confirmBulkDelete = async () => {
    const idsToDelete =
      deleteConfirmBulk === "all"
        ? datasets.map((d) => d.id)
        : Array.from(selectedIds);
    setDeleteConfirmBulk(null);

    try {
      const headers = await getAuthHeader();
      await Promise.all(
        idsToDelete.map((id) =>
          fetch(`${BACKEND_URL}/datasets/${id}`, {
            method: "DELETE",
            headers,
          }),
        ),
      );
      if (viewingId && idsToDelete.includes(viewingId)) {
        setResult(null);
        setViewingId(null);
      }
      setSelectedIds(new Set());
      loadDatasets();
    } catch (e: any) {
      setError(e.message || "Failed to delete datasets");
    }
  };

  const filteredDatasets = datasets.filter((d) =>
    d.filename.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredDatasets.length / PAGE_SIZE),
  );
  const paginatedDatasets = filteredDatasets.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const filteredRevenueSeries = revenueSeries.filter((p) => {
    if (dateFrom && p.date < dateFrom) return false;
    if (dateTo && p.date > dateTo) return false;
    return true;
  });

  const handleExportCsv = () => {
    if (!result) return;
    const headers = result.columns.map((c) => c.name);
    const rows = result.preview.map((row) =>
      headers
        .map((h) =>
          row[h] === null || row[h] === undefined ? "" : String(row[h]),
        )
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.filename.replace(/\.[^.]+$/, "")}_preview.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const headers = await getAuthHeader();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data: UploadResult = await res.json();
      setResult(data);
      setViewingId(null);
      loadDatasets();
      loadKpis(data.id);
      loadCustomerAnalytics(data.id);
      loadSalesAnalytics(data.id);
      loadMarketingAnalytics(data.id);
      loadInventoryAnalytics(data.id);
      loadRevenueForecast(data.id);
      loadSalesForecast(data.id);
      loadChurnPrediction(data.id);
      loadClvData(data.id);
      loadInventoryForecast(data.id);
      loadMarketingRoi(data.id);
      loadRiskPrediction(data.id);
      loadTrendDetection(data.id);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1
        className="text-xl font-semibold mb-1 tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Datasets
      </h1>
      <p
        className="text-[13px] mb-6"
        style={{ color: "var(--text-secondary)" }}
      >
        Upload a CSV or Excel file to preview and analyze your data.
      </p>

      {/* Upload bar */}
      <div
        className="flex items-center gap-3 mb-8 p-4 rounded-2xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <label
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <UploadCloud size={14} />
          {file ? file.name : "Choose file"}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
        <button
          onClick={() => {
            if (!file || loading) return;
            handleUpload();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0"
          style={{ background: "var(--accent)" }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-[13px]"
          style={{
            background: "var(--danger-bg, rgba(220,38,38,0.08))",
            color: "var(--danger)",
            border: "1px solid var(--danger)",
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Saved datasets list */}
      {!viewingId && (
        <div className="mb-10">
          {datasets.length > 5 && (
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 pr-9 rounded-xl text-[13px]"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors hover:bg-gray-100"
                  style={{ color: "var(--text-muted)" }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "#64748b" }}
            >
              Saved Datasets
              {datasets.length > 0 && (
                <span
                  className="ml-2 font-normal normal-case tracking-normal"
                  style={{ color: "#64748b" }}
                >
                  ({datasets.length})
                </span>
              )}
            </p>
            {datasets.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setDeleteConfirmBulk("selected")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                    style={{
                      color: "var(--danger, #dc2626)",
                      background: "var(--danger-bg, rgba(220,38,38,0.08))",
                    }}
                  >
                    <Trash2 size={12} />
                    Delete Selected ({selectedIds.size})
                  </button>
                )}
                <button
                  onClick={() => setDeleteConfirmBulk("all")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:brightness-95"
                  style={{
                    color: "var(--danger, #dc2626)",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Trash2 size={12} />
                  Delete All
                </button>
              </div>
            )}
          </div>

          {datasetsLoading ? (
            <div
              className="flex items-center gap-2 px-4 py-6 rounded-2xl text-[13px]"
              style={{
                color: "var(--text-muted)",
                border: "1px dashed var(--border)",
              }}
            >
              <Loader2 size={14} className="animate-spin" />
              Loading datasets...
            </div>
          ) : datasets.length === 0 ? (
            <div
              className="px-4 py-6 rounded-2xl text-[13px] text-center"
              style={{
                color: "var(--text-muted)",
                border: "1px dashed var(--border)",
              }}
            >
              No datasets saved yet — upload one above to get started.
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-y-auto"
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                maxHeight: "420px",
              }}
            >
              {paginatedDatasets.map((d, i) => (
                <div
                  key={d.id}
                  onClick={() => handleViewDataset(d.id)}
                  className="group flex items-center gap-3 px-4 py-3 text-[13px] cursor-pointer transition-all duration-150 hover:shadow-sm relative z-0 hover:z-10"
                  style={{
                    borderTop: i > 0 ? "1px solid var(--border)" : "none",
                    background:
                      viewingId === d.id ? "var(--bg-primary)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(d.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(d.id)}
                    className="cursor-pointer"
                  />
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors group-hover:bg-blue-50"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <FileText size={14} style={{ color: "#2563eb" }} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {d.filename}
                    </div>
                    <div
                      className="text-[12px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {d.row_count.toLocaleString()} rows &middot;{" "}
                      {new Date(d.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDataset(d.id);
                    }}
                    className="ml-auto p-2 rounded-lg transition-colors hover:bg-red-50 shrink-0"
                    style={{ color: "var(--danger, #dc2626)" }}
                    title="Delete dataset"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {filteredDatasets.length > PAGE_SIZE && (
            <div
              className="flex items-center justify-between mt-3 text-[12px]"
              style={{ color: "var(--text-muted)" }}
            >
              <span>
                Page {page} of {totalPages} · {filteredDatasets.length} datasets
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded-lg disabled:opacity-40"
                  style={{ border: "1px solid var(--border)" }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded-lg disabled:opacity-40"
                  style={{ border: "1px solid var(--border)" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div id="dataset-details">
          <button
            onClick={() => {
              setResult(null);
              setViewingId(null);
            }}
            className="group flex items-center gap-1.5 mb-4 pl-2 pr-3 py-1.5 -ml-2 rounded-full text-[12px] font-medium transition-all duration-150"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-surface)";
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <ArrowLeft
              size={14}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            All datasets
          </button>

          <div
            className="flex items-center gap-3 pb-5 mb-6"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div
              className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <FileText size={18} style={{ color: "#2563eb" }} />
            </div>
            <div className="min-w-0">
              <h2
                className="text-[19px] font-semibold tracking-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {result.filename}
              </h2>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                {Number(result.row_count).toLocaleString()} rows analyzed
              </p>
            </div>
          </div>

          {visibleSections.risk &&
            riskPrediction?.available &&
            riskPrediction.risks &&
            riskPrediction.risks.length > 0 && (
              <div className="mb-6">
                <SectionHeader
                  label={`Risk Overview · ${riskPrediction.overall_risk_level} overall risk`}
                  icon={<AlertCircle size={12} />}
                  color={
                    riskPrediction.overall_risk_level === "high"
                      ? "#dc2626"
                      : riskPrediction.overall_risk_level === "medium"
                        ? "#d97706"
                        : "#16a34a"
                  }
                />
                <div className="space-y-2">
                  {riskPrediction.risks.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 px-4 py-3 rounded-xl text-[13px]"
                      style={{
                        background:
                          r.severity === "high" ? "#fef2f2" : "#fffbeb",
                        color: r.severity === "high" ? "#dc2626" : "#d97706",
                        border: `1px solid ${r.severity === "high" ? "#dc2626" : "#d97706"}`,
                      }}
                    >
                      <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold">{r.category}: </span>
                        {r.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {visibleSections.trends &&
            trendDetection?.available &&
            trendDetection.trends &&
            trendDetection.trends.length > 0 && (
              <div className="mb-6">
                <SectionHeader
                  label="Trend Detection"
                  icon={<TrendingUp size={12} />}
                  color="#0891b2"
                />
                <div className="space-y-2">
                  {trendDetection.trends.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px]"
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderLeft: `3px solid ${
                          t.direction === "growing"
                            ? "#16a34a"
                            : t.direction === "declining"
                              ? "#dc2626"
                              : "#94a3b8"
                        }`,
                      }}
                    >
                      <span style={{ color: "var(--text-primary)" }}>
                        {t.summary}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {(filterOptions.regions.length > 0 ||
            filterOptions.products.length > 0) && (
            <div
              className="flex flex-wrap items-center gap-2 mb-6 px-4 py-3 rounded-2xl"
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
              }}
            >
              <span
                className="text-[11px] font-semibold uppercase tracking-widest mr-1"
                style={{ color: "#64748b" }}
              >
                Filters
              </span>
              {filterOptions.regions.length > 0 && (
                <select
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  className="text-[13px] px-3 py-1.5 rounded-lg"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">All Regions</option>
                  {filterOptions.regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
              {filterOptions.products.length > 0 && (
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="text-[13px] px-3 py-1.5 rounded-lg"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">All Products</option>
                  {filterOptions.products.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
              {(filterRegion || filterProduct) && (
                <button
                  onClick={() => {
                    setFilterRegion("");
                    setFilterProduct("");
                  }}
                  className="flex items-center gap-1 text-[12px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={12} />
                  Clear
                </button>
              )}
            </div>
          )}

          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowCustomize((s) => !s)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#2563eb",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#dbeafe";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#eff6ff";
              }}
            >
              {showCustomize ? "Done" : "Customize Dashboard"}
            </button>
          </div>

          {showCustomize && (
            <div
              className="flex flex-wrap gap-2 mb-6 px-4 py-3 rounded-2xl"
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
              }}
            >
              {[
                { key: "revenue", label: "Revenue" },
                { key: "forecast", label: "Revenue Forecast" },
                { key: "salesForecast", label: "Sales Forecast" },
                { key: "churn", label: "Churn Prediction" },
                { key: "clv", label: "Customer Lifetime Value" },
                { key: "inventoryForecast", label: "Inventory Forecast" },
                { key: "marketingRoi", label: "Marketing ROI Prediction" },
                { key: "risk", label: "Risk Prediction" },
                { key: "trends", label: "Trend Detection" },
                { key: "customer", label: "Customer Analytics" },
                { key: "sales", label: "Sales Analytics" },
                { key: "marketing", label: "Marketing Analytics" },
                { key: "inventory", label: "Inventory Analytics" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => toggleSection(s.key)}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: visibleSections[s.key]
                      ? "#eff6ff"
                      : "var(--bg-primary)",
                    border: `1px solid ${visibleSections[s.key] ? "#bfdbfe" : "var(--border)"}`,
                    color: visibleSections[s.key]
                      ? "#2563eb"
                      : "var(--text-muted)",
                  }}
                >
                  {visibleSections[s.key] ? "✓ " : ""}
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* KPI Cards */}
          {kpisLoading ? (
            <div
              className="flex items-center gap-2 text-[13px] mb-6"
              style={{ color: "#64748b" }}
            >
              <Loader2 size={14} className="animate-spin" />
              Loading KPIs...
            </div>
          ) : kpis ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {kpis.total_revenue !== undefined && (
                  <KpiCard
                    icon={<DollarSign size={14} />}
                    label="Total Revenue"
                    value={kpis.total_revenue.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                    color="#16a34a"
                  />
                )}
                {kpis.avg_order_value !== undefined && (
                  <KpiCard
                    icon={<TrendingUp size={14} />}
                    label="Avg Order Value"
                    value={kpis.avg_order_value.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                    color="#2563eb"
                  />
                )}
                {kpis.unique_customers !== undefined && (
                  <KpiCard
                    icon={<Users size={14} />}
                    label="Unique Customers"
                    value={kpis.unique_customers.toString()}
                    color="#9333ea"
                  />
                )}
                {kpis.date_range_start && kpis.date_range_end && (
                  <KpiCard
                    icon={<Calendar size={14} />}
                    label="Date Range"
                    value={`${kpis.date_range_start} → ${kpis.date_range_end}`}
                    color="#0891b2"
                    small
                  />
                )}
              </div>

              {visibleSections.revenue && revenueSeries.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <SectionHeader
                      label="Revenue Over Time"
                      icon={<TrendingUp size={12} />}
                      color="#16a34a"
                      noMargin
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="text-[12px] px-2 py-1 rounded-lg"
                        style={{
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                        }}
                      />
                      <span
                        className="text-[12px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        to
                      </span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="text-[12px] px-2 py-1 rounded-lg"
                        style={{
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                        }}
                      />
                      <div
                        className="flex rounded-lg overflow-hidden"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        <button
                          onClick={() => setChartType("line")}
                          className="px-2.5 py-1 text-[12px] font-medium transition-colors"
                          style={{
                            background:
                              chartType === "line"
                                ? "#16a34a"
                                : "var(--bg-surface)",
                            color:
                              chartType === "line"
                                ? "white"
                                : "var(--text-secondary)",
                          }}
                        >
                          Line
                        </button>
                        <button
                          onClick={() => setChartType("bar")}
                          className="px-2.5 py-1 text-[12px] font-medium transition-colors"
                          style={{
                            background:
                              chartType === "bar"
                                ? "#16a34a"
                                : "var(--bg-surface)",
                            color:
                              chartType === "bar"
                                ? "white"
                                : "var(--text-secondary)",
                          }}
                        >
                          Bar
                        </button>
                      </div>
                    </div>
                  </div>
                  <div
                    className="rounded-2xl p-4"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <ResponsiveContainer width="100%" height={220}>
                      {chartType === "line" ? (
                        <LineChart data={filteredRevenueSeries}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border)"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            stroke="#94a3b8"
                          />
                          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <Tooltip
                            contentStyle={{
                              fontSize: 12,
                              borderRadius: 8,
                              border: "1px solid var(--border)",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#16a34a"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      ) : (
                        <BarChart data={filteredRevenueSeries}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border)"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            stroke="#94a3b8"
                          />
                          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <Tooltip
                            contentStyle={{
                              fontSize: 12,
                              borderRadius: 8,
                              border: "1px solid var(--border)",
                            }}
                          />
                          <Bar
                            dataKey="revenue"
                            fill="#16a34a"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* Revenue Forecast */}
          {visibleSections.forecast && revenueForecast?.available && (
            <div className="mb-6">
              <SectionHeader
                label={`Revenue Forecast · ${revenueForecast.trend} trend`}
                icon={<TrendingUp size={12} />}
                color="#7c3aed"
              />
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                  style={{
                    background:
                      revenueForecast.confidence === "high"
                        ? "#f0fdf4"
                        : revenueForecast.confidence === "medium"
                          ? "#fffbeb"
                          : "#fef2f2",
                    color:
                      revenueForecast.confidence === "high"
                        ? "#16a34a"
                        : revenueForecast.confidence === "medium"
                          ? "#d97706"
                          : "#dc2626",
                  }}
                >
                  {revenueForecast.confidence} confidence
                </span>
                <span
                  className="text-[12px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  R² = {revenueForecast.r_squared}
                </span>
              </div>
              <div
                className="rounded-2xl p-4"
                style={{ border: "1px solid var(--border)" }}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={[
                      ...(revenueForecast.historical || []).map((h) => ({
                        date: h.date,
                        actual: h.revenue,
                        predicted: null,
                      })),
                      ...(revenueForecast.forecast || []).map((f) => ({
                        date: f.date,
                        actual: null,
                        predicted: f.predicted_revenue,
                      })),
                    ]}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      stroke="#94a3b8"
                    />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                      name="Actual"
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      connectNulls={false}
                      name="Forecast"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Customer Analytics */}
          {visibleSections.customer && customerAnalytics?.available && (
            <div className="mb-6">
              <SectionHeader
                label="Customer Analytics"
                icon={<Users size={12} />}
                color="#9333ea"
              />
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#9333ea" }}
                  >
                    Repeat Customers
                  </div>
                  <div
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {customerAnalytics.repeat_customers} /{" "}
                    {customerAnalytics.unique_customers}
                  </div>
                </div>
                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#9333ea" }}
                  >
                    One-Time Customers
                  </div>
                  <div
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {customerAnalytics.one_time_customers}
                  </div>
                </div>
              </div>
              {customerAnalytics.top_by_revenue &&
                customerAnalytics.top_by_revenue.length > 0 && (
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      border: "1px solid var(--border)",
                      borderLeft: "3px solid #9333ea",
                    }}
                  >
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr style={{ background: "var(--bg-primary)" }}>
                          <Th>Customer</Th>
                          <Th>Total Revenue</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerAnalytics.top_by_revenue.map((c, i) => (
                          <tr
                            key={c.customer_id}
                            style={{
                              borderTop:
                                i > 0 ? "1px solid var(--border)" : "none",
                            }}
                          >
                            <Td>{c.customer_id}</Td>
                            <Td>{c.total_revenue.toLocaleString()}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {/* Churn Prediction */}
          {visibleSections.churn && churnPrediction?.available && (
            <div className="mb-6">
              <SectionHeader
                label="Churn Prediction"
                icon={<AlertCircle size={12} />}
                color="#dc2626"
              />
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "#fef2f2",
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#dc2626" }}
                  >
                    High Risk
                  </div>
                  <div
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {churnPrediction.risk_summary?.high}
                  </div>
                </div>
                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "#fffbeb",
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#d97706" }}
                  >
                    Medium Risk
                  </div>
                  <div
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {churnPrediction.risk_summary?.medium}
                  </div>
                </div>
                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "#f0fdf4",
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#16a34a" }}
                  >
                    Low Risk
                  </div>
                  <div
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {churnPrediction.risk_summary?.low}
                  </div>
                </div>
              </div>
              {churnPrediction.customers &&
                churnPrediction.customers.length > 0 && (
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      border: "1px solid var(--border)",
                      borderLeft: "3px solid #dc2626",
                    }}
                  >
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr style={{ background: "var(--bg-primary)" }}>
                          <Th>Customer</Th>
                          <Th>Days Since Last Order</Th>
                          <Th>Orders</Th>
                          <Th>Risk</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {churnPrediction.customers.map((c, i) => (
                          <tr
                            key={c.customer_id}
                            style={{
                              borderTop:
                                i > 0 ? "1px solid var(--border)" : "none",
                            }}
                          >
                            <Td>{c.customer_id}</Td>
                            <Td>{c.days_since_last_order}</Td>
                            <Td>{c.order_count}</Td>
                            <td className="px-3 py-2.5">
                              <span
                                className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                style={{
                                  background:
                                    c.churn_risk === "high"
                                      ? "#fef2f2"
                                      : c.churn_risk === "medium"
                                        ? "#fffbeb"
                                        : "#f0fdf4",
                                  color:
                                    c.churn_risk === "high"
                                      ? "#dc2626"
                                      : c.churn_risk === "medium"
                                        ? "#d97706"
                                        : "#16a34a",
                                }}
                              >
                                {c.churn_risk}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {/* Customer Lifetime Value */}
          {visibleSections.clv && clvData?.available && (
            <div className="mb-6">
              <SectionHeader
                label="Customer Lifetime Value"
                icon={<DollarSign size={12} />}
                color="#ca8a04"
              />
              <p
                className="text-[11px] mb-3"
                style={{ color: "var(--text-muted)" }}
              >
                Estimated over {clvData.assumptions?.estimated_lifespan_years}{" "}
                years, based on {clvData.assumptions?.observation_period_days}{" "}
                days of order history
              </p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "#fefce8",
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#ca8a04" }}
                  >
                    Gold
                  </div>
                  <div
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {clvData.segment_summary?.gold}
                  </div>
                </div>
                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#64748b" }}
                  >
                    Silver
                  </div>
                  <div
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {clvData.segment_summary?.silver}
                  </div>
                </div>
                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "#fff7ed",
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#ea580c" }}
                  >
                    Bronze
                  </div>
                  <div
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {clvData.segment_summary?.bronze}
                  </div>
                </div>
              </div>
              {clvData.customers && clvData.customers.length > 0 && (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    border: "1px solid var(--border)",
                    borderLeft: "3px solid #ca8a04",
                  }}
                >
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr style={{ background: "var(--bg-primary)" }}>
                        <Th>Customer</Th>
                        <Th>Estimated CLV</Th>
                        <Th>Avg Order Value</Th>
                        <Th>Orders</Th>
                        <Th>Segment</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {clvData.customers.map((c, i) => (
                        <tr
                          key={c.customer_id}
                          style={{
                            borderTop:
                              i > 0 ? "1px solid var(--border)" : "none",
                          }}
                        >
                          <Td>{c.customer_id}</Td>
                          <Td>{c.clv.toLocaleString()}</Td>
                          <Td>{c.avg_order_value.toLocaleString()}</Td>
                          <Td>{c.order_count}</Td>
                          <td className="px-3 py-2.5">
                            <span
                              className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                              style={{
                                background:
                                  c.segment === "Gold"
                                    ? "#fefce8"
                                    : c.segment === "Silver"
                                      ? "#f8fafc"
                                      : "#fff7ed",
                                color:
                                  c.segment === "Gold"
                                    ? "#ca8a04"
                                    : c.segment === "Silver"
                                      ? "#64748b"
                                      : "#ea580c",
                              }}
                            >
                              {c.segment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sales Analytics */}
          {visibleSections.sales && salesAnalytics?.available && (
            <div className="mb-6">
              <SectionHeader
                label="Sales Analytics"
                icon={<TrendingUp size={12} />}
                color="#059669"
              />
              <div className="grid grid-cols-2 gap-3 mb-3">
                {salesAnalytics.summary?.total_sales !== undefined && (
                  <KpiCard
                    icon={<TrendingUp size={14} />}
                    label={`Total ${salesAnalytics.metric_used || "Sales"}`}
                    value={salesAnalytics.summary.total_sales.toLocaleString()}
                    color="#059669"
                  />
                )}
                {salesAnalytics.summary?.avg_sale !== undefined && (
                  <KpiCard
                    icon={<TrendingUp size={14} />}
                    label="Avg Sale"
                    value={salesAnalytics.summary.avg_sale.toLocaleString()}
                    color="#059669"
                  />
                )}
              </div>
              {salesAnalytics.by_product &&
                salesAnalytics.by_product.length > 0 && (
                  <div
                    className="rounded-2xl overflow-hidden mb-3"
                    style={{
                      border: "1px solid var(--border)",
                      borderLeft: "3px solid #059669",
                    }}
                  >
                    <table
                      className="w-full text-[13px]"
                      style={{ tableLayout: "fixed" }}
                    >
                      <thead>
                        <tr style={{ background: "var(--bg-primary)" }}>
                          <Th>Product</Th>
                          <Th>Total</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesAnalytics.by_product.map((p, i) => (
                          <tr
                            key={p.product}
                            style={{
                              borderTop:
                                i > 0 ? "1px solid var(--border)" : "none",
                            }}
                          >
                            <Td>{p.product}</Td>
                            <Td>{p.total.toLocaleString()}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {salesAnalytics.by_region &&
                salesAnalytics.by_region.length > 0 && (
                  <div
                    className="rounded-2xl overflow-hidden mb-3"
                    style={{
                      border: "1px solid var(--border)",
                      borderLeft: "3px solid #059669",
                    }}
                  >
                    <table
                      className="w-full text-[13px]"
                      style={{ tableLayout: "fixed" }}
                    >
                      <thead>
                        <tr style={{ background: "var(--bg-primary)" }}>
                          <Th>Region</Th>
                          <Th>Total</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesAnalytics.by_region.map((r, i) => (
                          <tr
                            key={r.region}
                            style={{
                              borderTop:
                                i > 0 ? "1px solid var(--border)" : "none",
                            }}
                          >
                            <Td>{r.region}</Td>
                            <Td>{r.total.toLocaleString()}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {salesAnalytics.sales_series &&
                salesAnalytics.sales_series.length > 0 && (
                  <div
                    className="rounded-2xl p-4"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={salesAnalytics.sales_series}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          stroke="#94a3b8"
                        />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            fontSize: 12,
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          stroke="#059669"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </div>
          )}

          {/* Sales Forecast */}
          {visibleSections.salesForecast && salesForecast?.available && (
            <div className="mb-6">
              <SectionHeader
                label={`Sales Forecast · ${salesForecast.trend} trend`}
                icon={<TrendingUp size={12} />}
                color="#7c3aed"
              />
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                  style={{
                    background:
                      salesForecast.confidence === "high"
                        ? "#f0fdf4"
                        : salesForecast.confidence === "medium"
                          ? "#fffbeb"
                          : "#fef2f2",
                    color:
                      salesForecast.confidence === "high"
                        ? "#16a34a"
                        : salesForecast.confidence === "medium"
                          ? "#d97706"
                          : "#dc2626",
                  }}
                >
                  {salesForecast.confidence} confidence
                </span>
                <span
                  className="text-[12px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  R² = {salesForecast.r_squared}
                </span>
              </div>
              <div
                className="rounded-2xl p-4"
                style={{ border: "1px solid var(--border)" }}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={[
                      ...(salesForecast.historical || []).map((h) => ({
                        date: h.date,
                        actual: h.sales,
                        predicted: null,
                      })),
                      ...(salesForecast.forecast || []).map((f) => ({
                        date: f.date,
                        actual: null,
                        predicted: f.predicted_sales,
                      })),
                    ]}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      stroke="#94a3b8"
                    />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                      name="Actual"
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      connectNulls={false}
                      name="Forecast"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Marketing Analytics */}
          {visibleSections.marketing && marketingAnalytics?.available && (
            <div className="mb-6">
              <SectionHeader
                label="Marketing Analytics"
                icon={<TrendingUp size={12} />}
                color="#e11d48"
              />
              <div className="grid grid-cols-3 gap-3 mb-3">
                {marketingAnalytics.summary?.total_spend !== undefined && (
                  <KpiCard
                    icon={<DollarSign size={14} />}
                    label="Total Spend"
                    value={marketingAnalytics.summary.total_spend.toLocaleString()}
                    color="#e11d48"
                  />
                )}
                {marketingAnalytics.summary?.total_revenue !== undefined && (
                  <KpiCard
                    icon={<DollarSign size={14} />}
                    label="Total Revenue"
                    value={marketingAnalytics.summary.total_revenue.toLocaleString()}
                    color="#16a34a"
                  />
                )}
                {marketingAnalytics.summary?.roi !== undefined &&
                  marketingAnalytics.summary.roi !== null && (
                    <KpiCard
                      icon={<TrendingUp size={14} />}
                      label="ROI"
                      value={`${marketingAnalytics.summary.roi}x`}
                      color="#2563eb"
                    />
                  )}
              </div>
              {marketingAnalytics.spend_series &&
                marketingAnalytics.spend_series.length > 0 && (
                  <div
                    className="rounded-2xl p-4"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={marketingAnalytics.spend_series}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          stroke="#94a3b8"
                        />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            fontSize: 12,
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                          }}
                        />
                        <Bar
                          dataKey="spend"
                          fill="#e11d48"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </div>
          )}

          {/* Marketing ROI Prediction */}
          {visibleSections.marketingRoi && marketingRoi?.available && (
            <div className="mb-6">
              <SectionHeader
                label="Marketing ROI Prediction"
                icon={<TrendingUp size={12} />}
                color="#2563eb"
              />
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                  style={{
                    background:
                      marketingRoi.confidence === "high"
                        ? "#f0fdf4"
                        : marketingRoi.confidence === "medium"
                          ? "#fffbeb"
                          : "#fef2f2",
                    color:
                      marketingRoi.confidence === "high"
                        ? "#16a34a"
                        : marketingRoi.confidence === "medium"
                          ? "#d97706"
                          : "#dc2626",
                  }}
                >
                  {marketingRoi.confidence} confidence
                </span>
                <span
                  className="text-[12px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  R² = {marketingRoi.r_squared}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#2563eb" }}
                  >
                    If spend ={" "}
                    {marketingRoi.hypothetical_spend?.toLocaleString()}
                  </div>
                  <div
                    className="text-xl font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ~{marketingRoi.predicted_revenue?.toLocaleString()} revenue
                  </div>
                  <div
                    className="text-[12px] mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Predicted ROI: {marketingRoi.predicted_roi}x
                  </div>
                </div>
                <div
                  className="rounded-2xl p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "#64748b" }}
                  >
                    Current Average
                  </div>
                  <div
                    className="text-[13px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Spend: {marketingRoi.current_avg_spend?.toLocaleString()}
                  </div>
                  <div
                    className="text-[13px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Revenue:{" "}
                    {marketingRoi.current_avg_revenue?.toLocaleString()}
                  </div>
                </div>
              </div>
              {marketingRoi.curve && marketingRoi.curve.length > 0 && (
                <div
                  className="rounded-2xl p-4"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <p
                    className="text-[11px] mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Predicted revenue at different spend levels
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={marketingRoi.curve}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="spend"
                        tick={{ fontSize: 10 }}
                        stroke="#94a3b8"
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted_revenue"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Inventory Analytics */}
          {visibleSections.inventory && inventoryAnalytics?.available && (
            <div className="mb-6">
              <SectionHeader
                label="Inventory Analytics"
                icon={<TriangleAlert size={12} />}
                color="#475569"
              />
              {inventoryAnalytics.low_stock_alerts &&
                inventoryAnalytics.low_stock_alerts.length > 0 && (
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-xl mb-3 text-[13px]"
                    style={{
                      background: "var(--warning-bg, #fffbeb)",
                      color: "var(--warning, #d97706)",
                      border: "1px solid var(--warning, #d97706)",
                    }}
                  >
                    <TriangleAlert size={14} />
                    Low stock:{" "}
                    {inventoryAnalytics.low_stock_alerts
                      .map((a) => a.product)
                      .join(", ")}{" "}
                    (below {inventoryAnalytics.low_stock_threshold} units)
                  </div>
                )}

              {inventoryAnalytics.historical_dip_alerts &&
                inventoryAnalytics.historical_dip_alerts.length > 0 && (
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-xl mb-3 text-[13px]"
                    style={{
                      background: "#f8fafc",
                      color: "#475569",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <TriangleAlert size={14} />
                    Previously dipped low:{" "}
                    {inventoryAnalytics.historical_dip_alerts
                      .map((a) => `${a.product} (min ${a.min_inventory})`)
                      .join(", ")}{" "}
                    — currently recovered
                  </div>
                )}

              {inventoryAnalytics.latest_by_product &&
                inventoryAnalytics.latest_by_product.length > 0 && (
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      border: "1px solid var(--border)",
                      borderLeft: "3px solid #475569",
                    }}
                  >
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr style={{ background: "var(--bg-primary)" }}>
                          <Th>Product</Th>
                          <Th>Current Inventory</Th>
                          <Th>Status</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryAnalytics.latest_by_product.map((p, i) => (
                          <tr
                            key={p.product}
                            style={{
                              borderTop:
                                i > 0 ? "1px solid var(--border)" : "none",
                            }}
                          >
                            <Td>{p.product}</Td>
                            <Td>{p.inventory.toLocaleString()}</Td>
                            <td className="px-3 py-2.5">
                              {p.low_stock ? (
                                <span
                                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                  style={{
                                    background: "#fef2f2",
                                    color: "#dc2626",
                                  }}
                                >
                                  Low Stock
                                </span>
                              ) : (
                                <span
                                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                  style={{
                                    background: "#f0fdf4",
                                    color: "#16a34a",
                                  }}
                                >
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {/* Inventory Forecast */}
          {visibleSections.inventoryForecast &&
            inventoryForecast?.available && (
              <div className="mb-6">
                <SectionHeader
                  label="Inventory Forecast"
                  icon={<TrendingUp size={12} />}
                  color="#475569"
                />
                {inventoryForecast.products
                  ?.filter((p) => p.will_run_low)
                  .map((p) => (
                    <div
                      key={p.product}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl mb-2 text-[13px]"
                      style={{
                        background: "#fffbeb",
                        color: "#d97706",
                        border: "1px solid #d97706",
                      }}
                    >
                      <TriangleAlert size={14} />
                      {p.product} predicted to drop below{" "}
                      {inventoryForecast.low_stock_threshold} units by{" "}
                      {p.predicted_low_stock_date}
                    </div>
                  ))}
                <div
                  className="grid gap-3 mt-3"
                  style={{
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  }}
                >
                  {inventoryForecast.products?.map((p) => (
                    <div
                      key={p.product}
                      className="rounded-2xl p-4"
                      style={{
                        border: "1px solid var(--border)",
                        borderLeft: p.will_run_low
                          ? "3px solid #d97706"
                          : "3px solid #475569",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-[13px] font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {p.product}
                        </span>
                        <span
                          className="text-[12px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          current: {p.current_inventory}
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={100}>
                        <LineChart data={p.forecast}>
                          <XAxis dataKey="date" hide />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{
                              fontSize: 11,
                              borderRadius: 8,
                              border: "1px solid var(--border)",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="predicted_inventory"
                            stroke={p.will_run_low ? "#d97706" : "#475569"}
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={{ r: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Columns */}
          <SectionHeader label="Columns" color="#64748b" />
          <div
            className="rounded-2xl overflow-hidden mb-6"
            style={{ border: "1px solid var(--border)" }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "var(--bg-primary)" }}>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Missing</Th>
                  <Th>Detected Role</Th>
                </tr>
              </thead>
              <tbody>
                {result.columns.map((col) => (
                  <tr
                    key={col.name}
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <td
                      className="px-3 py-2.5 font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {col.name}
                    </td>
                    <td
                      className="px-3 py-2.5 font-mono text-[12px]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {col.dtype}
                    </td>
                    <td
                      className="px-3 py-2.5"
                      style={{
                        color:
                          col.null_count > 0
                            ? "var(--warning, #d97706)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {col.null_count}
                    </td>
                    <td className="px-3 py-2.5">
                      {col.role === "unknown" ? (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                          style={roleBadgeStyle(col.role)}
                        >
                          {col.role}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Engineered Features */}
          {result.engineered_features?.length > 0 && (
            <div className="mb-6">
              <SectionHeader
                label="Engineered Features"
                icon={<Sparkles size={12} />}
                color="#2563eb"
              />
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid var(--border)",
                  borderLeft: "3px solid #2563eb",
                }}
              >
                {result.engineered_features.map((f, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 text-[13px]"
                    style={{
                      borderTop: i > 0 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {f.name}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        derived from <code>{f.source_column}</code>
                      </span>
                    </div>
                    {f.top_5 && (
                      <div
                        className="mt-1.5 text-[12px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Top customers:{" "}
                        {f.top_5.map((t, j) => (
                          <span
                            key={t.customer_id}
                            className="px-1.5 py-0.5 rounded text-[11px] font-medium mr-1"
                            style={{
                              background: "var(--bg-primary)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            {t.customer_id} · {t.order_count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicates */}
          {result.duplicate_count > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <SectionHeader
                  label={`Duplicates Found · ${result.duplicate_count}`}
                  icon={<Copy size={12} />}
                  color="var(--danger, #dc2626)"
                  noMargin
                />
                <button
                  onClick={() => handleClean(["remove_duplicates"])}
                  disabled={cleaning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
                  style={{
                    color: "white",
                    background: "var(--accent)",
                  }}
                >
                  {cleaning && <Loader2 size={12} className="animate-spin" />}
                  {cleaning ? "Cleaning..." : "Remove Duplicates"}
                </button>
              </div>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid var(--border)",
                  borderLeft: "3px solid var(--danger, #dc2626)",
                }}
              >
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ background: "var(--bg-primary)" }}>
                      {result.columns.map((col) => (
                        <Th key={col.name}>{col.name}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.duplicate_rows_preview.map((row, i) => (
                      <tr
                        key={i}
                        style={{ borderTop: "1px solid var(--border)" }}
                      >
                        {result.columns.map((col) => (
                          <Td key={col.name}>
                            {row[col.name] === null
                              ? "—"
                              : String(row[col.name])}
                          </Td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Outliers */}
          {Object.entries(result.outliers_by_column).map(([colName, info]) => (
            <div key={colName} className="mb-6">
              <SectionHeader
                label={`Outliers in "${colName}" · ${info.count} (expected ${info.lower_bound}–${info.upper_bound})`}
                icon={<TriangleAlert size={12} />}
                color="var(--warning, #d97706)"
              />
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid var(--border)",
                  borderLeft: "3px solid var(--warning, #d97706)",
                }}
              >
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ background: "var(--bg-primary)" }}>
                      {result.columns.map((col) => (
                        <Th key={col.name}>{col.name}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {info.rows.map((row, i) => (
                      <tr
                        key={i}
                        style={{ borderTop: "1px solid var(--border)" }}
                      >
                        {result.columns.map((col) => (
                          <Td key={col.name}>
                            {row[col.name] === null
                              ? "—"
                              : String(row[col.name])}
                          </Td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Preview */}
          <div className="flex items-center justify-between mb-2">
            <SectionHeader label="Preview" color="#64748b" noMargin />
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#2563eb",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#dbeafe";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#eff6ff";
              }}
            >
              <Copy size={12} />
              Export CSV
            </button>
          </div>
          <div
            className="overflow-x-auto rounded-2xl"
            style={{ border: "1px solid var(--border)" }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "var(--bg-primary)" }}>
                  {result.columns.map((col) => (
                    <Th key={col.name}>{col.name}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.preview.map((row, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                    {result.columns.map((col) => (
                      <Td key={col.name}>
                        {row[col.name] === null ? "—" : String(row[col.name])}
                      </Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk delete modal */}
      {deleteConfirmBulk && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDeleteConfirmBulk(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm mx-4 p-5 rounded-2xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <h3
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {deleteConfirmBulk === "all"
                ? `Delete all ${datasets.length} datasets?`
                : `Delete ${selectedIds.size} selected dataset${selectedIds.size > 1 ? "s" : ""}?`}
            </h3>
            <p
              className="text-[13px] mb-5"
              style={{ color: "var(--text-secondary)" }}
            >
              This can't be undone. Files and their analysis will be permanently
              removed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmBulk(null)}
                className="px-4 py-2 rounded-xl text-[13px] font-medium transition-colors"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-colors"
                style={{ background: "var(--danger, #dc2626)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single delete modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm mx-4 p-5 rounded-2xl"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <h3
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Delete dataset?
            </h3>
            <p
              className="text-[13px] mb-5"
              style={{ color: "var(--text-secondary)" }}
            >
              This can't be undone. The file and its analysis will be
              permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-[13px] font-medium transition-colors"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-colors"
                style={{ background: "var(--danger, #dc2626)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- small shared presentational bits ---

function SectionHeader({
  label,
  icon,
  color = "var(--text-muted)",
  noMargin = false,
}: {
  label: string;
  icon?: React.ReactNode;
  color?: string;
  noMargin?: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest ${noMargin ? "" : "mb-2"}`}
      style={{ color }}
    >
      {icon}
      {label}
    </p>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wide whitespace-nowrap"
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      className="px-3 py-2.5 whitespace-nowrap tabular-nums"
      style={{ color: "var(--text-primary)" }}
    >
      {children}
    </td>
  );
}

function roleBadgeStyle(role: string): React.CSSProperties {
  const map: Record<string, { bg: string; fg: string }> = {
    date: { bg: "#eff6ff", fg: "#2563eb" },
    revenue: { bg: "#f0fdf4", fg: "#16a34a" },
    sales: { bg: "#ecfdf5", fg: "#059669" },
    customer_id: { bg: "#faf5ff", fg: "#9333ea" },
    email: { bg: "#fdf4ff", fg: "#c026d3" },
    product: { bg: "#fff7ed", fg: "#ea580c" },
    quantity: { bg: "#fefce8", fg: "#ca8a04" },
    region: { bg: "#ecfeff", fg: "#0891b2" },
    category: { bg: "#f5f3ff", fg: "#7c3aed" },
    status: { bg: "#f0fdfa", fg: "#0d9488" },
    marketing_spend: { bg: "#fff1f2", fg: "#e11d48" },
    inventory: { bg: "#f1f5f9", fg: "#475569" },
  };
  const c = map[role] || { bg: "#f8fafc", fg: "#64748b" };
  return { background: c.bg, color: c.fg };
}

function KpiCard({
  icon,
  label,
  value,
  color,
  small = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        border: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div
        className={
          small
            ? "text-[13px] font-semibold tabular-nums"
            : "text-xl font-semibold tabular-nums"
        }
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}
