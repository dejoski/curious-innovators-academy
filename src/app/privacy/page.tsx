import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Curious Innovators Academy.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fafafa] px-6 py-12 font-sans text-[#272932]">
      <div className="mx-auto max-w-3xl rounded-[12px] border border-[#eef0f3] bg-white p-8 shadow-sm">
        <Link href="/login" className="text-sm font-medium text-[#14c1d5] hover:underline">
          Back to login
        </Link>
        <h1 className="mt-6 text-[28px] font-bold leading-[1.1]">Privacy Policy</h1>
        <p className="mt-3 text-sm leading-6 text-[#666d80]">Last updated: September 15, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-[#3d4554]">
          <section><h2 className="text-lg font-semibold">Public demonstration</h2><p>This site is a shared open-source demo. Do not enter real student, family, financial, or contact information. Other visitors can access demo records. Supabase session cookies support sign-in, and the hosting providers may retain operational logs. Independent schools running a fork are responsible for their own privacy policy and data practices.</p></section>
          <section>
            <h2 className="text-lg font-semibold text-[#272932]">What We Collect</h2>
            <p className="mt-2">
              Curious Innovators Academy stores account, roster, guardian, class, enrollment, schedule, notification,
              and support-note data needed to operate school workflows.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#272932]">How We Use Data</h2>
            <p className="mt-2">
              Data is used to authenticate users, manage schedules and rosters, review enrichment requests, communicate
              with families, and maintain audit records for administrative changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#272932]">Access Controls</h2>
            <p className="mt-2">
              Production deployments must use role-based access controls so administrators, teachers, parents,
              and students can only access records allowed by their role and relationships.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#272932]">Retention And Requests</h2>
            <p className="mt-2">
              Operators should retain student and guardian records only as long as required for school operations,
              legal obligations, and audit needs. Requests to correct or remove records should be routed to the academy
              administrator.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
