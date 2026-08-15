import Link from "next/link";

export const metadata = {
  title: "System Status — InsightForge",
};

const SERVICES = [
  { name: "Dashboard & Web App", status: "operational" },
  { name: "Dataset Upload & Processing", status: "operational" },
  { name: "AI Insights & Briefings", status: "operational" },
  { name: "Authentication", status: "operational" },
];

export default function StatusPage() {
  return (
    <div
      className="min-h-screen px-6 py-16"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-[13px] font-medium hover:underline"
          style={{ color: "var(--accent)" }}
        >
          ← Back to Dashboard
        </Link>

        <h1
          className="text-2xl font-semibold mt-6 mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          System Status
        </h1>
        <p className="text-[13px] mb-10" style={{ color: "var(--text-muted)" }}>
          Current operational status of InsightForge services
        </p>

        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg mb-8"
          style={{ background: "var(--success-bg)" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--success)" }}
          />
          <p
            className="text-[13px] font-medium"
            style={{ color: "var(--success)" }}
          >
            All systems operational
          </p>
        </div>

        <div className="space-y-3">
          {SERVICES.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between px-4 py-3 rounded-lg"
              style={{ border: "1px solid var(--border)" }}
            >
              <p
                className="text-[13px]"
                style={{ color: "var(--text-primary)" }}
              >
                {s.name}
              </p>
              <span
                className="flex items-center gap-1.5 text-[12px] font-medium"
                style={{ color: "var(--success)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--success)" }}
                />
                Operational
              </span>
            </div>
          ))}
        </div>

        <p
          className="text-[11px] mt-12 pt-6 border-t"
          style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
        >
          This status page is not currently backed by automated uptime
          monitoring — statuses are set manually.
        </p>
      </div>
    </div>
  );
}
