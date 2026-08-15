import Link from "next/link";

export const metadata = {
  title: "Terms of Service — InsightForge",
};

export default function TermsPage() {
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
          Terms of Service
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
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using InsightForge, you agree to be bound by these
              Terms of Service. If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              2. Account Responsibilities
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activity that occurs under your
              account.
            </p>
          </section>

          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              3. Acceptable Use
            </h2>
            <p>
              You agree not to misuse the platform, including attempting to
              access data belonging to other companies, reverse-engineering the
              service, or uploading unlawful content.
            </p>
          </section>

          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              4. Data Ownership
            </h2>
            <p>
              You retain ownership of any data you upload. We process it solely
              to provide the analytics and insights features of the platform.
            </p>
          </section>

          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              5. Service Availability
            </h2>
            <p>
              We aim for high availability but do not guarantee uninterrupted
              access. Scheduled maintenance or unforeseen issues may cause
              temporary downtime.
            </p>
          </section>

          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              6. Limitation of Liability
            </h2>
            <p>
              InsightForge is provided &quot;as is&quot; without warranties of
              any kind. We are not liable for indirect or consequential damages
              arising from use of the platform.
            </p>
          </section>

          <section>
            <h2
              className="text-[15px] font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              7. Changes to Terms
            </h2>
            <p>
              We may update these terms from time to time. Continued use of the
              platform after changes constitutes acceptance of the revised
              terms.
            </p>
          </section>
        </div>

        <p
          className="text-[11px] mt-12 pt-6 border-t"
          style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
        >
          This is placeholder terms content and has not been reviewed by legal
          counsel. Replace with counsel-reviewed language before production use.
        </p>
      </div>
    </div>
  );
}
