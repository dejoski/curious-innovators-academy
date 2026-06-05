/**
 * Shared dashboard shell surfaces: white panels on #fafafa, Inter, neutral strokes.
 * Compose with layout utilities (padding, flex, gap) per view.
 */

/* --- Surfaces --- */

/* --- Borders & radius --- */
export const DASHBOARD_BORDER_SUBTLE_CLASS = "border-[#f0f0f0]" as const;
/** Outer cards / panels on the canvas */
export const DASHBOARD_PANEL_CLASS =
  `${DASHBOARD_SURFACE_CLASS} border ${DASHBOARD_BORDER_SUBTLE_CLASS} border-solid rounded-[18px] shadow-sm` as const;

/** Horizontal scroll region for wide data tables */
export const DASHBOARD_TABLE_SCROLL_CLASS =
  "w-full overflow-x-auto min-h-[300px]" as const;

/* --- Typography (shell) --- */
export const DASHBOARD_TEXT_PRIMARY_CLASS = "text-[#272932]" as const;
export const DASHBOARD_TEXT_SECONDARY_CLASS = "text-[#666d80]" as const;
export const DASHBOARD_TEXT_MUTED_CLASS = "text-[#818898]" as const;

export const DASHBOARD_FONT_NAV_PRIMARY_CLASS =
  "font-['Inter:Medium',sans-serif] font-medium text-[14px] leading-[1.4]" as const;

/* --- Sidebar (open state primary nav) --- */
export const DASHBOARD_SIDEBAR_SURFACE_CLASS =
  `bg-[#fafafa] ${DASHBOARD_BORDER_SUBTLE_CLASS} border-r border-solid` as const;

export const DASHBOARD_SIDEBAR_NAV_ROW_BASE_CLASS =
  "content-stretch flex gap-[8px] h-[32px] items-center px-[12px] py-[6px] relative rounded-[8px] shrink-0 w-[240px] transition-colors cursor-pointer" as const;

export const DASHBOARD_SIDEBAR_NAV_LABEL_BASE_CLASS =
  "flex-[1_0_0] min-w-px not-italic relative" as const;

export const DASHBOARD_SIDEBAR_ICON_BOX_CLASS =
  "relative shrink-0 size-[18px]" as const;

export const DASHBOARD_SIDEBAR_CHEVRON_CLASS =
  "relative shrink-0 size-[18px]" as const;

/** Expanded nav secondary links (indented stack) */
export const DASHBOARD_SIDEBAR_SUBMENU_STACK_CLASS =
  "flex flex-col gap-[8px] mt-[8px] w-full" as const;

export const DASHBOARD_SIDEBAR_SUB_LINK_BASE_CLASS =
  "block rounded-[6px] px-[12px] py-[6px] transition-colors font-['Inter:Medium',sans-serif] text-[14px] font-medium leading-[1.4]" as const;

export const DASHBOARD_SIDEBAR_NAV_ACTIVE_BG_CLASS = "bg-[#d2f1f5]" as const;
export const DASHBOARD_SIDEBAR_NAV_HOVER_BG_CLASS = "hover:bg-[#f0f0f0]/60" as const;

/* --- Sidebar header / collapse --- */
export const DASHBOARD_SIDEBAR_HEADER_BORDER_CLASS =
  `border-[#dfe1e7] border-b border-solid` as const;

export const DASHBOARD_SIDEBAR_COLLAPSE_BTN_CLASS =
  `bg-white border border-[#dfe1e7] border-solid overflow-clip rounded-[6px] shadow-[0px_0.75px_1.5px_0px_rgba(13,13,18,0.06)] shrink-0 size-[24px] cursor-pointer hover:bg-[#fafafa] transition-colors relative inline-flex items-center justify-center p-0` as const;

/* --- Main header chrome --- */
export const DASHBOARD_MAIN_HEADER_WRAP_CLASS =
  `bg-white min-h-[72px] shrink-0 w-full z-50 md:min-h-[88px]` as const;

export const DASHBOARD_MAIN_HEADER_ROW_CLASS =
  `content-stretch flex items-center justify-between px-4 pb-0 pt-3 shrink-0 w-full md:px-[32px] md:pt-[20px]` as const;

export const DASHBOARD_MAIN_HEADER_UNDERLINE_CLASS =
  `${DASHBOARD_BORDER_STRONG_CLASS} border-b border-solid pb-3 md:pb-[20px]` as const;

export const DASHBOARD_HEADER_DROPDOWN_PANEL_CLASS =
  `${DASHBOARD_SURFACE_CLASS} ${DASHBOARD_RADIUS_INSET} shadow-lg ${DASHBOARD_BORDER_SUBTLE_CLASS} border border-solid py-2 z-50` as const;
