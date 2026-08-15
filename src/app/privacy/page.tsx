import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — InsightForge",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-[13px] mb-10" style={{ color: "var(--text-muted)" }}>
          Last updated: August 2026
        </p>

        <div
          className="space-y-8 text-[14px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              1. Data We Collect
            </h2>
            <p>
              InsightForge collects account information (name, email, company),
              usage data, and any datasets you upload to the platform for
              analysis. Uploaded data is used solely to generate the metrics,
              insights, and reports you request.
            </p>
          </section>

          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              2. How We Use Your Data
            </h2>
            <p>
              We use your data to operate the dashboard, compute KPIs, generate
              AI-powered insights and briefings, and improve platform
              reliability. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              3. Data Storage &amp; Security
            </h2>
            <p>
              Data is stored using industry-standard cloud infrastructure with
              access controls scoped to your company account. Only authorized
              members of your organization can view your company&apos;s data.
            </p>
          </section>

          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              4. Third-Party Services
            </h2>
            <p>
              We use third-party providers for authentication, hosting, and
              AI-generated insights. These providers process data only as needed
              to deliver the service and are bound by their own privacy
              commitments.
            </p>
          </section>

          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              5. Your Rights
            </h2>
            <p>
              You may request access to, correction of, or deletion of your
              account data at any time by contacting your workspace
              administrator or reaching out to support.
            </p>
          </section>

          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              6. Contact
            </h2>
            <p>
              Questions about this policy can be directed to your account
              administrator.
            </p>
          </section>
        </div>

        <p
          className="text-[11px] mt-12 pt-6 border-t"
          style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
        >
          This is placeholder policy content and has not been reviewed by legal
          counsel. Replace with counsel-reviewed language before production use.
        </p>
      </div>
    </div>
  );
}
