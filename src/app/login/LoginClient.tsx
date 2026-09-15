"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, HeartHandshake, Code } from "lucide-react";

const roles = [
  { id: "parent", name: "Parent", icon: HeartHandshake, description: "Follow your children's schedules and explore enrichment classes." },
  { id: "teacher", name: "Teacher", icon: BookOpen, description: "See your teaching schedule, assigned classes, and student rosters." },
  { id: "admin", name: "Admin", icon: GraduationCap, description: "Explore school operations, class planning, and enrollment requests." },
] as const;

export default function LoginClient({ error }: { error?: string }) {
  const [pending, setPending] = useState<string | null>(null);
  return (
    <main className="min-h-dvh bg-[#f6f8f7] px-5 py-8 text-[#18332f] sm:px-8 lg:px-16">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <Link href="/login" className="flex items-center gap-3 font-semibold tracking-tight">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#18332f] text-white"><GraduationCap size={23} /></span>
          <span>Curious Innovators<br /><span className="text-xs font-normal tracking-wide text-[#526761]">ACADEMY</span></span>
        </Link>
        <a href="https://github.com/dejoski/curious-innovators-academy" className="flex items-center gap-2 rounded-lg border border-[#cad6d0] px-4 py-2 text-sm font-medium hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4"><Code size={17} />View source</a>
      </header>
      <div className="mx-auto grid max-w-6xl items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
        <section>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#47705b]">Open source. Built for schools.</p>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-[-0.04em] sm:text-5xl lg:text-6xl">More room<br />for learning.</h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[#526761]">A student information and scheduling toolkit for the school you want to build. Connect families, teachers, classes, and the school day.</p>
          <div className="mt-8 flex flex-wrap gap-2 text-xs font-medium text-[#526761]">
            {["Student records", "Class scheduling", "Family portal", "MIT licensed"].map((label) => <span key={label} className="rounded-full border border-[#d6e1da] px-3 py-1.5">{label}</span>)}
          </div>
          <p className="mt-9 max-w-md text-sm leading-relaxed text-[#526761]">Fork it, adapt it, and make it your own. Built with Next.js and Supabase, with access rules for each school role.</p>
        </section>
        <section aria-labelledby="demo-title" className="rounded-3xl border border-[#dce5df] bg-white p-6 shadow-[0_16px_60px_-30px_#254c3c50] sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#47705b]">Explore the demo</p>
          <h2 id="demo-title" className="mt-2 text-2xl font-semibold tracking-tight">Choose your seat.</h2>
          <p className="mb-6 mt-2 text-sm leading-relaxed text-[#526761]">No account or password needed. Pick a role to explore the school.</p>
          {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="space-y-3">
            {roles.map(({ id, name, icon: Icon, description }) => (
              <form key={id} action="/api/auth/demo-login" method="post" onSubmit={() => setPending(id)}><input type="hidden" name="kind" value={id} /><button type="submit" disabled={pending !== null} className="group flex w-full items-center gap-4 rounded-2xl border border-[#dce5df] p-4 text-left transition hover:border-[#47705b] hover:bg-[#f5f9f6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#47705b] disabled:opacity-60">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#edf4ee] text-[#47705b]"><Icon size={23} /></span>
                <span className="flex-1"><span className="block text-sm font-semibold">{pending === id ? "Opening your workspace..." : `Log in as Demo ${name}`}</span><span className="mt-1 block text-xs leading-relaxed text-[#526761]">{description}</span></span>
                <ArrowRight size={17} className="shrink-0 text-[#47705b]" />
              </button></form>
            ))}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-[#64746d]">This is a shared demonstration. Please use fictional information when exploring.</p>
        </section>
      </div>
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 border-t border-[#dce5df] pt-5 text-xs text-[#526761]">
        <p>A starting point for schools and the people building them.</p>
        <div className="flex gap-5"><a href="https://github.com/dejoski/curious-innovators-academy#make-it-your-school" className="hover:underline">Build your school</a><Link href="/privacy" className="hover:underline">Privacy</Link><Link href="/terms" className="hover:underline">Terms</Link></div>
      </footer>
    </main>
  );
}
