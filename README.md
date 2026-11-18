# MontX Construction Management

## Visual refresh · Industrial Modern

The shared visual system now uses a construction-inspired charcoal, slate and safety-amber palette.

| Role | Light mode | Dark mode |
|---|---|---|
| App background | `#F4F6F8` | `#0B1220` |
| Surface | `#FFFFFF` | `#121C2B` |
| Raised surface | `#EEF2F6` | `#182536` |
| Primary text | `#17212F` | `#F1F5F9` |
| Secondary text | `#475569` | `#CBD5E1` |
| Brand accent | `#D97706` | `#FBBF24` |
| Success | `#15803D` | `#4ADE80` |
| Borders | `#DCE3EA` | `#26364A` |

DM Sans is used for interface text and Manrope for headings. The shared token layer keeps the sidebar, cards, tables, forms, charts and controls consistent across every module. Dark mode uses its own desaturated surfaces and accessible text tones rather than simply inverting the light theme.

Motion is intentionally restrained: staggered dashboard entrances, subtle card lift, responsive button feedback and a live-status pulse. Transform/opacity-based transitions and `prefers-reduced-motion` support keep the interface comfortable and responsive.


Fresh HTML5 + CSS3 + Bootstrap 5 + JavaScript starter.

## Design palette

| Role | Light theme | Dark theme |
|---|---|---|
| Page background | `#E0E7FF` → `#FBCFE8` gradient | `#0F172A` → `#312E81` gradient |
| Glass surface | `rgba(255,255,255,.60)` | `rgba(255,255,255,.08)` |
| Glass border | `rgba(255,255,255,.80)` | `rgba(255,255,255,.18)` |
| Primary text | `#0F172A` | `#F1F5F9` |
| Secondary text | `#334155` | `#CBD5E1` |
| Muted text | `#475569` | `#94A3B8` |
| Accent | `#4F46E5` | `#818CF8` |
| Button text | `#FFFFFF` | `#0F172A` |
| Shadow | `rgba(31,38,135,.15)` | `rgba(0,0,0,.40)` |


## Included
- Light and dark themes with saved preference
- Responsive modern left sidebar
- Glassmorphism cards and dynamic motion
- Bootstrap 5.3 and Bootstrap Icons
- Chart.js cash-flow sample chart

Open `index.html` directly or use VS Code Live Server. Dashboard values are demonstration data only. Authentication, persistent database, payroll, stock and real automatic workflows are not connected in this UI starter yet.


## Stage 2: Sites module
Open `sites.html` to manage sites. Add, edit, search, filter and delete sites. Data persists in browser localStorage for this prototype only. It is not shared across devices/users and is not yet backed by a server/database. Do not use this prototype as the sole record store for live business data.


## Stage 3: Vendor Management
Open `vendors.html` to register vendors, edit rates, assign multiple existing sites, search/filter vendors and view summary counts. Vendor records are stored in browser localStorage for this prototype. No individual worker profiles are created. The current rate fields are not yet connected to attendance/payroll history; the backend stage must preserve rate snapshots for historical calculations.


## Stage 4: Labour Attendance
Open `attendance.html` to record date, site, vendor, Karigar count and Majur count. Counts accept increments of 0.5. Amounts are calculated from the vendor rates at save time, and those rates are copied into the attendance record so later vendor rate edits do not change the saved amount. Filter by date, site and vendor. This prototype stores data in browser localStorage only; it is not multi-user or server-backed. Editing an old entry recalculates it using the vendor's current rate, so avoid editing historical entries after rate changes until the backend/rate-history stage is implemented.


## Attendance update: shifts and extra hours
Karigar and Majur each have a quantity, shift multiplier (Full Day 1, Half Day 0.5, Double Shift 2, Overtime 1.5), and extra hours. A normal day is 9 hours. Hourly rate = saved daily rate ÷ 9. Amount = count × daily rate × shift multiplier + extra hours × hourly rate. Attendance records snapshot rates and calculated amounts.

## Stage 5: Salary & Payments
Open `salary.html` for monthly vendor/site breakdown, attendance earnings, Karigar/Majur day totals, extra hours, withdrawals/advances, salary payments, outstanding balance and vendor/site-wise Hisab Statement PDF export. Both withdrawals and payments reduce the balance. Extra-hours earnings are already included in attendance amount. This is a browser-local prototype, not a shared server database; it does not yet include approval/audit workflows or automatic balance carry-forward.


## Stage 6: Inventory and navigation
The Labour & Attendance filters now preserve the selected date/site/vendor while refreshing option lists, fixing the issue where selections were reset during rendering. Main navigation links connect Overview, Sites, Vendors, Attendance, Salary and Inventory. Shared app JavaScript now safely handles pages without optional dashboard or mobile controls.

Inventory supports a material catalogue, unit and low-stock threshold, godown/site balances, purchase receipts, issues/consumption, and site-to-site transfers. Transfers are recorded as one movement that deducts the source and credits the destination. Stock is calculated from the movement ledger; insufficient source stock is blocked. Storage is local to this browser (`montx-inventory-items-v1` and `montx-inventory-movements-v1`). Inventory opening balances must be entered as a Purchase / Receive movement into Main Godown or a site. This is not yet a central multi-user database.

