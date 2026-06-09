import NextLink from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { DASHBOARD_BUTTON_TEXT_CLASS } from "@/lib/dashboard-shell-classes";

function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}

type PageBackLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function PageBackLink({ href, children, className }: PageBackLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex h-[42px] w-fit items-center gap-2 rounded-[8px] border border-[#dfe1e7] bg-white px-4 text-[#666d80] shadow-[0px_1px_2px_rgba(13,13,18,0.04)] transition-colors hover:border-[#c9ced8] hover:text-[#0d0d12]",
        DASHBOARD_BUTTON_TEXT_CLASS,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14c1d5]/20 focus-visible:ring-offset-0",
        className ?? "",
      ].join(" ")}
    >
      <ChevronLeft className="size-4 shrink-0" aria-hidden strokeWidth={2} />
      <span className="whitespace-nowrap">{children}</span>
    </Link>
  );
}
