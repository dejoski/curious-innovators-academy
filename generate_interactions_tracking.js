const fs = require('fs');

const md = `# Comprehensive Interactions Tracking

This document tracks every clickable element across the entire application, its intended action, and its current implementation status.

**Legend:**
- [x] **Implemented:** Fully reactive, state-driven, or routes correctly.
- [~] **Partially Implemented:** Has basic routing or an \`alert()\`, but needs a real modal/dropdown/state.
- [ ] **Not Implemented:** Static HTML, no interactivity yet.

---

## 1. Global Layout (Always Visible)

### Sidebar (\`src/components/Sidebar.tsx\`)
- [x] **Navigation Links (Dashboard, Schedule, Classes, etc.)**: Route to respective pages without full page reload (SPA routing).
- [ ] **Collapse/Expand Toggle**: Shrink the sidebar to icon-only mode to save screen space.
- [ ] **Accordion Submenus (Classes, Students)**: Click to expand/collapse nested navigation links.

### Dashboard Header (\`src/components/DashboardHeader.tsx\`)
- [x] **Profile Dropdown Toggle**: Click to open/close the user menu.
- [x] **Profile Menu - Account Settings**: Route to settings page or open modal.
- [x] **Profile Menu - Help & Support**: Route to support page or open modal.
- [x] **Profile Menu - Sign Out**: Clear auth state and route to \`/login\`.
- [x] **Notifications Bell**: Click to open/close the notifications panel. Shows unread badge.
- [x] **Notifications Panel - Mark all as read**: Clear unread state.
- [ ] **Notifications Panel - Individual Items**: Click to route to the specific request/event.
- [ ] **Notifications Panel - View all**: Route to a dedicated notifications page.

---

## 2. Admin: Teachers Page (\`src/app/dashboard/teachers/page.tsx\`)
*Status: Highly Interactive (Refactored)*

- [x] **Search Input**: Instantly filters the table by teacher name or subject as you type.
- [x] **"Core classes" Filter Dropdown**: Opens menu to filter by All, Core, or Enrichment.
- [x] **"Select All" Button**: Toggles the selection state of all visible rows.
- [x] **"Create Teacher" Button**: Opens the Create Teacher modal overlay.
- [x] **Create Teacher Modal - Inputs**: Focus states for Name, Subjects, Email.
- [x] **Create Teacher Modal - Cancel/X**: Closes the modal.
- [x] **Create Teacher Modal - Save**: Validates and adds teacher to the list (currently closes modal).
- [x] **Table Row Checkboxes**: Toggles individual row selection state.
- [x] **Table Row Ellipses (...)**: Opens a row-specific action dropdown.
- [x] **Row Action - Edit Teacher**: Opens Edit modal populated with teacher data.
- [x] **Row Action - View Schedule**: Routes to teacher's schedule view.
- [x] **Row Action - Message**: Opens messaging modal.
- [x] **Row Action - Remove**: Opens confirmation dialog to delete teacher.
- [x] **Pagination (Arrows & Numbers)**: Dynamically changes the visible table data.
- [~] **"Upload to Spreadsheet"**: Triggers CSV download (currently alerts).

---

## 3. Admin: Students Page (\`src/app/dashboard/students/page.tsx\`)
*Status: Partially Interactive*

- [x] **Search Input**: Instantly filters the table by student or parent name.
- [x] **"Select All" Button**: Toggles the selection state of all visible rows.
- [x] **Table Row Checkboxes**: Toggles individual row selection state.
- [x] **Student Name Link**: Routes to the specific Student Profile (\`/students/[id]\`).
- [x] **Top Stat Cards (Total, Scheduled, etc.)**: Click to filter the table by that status.
- [~] **Filter Dropdowns (Core, Schedule Status)**: Opens filter menus (currently alerts).
- [~] **"Create Student" Button**: Opens Create Student modal (currently alerts).
- [~] **Table Row Ellipses (...)**: Opens row-specific action dropdown (currently alerts).
- [~] **Pagination (Arrows & Numbers)**: Changes table page (static UI, needs state logic).
- [~] **"Upload to Spreadsheet"**: Triggers CSV download (currently alerts).

---

## 4. Admin: Student Profile (\`src/app/dashboard/students/[id]/page.tsx\`)
*Status: Static UI*

- [ ] **"Edit Profile" Button**: Opens a modal to edit student details.
- [ ] **History Filter Buttons (All, Academic, Behavioral)**: Filters the timeline events.
- [ ] **"Add Note" / "Add Record" Button**: Opens modal to append a new event to the timeline.
- [ ] **Parent Name Link**: Routes to the Parent's profile.
- [ ] **Class Badges**: Routes to the specific Class Details page.

---

## 5. Admin: Classes Pages (Core, Enrichment, Approvals, Requests)
*Status: Static UI*

- [ ] **Search Inputs**: Filter the respective tables.
- [ ] **Filter/Sort Dropdowns**: Open menus to filter by Grade, Status, etc.
- [ ] **"Add Class" Button**: Opens the Create Class modal.
- [ ] **Table Row Ellipses (...)**: Opens action menu (Edit, View Roster, Delete).
- [ ] **Class Name Links**: Route to the Class Details page.
- [ ] **Pagination**: Change table pages.
- [ ] **Requests/Approvals - "Approve" Button**: Updates request status to Approved.
- [ ] **Requests/Approvals - "Reject" Button**: Updates request status to Rejected.
- [ ] **Requests/Approvals - Bulk Actions**: Approve/Reject multiple selected rows at once.

---

## 6. Admin: Parents Page (\`src/app/dashboard/parents/page.tsx\`)
*Status: Static UI*

- [ ] **Search Input**: Filters parents table.
- [ ] **Filter Dropdowns**: Opens filter menus.
- [ ] **"Select All" Button**: Toggles bulk selection.
- [ ] **Table Row Ellipses (...)**: Opens action menu (Edit, Message, View Students).
- [ ] **Pagination**: Change table pages.

---

## 7. Admin: Schedule (\`src/app/dashboard/schedule/page.tsx\`)
*Status: Static UI*

- [ ] **View Toggles (Month, Week, Day)**: Switches the calendar layout.
- [ ] **Date Navigation (<, >, Today)**: Changes the current date range.
- [ ] **Event Badges (in calendar cells)**: Click to open Event Details popover/modal.
- [ ] **Empty Calendar Slot Click**: Opens "Create Event" modal pre-filled with that date/time.

---

## 8. Parent Dashboard: Catalog & Classes
*Status: Static UI*

- [ ] **Catalog - Class Cards**: Click to open Class Details modal (description, teacher, prerequisites).
- [ ] **Catalog - "Select as 1st Choice"**: Adds class to student's primary request list.
- [ ] **Catalog - "Select as 2nd Choice"**: Adds class to student's backup request list.
- [ ] **Catalog - "Submit Selections"**: Finalizes and sends requests to Admin Approvals.
- [ ] **Classes List - Search/Filter**: Filters the parent's view of classes.

---

## 9. Authentication (\`src/app/login/page.tsx\`)
*Status: Partially Interactive*

- [x] **"Start your journey" (Login) Button**: Routes to \`/dashboard\`.
- [ ] **Email Input**: Focus states, typing, validation formatting.
- [ ] **Password Input**: Focus states, typing, validation.
- [ ] **Password Visibility Toggle (Eye Icon)**: Switches password input between \`text\` and \`password\`.
- [ ] **"Forgot password" Link**: Routes to password reset flow.
`;

fs.writeFileSync('INTERACTIONS_TRACKING.md', md);
console.log('Generated INTERACTIONS_TRACKING.md');