## Inventory frontend fixes
- Inventory filters now include material search, location, and movement date range (From / To).
- The date range filters the movement history; the stock-by-location table always shows the current live balance.
- Material details (name, unit, low-stock threshold) can be edited from the stock table.
- Stock quantity is editable for Main Godown and each site. Saving a correction creates an auditable stock-adjustment movement instead of overwriting or deleting earlier transactions.
- Broken Expenses and Reports sidebar links were removed until those modules are implemented.

## Unified sidebar navigation update
- All six pages now use the same sidebar markup, order, icons, spacing, support card and admin footer.
- Overview appears exactly once. Projects & Sites now links to `sites.html` instead of a placeholder anchor.
- Every sidebar destination is a real page: Overview, Projects & Sites, Vendors, Labour & Attendance, Salary & Payments and Inventory.
- The active page is highlighted consistently and marked with `aria-current="page"`.
- Salary now includes the same mobile sidebar toggle and DM Sans font as the other pages. The sidebar can scroll on shorter screens.
- The non-functional Settings placeholder link was removed rather than leaving a dead `#` link.

## Stage 7: Expenses and Project Cost Reporting
Open `expenses.html` to record both project income and expenses. Each entry stores date, optional site, entry type, category, description, amount, optional client/payee, receipt/payment mode, reference and notes. Income categories include client payments, project advances, milestone payments, reimbursements, material sales and other income. Legacy records without an entry type continue to be treated as expenses. Records can be edited, deleted, searched, filtered by date range/site/category and opened as a print-ready PDF register (choose Save as PDF in the print dialog). Both income and expense data remain in browser localStorage under `montx-expenses-v1`.

Open `reports.html` for a date-range and site-filtered project financial report. Labour cost is calculated from saved attendance record amounts; other expenses and income are calculated from the Stage 7 register. Total project cost = labour + other expenses. Net balance = income received − total project cost. The report provides total cost, total income, net balance, labour cost, other expenses, site-wise financial balances, expense-category totals, income-source totals and detailed records in a print-ready report (choose Save as PDF in the print dialog).

**Cost accounting rules:** Salary withdrawals/advances and salary payments are not added to project cost because labour cost is already counted from attendance earnings. Do not enter those salary settlements again in Expenses. Inventory stock movements currently store quantities but not purchase prices, so inventory is not included in rupee project-cost totals. Record material invoices in Expenses when they are incurred; stock quantity movements remain in Inventory. The expense and report modules use browser-local storage only and are not shared between devices or users.

The common sidebar now includes Expenses & Income and Project Cost Report on every page. These links point to the new modules and the current page receives the active navigation state.

## Stage 7 income tracking and PDF export
- Expenses now supports both Income and Expense entries in the same register.
- Summary cards show Total Income, Total Expenses, Net Balance (Income − Expenses) and Total Entries. All totals follow the active date, site and category filters.
- Income and expense entries can be added, edited, deleted and included in the formatted PDF register. Each entry type has its own relevant category list.
- Project Cost Report now includes project income and site-wise net financial balance. Net balance is Total Income − (Labour Cost + Other Expenses).
- Existing expense records are preserved and automatically treated as Expense entries; no old localStorage data is deleted or migrated destructively.
- PDF export uses the browser's native print engine in a new report tab. In the print dialog choose **Save as PDF** (A4). The canvas-based html2pdf/html2canvas path has been removed to avoid blank-canvas failures.


## PDF statement and report exports
- Salary & Payments: choose exactly one month, one vendor and one site, then use **Save Hisab PDF**. The statement follows the supplied Party Hisab Statement layout: vendor/site/mobile/rates header, total party calculation, total withdrawals, final balance payable, attendance breakdown and withdrawal breakdown. If salary payments exist, they appear in a separate payment section and are also deducted from the final payable.
- Vendor mobile is an optional field in Vendor Management. Existing vendor records remain valid; the statement displays `Not provided` until a mobile number is entered.
- A site-specific statement includes only withdrawals/payments explicitly assigned to that site. Transactions marked `Not site-specific` are not silently attributed to a site.
- Expenses & Income and Project Cost Report open formatted print-ready reports using their current filters; choose **Save as PDF** in the browser print dialog. CSV export controls have been removed from the application.
- Salary, Expense Register and Project Cost Report all use the same native browser print-to-PDF helper. No canvas capture or external PDF library is used.


### Print-to-PDF usage
- Click **Save Hisab PDF** or **Print / Save PDF**. MontX opens a new print-ready tab and opens the browser print dialog automatically. If it does not appear, click the **Print / Save PDF** button in the report tab or press Ctrl+P.
- In the Destination/Printer dropdown choose **Save as PDF**, keep Paper size **A4**, then click **Save**.
- If the print tab does not open, allow pop-ups for your local MontX address (for example `127.0.0.1`) and retry.
- PDF export no longer depends on html2pdf/html2canvas or a PDF CDN.


