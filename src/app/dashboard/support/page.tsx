"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type FaqItem = { q: string; a: string; keywords: string };

const FAQ: FaqItem[] = [
  {
    q: "How do I approve an enrichment class request?",
    a: "Open Requests under Classes, review the family note and prerequisites, then Approve or Request changes. The family is notified automatically.",
    keywords: "approve enrichment request classes",
  },
  {
    q: "Where can I update teacher availability?",
    a: "Use Schedule to view coverage and edit slots. Changes sync to core and enrichment offerings based on your permissions.",
    keywords: "teacher availability schedule coverage",
  },
  {
    q: "How do parents see their student's roster?",
    a: "Parents access roster and schedules from their portal after linking a student. Admins can resend invites from the student profile.",
    keywords: "parents roster student portal",
  },
  {
    q: "Reporting incorrect enrollment data",
    a: "From Students or Classes, open the record and use Feedback so operations can reconcile SIS data.",
    keywords: "enrollment data wrong incorrect feedback",
  },
];

const CATEGORIES = ["Classes & enrollment", "Schedule & coverage", "Accounts & access", "Billing & invoices", "Other"] as const;

export default function DashboardSupportPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Classes & enrollment");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sentBanner, setSentBanner] = useState(false);

  const filteredFaq = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ;
    return FAQ.filter(
      (item) =>
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q) ||
        item.keywords.includes(q)
    );
  }, [query]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSentBanner(true);
    window.setTimeout(() => setSentBanner(false), 5000);
  };

  return (
    <div className="p-8 w-full max-w-[1168px] mx-auto font-sans pb-16">
      <div className="mb-8">
        <h1 className="text-[#272932] text-[28px] font-bold mb-2">Help & support</h1>
        <p className="text-[#666d80] text-base">
          Search common answers or send a message to the academy operations team.
        </p>
      </div>

      {sentBanner ? (
        <div
          role="status"
          className="mb-6 rounded-[10px] border border-[#c8f4f0] bg-[#e8fafb] px-4 py-3 text-sm text-[#0d5c56] flex items-center justify-between gap-4"
        >
          <span className="font-medium">Thanks — your message was recorded. We&apos;ll follow up by email.</span>
          <button
            type="button"
            onClick={() => setSentBanner(false)}
            className="text-[#0d5c56]/80 hover:text-[#0d5c56] text-xs font-semibold shrink-0"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <section className="rounded-[12px] border border-[#eef0f3] bg-white p-6 shadow-sm">
          <h2 className="text-[#272932] text-lg font-semibold mb-4">Frequently asked questions</h2>
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#818898]" size={18} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help articles..."
              className="w-full h-[44px] rounded-[10px] border border-[#dfe1e7] pl-10 pr-3 text-[15px] text-[#05080b] placeholder:text-[#818898] outline-none focus:border-[#14c1d5] bg-white"
              aria-label="Search FAQ"
            />
          </div>
          {filteredFaq.length === 0 ? (
            <p className="text-sm text-[#666d80]">No articles match that search. Try different keywords or contact us using the form.</p>
          ) : (
            <ul className="divide-y divide-[#f0f2f5]">
              {filteredFaq.map((item) => (
                <li key={item.q} className="py-4 first:pt-0">
                  <p className="font-medium text-[#272932] text-[15px]">{item.q}</p>
                  <p className="mt-1 text-sm text-[#666d80] leading-relaxed">{item.a}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[12px] border border-[#eef0f3] bg-white p-6 shadow-sm">
          <h2 className="text-[#272932] text-lg font-semibold mb-1">Contact us</h2>
          <p className="text-[#666d80] text-sm mb-5">Choose a topic and describe what you need. Replies go to your work email.</p>

          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="support-category" className="text-[13px] font-medium text-[#2f2f2d]">
                Category
              </label>
              <select
                id="support-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
                className="h-[44px] rounded-[10px] border border-[#dfe1e7] px-3 text-[15px] text-[#05080b] outline-none focus:border-[#14c1d5] bg-white cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="support-email" className="text-[13px] font-medium text-[#2f2f2d]">
                Reply-to email
              </label>
              <input
                id="support-email"
                type="email"
                required
                autoComplete="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@school.edu"
                className="h-[44px] rounded-[10px] border border-[#dfe1e7] px-3 text-[15px] outline-none focus:border-[#14c1d5]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="support-subject" className="text-[13px] font-medium text-[#2f2f2d]">
                Subject
              </label>
              <input
                id="support-subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary"
                className="h-[44px] rounded-[10px] border border-[#dfe1e7] px-3 text-[15px] outline-none focus:border-[#14c1d5]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="support-message" className="text-[13px] font-medium text-[#2f2f2d]">
                Message
              </label>
              <textarea
                id="support-message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the issue or question..."
                className="rounded-[10px] border border-[#dfe1e7] px-3 py-2 text-[15px] outline-none focus:border-[#14c1d5] resize-y min-h-[120px]"
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-[6px] bg-[#14c1d5] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[#12aebd] transition-colors"
            >
              Send message
            </button>
          </form>
        </section>
      </div>

      <p className="mt-8">
        <Link href="/dashboard" className="text-[#14c1d5] text-sm font-medium hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}
