import { getDatasetMovers, getAggregateDashboardStats } from "@/lib/data";

export type AlertMetric = "dataset_delta" | "mrr_delta";
export type AlertOperator = "above" | "below";
export type AlertStatus = "triggered" | "safe" | "unchecked";

export interface SavedAlert {
  id: string;
  name: string;
  metric: AlertMetric;
  datasetFilter: string;
  operator: AlertOperator;
  threshold: number;
  createdAt: string;
  color: string;
  active: boolean;
  lastChecked: string | null;
  lastStatus: AlertStatus;
  triggeredValue: number | null;
  triggeredSource: string | null;
  aiInsight: string | null;
  selectedForCompare: boolean;
  read: boolean;
}

export const ALERTS_STORAGE_KEY = "insightforge_saved_alerts_v1";
export const ALERTS_UPDATED_EVENT = "insightforge-alerts-updated";

export function loadAlerts(): SavedAlert[] {
  try {
    const v = localStorage.getItem(ALERTS_STORAGE_KEY);
    return v ? (JSON.parse(v) as SavedAlert[]) : [];
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: SavedAlert[]) {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    // notify other mounted components (Sidebar) in the SAME tab —
    // the native "storage" event only fires cross-tab, so this covers
    // the instant-update-after-upload case
    window.dispatchEvent(new Event(ALERTS_UPDATED_EVENT));
  } catch {
    /**/
  }
}

export async function checkAlert(alert: SavedAlert): Promise<{
  status: AlertStatus;
  value: number | null;
  source: string | null;
}> {
  try {
    if (alert.metric === "dataset_delta") {
      const movers = await getDatasetMovers();
      const pool = alert.datasetFilter
        ? movers.filter((m) => m.filename === alert.datasetFilter)
        : movers;
      const hit = pool.find((m) =>
        alert.operator === "above"
          ? m.deltaPct > alert.threshold
          : m.deltaPct < -alert.threshold,
      );
      if (hit) {
        return {
          status: "triggered",
          value: hit.deltaPct,
          source: hit.filename,
        };
      }
      const worst = pool.sort(
        (a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct),
      )[0];
      return {
        status: "safe",
        value: worst?.deltaPct ?? null,
        source: worst?.filename ?? null,
      };
    }

    // mrr_delta — computed from real sparkline, no fake field
    const stats = await getAggregateDashboardStats();
    const points = stats.mrrSparkline ?? [];
    if (points.length < 2) {
      return { status: "unchecked", value: null, source: null };
    }
    const last = points[points.length - 1].mrr;
    const prev = points[points.length - 2].mrr;
    const deltaPct = prev !== 0 ? ((last - prev) / prev) * 100 : 0;
    const triggered =
      alert.operator === "above"
        ? deltaPct > alert.threshold
        : deltaPct < -alert.threshold;
    return {
      status: triggered ? "triggered" : "safe",
      value: Math.round(deltaPct * 10) / 10,
      source: null,
    };
  } catch {
    return { status: "unchecked", value: null, source: null };
  }
}

/** Checks every active alert, stamps lastChecked (skipping "unchecked" per
 *  the earlier bugfix), persists, fires the update event, and returns which
 *  alerts newly flipped into "triggered" — that's the badge-pulse trigger. */
export async function runCheckAllAlerts(
  list: SavedAlert[],
): Promise<{ updated: SavedAlert[]; newlyTriggered: SavedAlert[] }> {
  const newlyTriggered: SavedAlert[] = [];
  const updated = await Promise.all(
    list.map(async (a) => {
      if (!a.active) return a;
      const { status, value, source } = await checkAlert(a);
      const next: SavedAlert = {
        ...a,
        lastStatus: status,
        triggeredValue: value,
        triggeredSource: source,
        read:
          status === "triggered" && a.lastStatus !== "triggered"
            ? false
            : a.read,
        lastChecked:
          status === "unchecked"
            ? a.lastChecked
            : new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
      };
      if (status === "triggered" && a.lastStatus !== "triggered") {
        newlyTriggered.push(next);
      }
      return next;
    }),
  );
  saveAlerts(updated);
  return { updated, newlyTriggered };
}

export function getTriggeredAlerts(list: SavedAlert[]): SavedAlert[] {
  return list.filter((a) => a.active && a.lastStatus === "triggered");
}

export function getUnreadTriggeredAlerts(list: SavedAlert[]): SavedAlert[] {
  return list.filter(
    (a) => a.active && a.lastStatus === "triggered" && !a.read,
  );
}

export function markAlertRead(list: SavedAlert[], id: string): SavedAlert[] {
  const updated = list.map((a) => (a.id === id ? { ...a, read: true } : a));
  saveAlerts(updated);
  return updated;
}