## A4 PDF print layout fix
- All print-ready PDFs are constrained to a centered 188mm content width on A4 portrait pages, leaving safe left/right gutters even when the browser print dialog uses zero margins.
- The print stylesheet no longer removes the paper max-width. Report content and tables are constrained to the page width, with fixed column proportions and word wrapping for long vendor, site, description and remark fields.
- Salary Hisab has explicit column widths for Attendance and Withdrawals tables and a responsive header/summary layout. Expenses and Project Cost reports also use page-specific column widths.
- Choose A4 in the browser print dialog. The report remains inside the safe page area regardless of the browser margin setting.

## Stage 8: Data & Backup
- Added `data.html` and `assets/js/data-center.js` for full workspace JSON backup, backup preview, and restore.
- Backups include all MontX business data keys: sites, vendors, attendance, salary transactions, inventory materials, inventory movements, and income/expenses. Theme preference remains local to the browser.
- Restore validates the backup format and data arrays before asking for confirmation. It then replaces the current records with the backup records and reloads the page.
- Added a local activity trail (up to 300 entries) for changes to tracked modules. It records additions, deletions, and updates by comparing saved record collections. Activity history starts with this version and cannot reconstruct earlier changes.
- Added a Data & Backup sidebar link across all workspace pages.
- Important limitation: this remains a single-browser localStorage prototype. Activity history is not a secure multi-user audit log and does not identify individual users. Download backups regularly; clearing browser site data can remove the workspace.


## Stage 9: Performance Dashboard and Dropdown Styling
- Added `performance.html` with vendor-wise labour cost ranking and site-wise financial comparison.
- Filters: date range, site and vendor.
- Metrics include saved attendance earnings, shift-weighted Karigar/Majur days and net site balance.
- PDF uses the existing browser-native print helper.
- Standardized native select controls, option colours, focus states and Bootstrap dropdown menus across light/dark themes.
- Performance figures are calculated from saved attendance and income/expense entries; salary withdrawals and payments are excluded to avoid double-counting labour.


## Fix update: dropdown arrows, attendance form and button formatting
- **Dropdown arrow bug fixed.** Page-level `background:` shorthands on `.form-control,.form-select` reset `background-repeat` to `repeat`, so the arrow tiled across Status, Site, Vendor and Shift fields. `assets/css/style.css` now forces one non-repeating arrow (separate light/dark colours) on every `select`, on all pages.
- **Attendance form** (`attendance.html`, `assets/js/attendance.js`):
  - *No. of Karigar* and *No. of Majur* are now dropdowns from 0 to 100.
  - The form is wider (up to 1080px), with Date / Site / Vendor on one row, Karigar and Majur cards side by side, larger text, and a clean single-column layout on phones.
  - Records saved earlier with a half count (e.g. 2.5) stay selectable when edited, so editing never silently changes the count.
  - Editing an old record that has no shift value now defaults to Full Day (it previously showed ₹0.00 and would have saved a zero amount).
  - Editing a record whose site is no longer Active keeps that site selected; new entries still list Active sites only.
  - The edit dialog is titled *Edit attendance entry* with an *Update attendance* button.
  - The *Karigar days* and *Majur days* summary cards now show real totals (count × shift multiplier, same rule as Salary and Performance). They previously always showed 0.
  - Changes made in another browser tab are reloaded before saving, so one tab cannot overwrite the other's records.
- **Buttons:** Cancel and Save now share the same size, weight and shape in every modal (Cancel was 16px next to a 10px Save on Vendors, Expenses, Inventory and Salary).
- **Vendors:** site checkboxes are vertically aligned with their labels.
- `attendance.js` is now formatted for readability (the other scripts are unchanged).


## Stage 9: Industrial Modern UI refresh
- Replaced the indigo/rose theme with a charcoal/slate/safety-amber visual identity.
- Refined both light and dark palettes through shared CSS tokens.
- Updated typography to DM Sans + Manrope.
- Polished navigation, metric cards, tables, forms, buttons, surfaces and responsive spacing.
- Added staggered entrance motion, hover/press feedback and a restrained live-status pulse.
- Added reduced-motion support. Existing HTML structure, JavaScript workflows, localStorage keys and business calculations are preserved.


## Shared dropdown and menu consistency update
- Standardised every native select control across all ten HTML pages with the same light/dark styling, focus ring, spacing, arrow, and disabled state.
- Replaced the one-off Sites and Vendors filter-select styles with the shared `.form-select` component.
- Unified Bootstrap action menus with consistent surface, border, shadow, spacing, hover, keyboard-focus and entry animation.
- Fixed the Sites card action menu layering by raising the active card while its dropdown is open; the menu now sits above adjacent cards.
- Added an accessible site-specific action label, button type, expanded-state semantics and viewport-aware dropdown boundary.


## Responsive dropdown and form update
- All single-select fields use the shared MontX custom dropdown component (`assets/js/custom-select.js`).
- Dropdown menus use the same theme-aware surface, selected state, hover state, and keyboard controls on every page.
- Native select values remain the form data source; dynamically populated options are observed.
- Form fields and modal layouts are constrained to the viewport for laptop, tablet, and mobile widths.
