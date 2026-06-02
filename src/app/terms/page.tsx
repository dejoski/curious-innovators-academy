import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for Curious Innovators Academy.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#fafafa] px-6 py-12 font-sans text-[#272932]">
      <div className="mx-auto max-w-3xl rounded-[12px] border border-[#eef0f3] bg-white p-8 shadow-sm">
        <Link href="/login" className="text-sm font-medium text-[#14c1d5] hover:underline">
          Back to login
        </Link>
        <h1 className="mt-6 text-[28px] font-bold leading-[1.1]">Terms of Use</h1>
        <p className="mt-3 text-sm leading-6 text-[#666d80]">Last updated: May 17, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-[#3d4554]">
          <section>
            <h2 className="text-lg font-semibold text-[#272932]">Authorized Use</h2>
            <p className="mt-2">
              This application is for authorized academy staff, guardians, teachers, and students. Users are responsible
              for keeping credentials private and signing out on shared devices.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#272932]">Student Records</h2>
            <p className="mt-2">
              Users may only access, update, or export student and family records for legitimate school operations and
              according to the permissions granted to their role.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#272932]">Administrative Changes</h2>
            <p className="mt-2">
              Class, enrollment, schedule, account, and request changes may be audited. Administrators should review
              audit logs and correct inaccurate records promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#272932]">Availability</h2>
            <p className="mt-2">
              Operators should monitor uptime, record health, backups, and login flows before relying on this system
              for daily school operations.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
