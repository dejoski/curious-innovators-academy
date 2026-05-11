# 1:1 Figma Parity Verification Checklist

## Quick Verification Steps (Post-Deploy)

Run these checks after each Vercel deployment to confirm 100% parity:

### 1. Build Status
- [ ] `npm run build` completes without errors
- [ ] Zero TypeScript errors
- [ ] All images load from `/public/images/`

### 2. Critical Routes Load
- [ ] `/dashboard` loads with Daily Blocks
- [ ] `/login` loads with all assets and form fields
- [ ] `/dashboard/students` loads with table
- [ ] `/dashboard/classes/core` loads with class list
- [ ] `/dashboard/classes/requests` loads with Suspense boundary
- [ ] `/dashboard/classes/approvals` loads with Suspense boundary
- [ ] `/dashboard/schedule` loads with calendar
- [ ] `/dashboard/parents` loads with parent directory
- [ ] `/dashboard/parents/catalog` loads with enrichment selection

### 3. Visual Consistency
- [ ] Primary brand color is `#14C1D5` throughout
- [ ] Text colors are correct (headings `#272932`, body `#666d80`)
- [ ] Spacing/padding is consistent (8px grid)
- [ ] Fonts are Inter/Inter Tight at correct weights
- [ ] Border colors are `#f0f0f0`
- [ ] Status badge colors are correct (green `#004d08`, red `#d80509`)

### 4. Component States
- [ ] Buttons have hover/active states
- [ ] Form inputs have focus states
- [ ] Dropdowns open/close correctly
- [ ] Tables are sortable/searchable
- [ ] Checkboxes toggle properly
- [ ] Pagination works

### 5. Responsive Design
- [ ] Desktop (1440px): layouts are full width
- [ ] Tablet (768px): layouts stack appropriately
- [ ] Mobile (375px): no overflow, readable text

### 6. Assets & Icons
- [ ] All images load from local `/images/` paths
- [ ] No broken image links (404s)
- [ ] SVG icons render correctly
- [ ] Avatar images display

### 7. Accessibility
- [ ] Links are keyboard navigable
- [ ] Modals have proper focus management
- [ ] Alt text on images
- [ ] ARIA labels on interactive elements

---

## Detailed Screen Checklist

### Login Page (`/login`)
- [ ] ChatGPT logo visible
- [ ] Lightbulb icon visible
- [ ] Background ellipses positioned correctly
- [ ] Form fields styled correctly
- [ ] "Continue as Admin" / "Continue as Parent" buttons work
- [ ] Color scheme matches Figma (blue `#14c1d5`, dark backgrounds)

### Dashboard (`/dashboard`)
- [ ] Daily Blocks section visible
- [ ] Stat cards (Students, Teachers, Core Classes, Enrichment) displayed
- [ ] Block times showing correctly (8am-3pm range)
- [ ] Colors: Core blocks blue `#d2f1f5`, Enrichment blocks light
- [ ] "View Schedule" links route correctly

### Classes Core (`/dashboard/classes/core`)
- [ ] Table has correct columns: Class name, Teacher, Level, Block, Schedule, Pending, Waitlist, Seats, Status
- [ ] Search input filters by class name
- [ ] Filter dropdown opens (All/Active/Inactive)
- [ ] Sort works properly
- [ ] "Add Core Class" button visible
- [ ] Status badges show Active/Full correctly

### Students (`/dashboard/students`)
- [ ] Table has correct columns: Student, Parent, Level, Core Status, Enrichment, Notes, Action
- [ ] Search filters by name
- [ ] Student names link to profiles
- [ ] Stat cards show counts
- [ ] Pagination visible

### Approvals (`/dashboard/classes/approvals`)
- [ ] Table has columns: Student, Parent, Class, Block, Option, Final Status, Reviewed by, Reason
- [ ] Status badges (Approved green, Rejected red)
- [ ] Search/Filter/Sort work
- [ ] Row menus accessible
- [ ] Suspense boundary handles loading state

### Requests (`/dashboard/classes/requests`)
- [ ] Similar to approvals page
- [ ] Status badges correct
- [ ] Request list displays
- [ ] Pagination works

### Schedule (`/dashboard/schedule`)
- [ ] Calendar renders (Month/Week/Day toggles)
- [ ] Events colored by type (Core, Enrichment pending/approved, Event)
- [ ] Navigation arrows work
- [ ] Date display is correct

### Parents (`/dashboard/parents`)
- [ ] Parent directory lists all entries
- [ ] Columns: Parent, Students, Email, Phone, Action
- [ ] Search works
- [ ] Stat cards show family counts

### Parent Catalog (`/dashboard/parents/catalog`)
- [ ] Grid shows blocks and enrichment options
- [ ] Color coding: School assigned (gray), Approved (green), Pending (red), Available (white)
- [ ] "Submit Selections" button visible
- [ ] Instructions and deadline visible

---

## Known Issues & Fixes Applied

Track any issues found and their resolutions here:

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| Build failed - TypeScript errors | CRITICAL | ✅ FIXED | Fixed type mismatches in dashboard, classes, students |
| Vercel deploy errors | CRITICAL | ✅ FIXED | Added Suspense boundaries for useSearchParams |
| Figma MCP URLs expired | CRITICAL | ✅ FIXED | Replaced with local `/images/` paths |
| | | | |

---

## Final Sign-Off

Once all items above are checked, the site is **100% production-ready and Figma-parity compliant**.

Date verified: ___________
Verified by: ___________
