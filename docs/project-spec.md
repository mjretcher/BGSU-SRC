# BGSU Student Recreation Center — Equipment Tracker
### Project Spec v1 — FINAL for build. Build environment: Claude Code (not this chat).

Repo: `mjretcher/BGSU-SRC` · Deploy: GitHub → Vercel

---

## Before starting in Claude Code

These files exist but live outside the repo right now — add them before the build session starts:

1. **Equipment inventory** — `Master_Inventory_SRC_Equipement.xlsx` (208 rows). Add to repo as `data/equipment-inventory.xlsx`.
2. **Manual research report** — the exact-model-match research on all 65 brand/model combinations (see §10). Export/save it into the repo as `docs/manual-research.md` so Claude Code has it without re-running the research.
3. **Floor plan source images** — see §9. These are pulled live from bgsu.edu; Claude Code should fetch and save them into the repo (e.g. `public/floorplans/`) rather than hotlinking BGSU's CDN long-term.

## 1. Purpose

Leadership needs to know, for every piece of equipment in the facility, what percentage of the year it was out of service and what it cost to repair — so decisions about what gets replaced are based on data instead of whoever complained loudest. Secondary goals: track warranty and manuals per piece of equipment, and map equipment to physical locations across the facility.

## 2. Users & Access

- 2–3 users total, all with identical permissions (no admin/view-only split)
- Any user can log a downtime event directly — no approval routing

## 3. Tech Stack

Matches the pattern used across Mike's other apps, for consistency:

| Layer | Choice |
|---|---|
| Framework | Next.js + TypeScript |
| ORM / DB | Prisma + Postgres (Neon) |
| Auth | Custom — see §12 |
| Hosting | Vercel |
| File storage | Vercel Blob (manuals, floor plan images, warranty docs) |

**Confirmed:** BGSU-SRC gets its own brand-new, fully isolated Neon project — separate from every other app, including the shared org used elsewhere. Nothing shared: not the database, not the auth store, not the Vercel project.

## 4. Data Model (high level)

- **Equipment** — name, item name (raw), icon category (§9), model #, serial #, brand, building level, zone, location (x/y on the level's map), vendor, purchase date, cost, warranty length/expiration, manual (PDF + link), status
- **DowntimeEvent** — equipment ref, status (§5), cause category (§6), opened at, closed at, repair cost, notes
- **MaintenanceRecord** — equipment ref, date, notes, cost (optional) — separate table from DowntimeEvent, excluded from downtime % by default (see §7)
- **Warranty** — derived from Equipment fields; surfaced via banner + dedicated report
- **AuditLog** — actor, action, target, timestamp, before/after — every status change and edit, not just logins

## 5. Downtime Status Workflow

| Status | Meaning |
|---|---|
| In Service | Normal/up |
| Down – Reported / Diagnosing | Just logged, cause unknown yet |
| Down – Parts Ordered | Diagnosed, waiting on parts |
| Down – Awaiting Vendor/Technician | Waiting on outside service |
| Down – Scheduled for Repair | Fix is scheduled |
| Down – Awaiting Replacement Decision | Not worth repairing, pending leadership call |
| Retired / Permanently Removed | Pulled from floor — stops counting toward future uptime, stays in historical record |

## 6. Cause Categories (tagged per event)

Motor/Mechanical · Belt/Drive/Chain · Electrical/Power · Electronics (console/display/sensors) · Software/Firmware · Hydraulic/Pneumatic · Cable/Pulley · Frame/Structural · Vandalism/Misuse · Unknown/Other

## 7. Metrics & Calculations

- **% Downtime** — (total days in a Down status ÷ days in period) × 100, per equipment. Routine maintenance is tracked separately and **excluded** from this number by default, with an option to include it in a report view.
- **Repair Cost** — logged per event *and* rolled up into a running total per machine.
- **MTTR** (Mean Time To Repair) — average duration of closed downtime events, per machine and fleet-wide.
- **MTBF** (Mean Time Between Failures) — average time between the close of one downtime event and the start of the next, per machine.
- **Auto-flag threshold** — any equipment crossing **5% downtime** (evaluated on a trailing 12-month basis, so it doesn't silently reset on Jan 1) gets flagged for replacement review.

*Open assumption, confirm during build: "Annual" reports default to calendar year; the 5% auto-flag itself runs on a rolling trailing-12-month basis regardless of which report period is being viewed.*

## 8. Reporting & Exports

- Per-machine visual: **calendar heatmap** (days down at a glance) and **timeline bar** (incident-by-incident view)
- Fleet-wide sortable table: % downtime, repair cost, MTTR, MTBF — sort/filter to find the worst offenders fast
- Pullable by week, month, year-to-date, and annual
- Exportable to **PDF, Excel, and raw CSV**
- Dedicated warranty report — everything active, expiring soon, or expired
- Full audit trail view — every status change and edit, who and when

## 9. Facility Map — CONFIRMED: 3 levels, not 2

BGSU's own facilities page (bgsu.edu/recwell/student-recreation-center/facilities) shows the building has 4 levels total; equipment lives on 3 of them. Zone tags in the inventory map to levels as follows:

| Inventory zone | Building level | Count | Notes |
|---|---|---|---|
| Weight Floor | **Entry Level** | 103 | "Weight/Strength Area" — plate-loaded, free weights, Insignia selectorized |
| Cardio deck | **Balcony** | 97 | "Balcony/Cardio Area" |
| Functional Training Room | **Lower Level II** | 6 | "Functional Training Studio" |
| Weights/Strength | **Lower Level II** (best guess) | 2 | Likely the "Private Personal Training Studio" (Hammer Strength squat rack + Nautilus Freedom Trainer) — confirm on-site |

Lower Level I (pools, locker rooms) has no tracked equipment — no map needed there.

**Floor plan source:** BGSU's facilities page hosts actual tabbed floor maps labeled "Map Images for Web," one per level:
- Entry Level: `https://www.bgsu.edu/content/dam/BGSU/recreation-and-wellness/images/SRC/src-entry-2025.jpg`
- Balcony: `https://www.bgsu.edu/content/dam/BGSU/recreation-and-wellness/images/SRC/src-balcony-2025.jpg`
- Lower Level I: `https://www.bgsu.edu/content/dam/BGSU/recreation-and-wellness/images/SRC/src-lower1-2025.jpg`
- Lower Level II: `https://www.bgsu.edu/content/dam/BGSU/recreation-and-wellness/images/SRC/src-lower2-2025.jpg`

Use Entry/Balcony/Lower-Level-II as the base map images for pin placement. Verify these are genuine floor-plan diagrams (not just decorative photography) before building pin-coordinate logic on top of them — pull them down and eyeball them first.

**Map behavior:**
- Clickable pins — click a piece of equipment to see its live status and history
- Color-coded by status (in service vs. down vs. which down-substatus)
- Icon per equipment category (below) — **custom illustrated icons**, not hosted manufacturer photography (copyright reasons — see confirmed decision below). Reference real manufacturer product photos for shape/silhouette accuracy when illustrating each category, but the shipped asset must be an original illustration.

**Icon category set** (derived from the 208-item inventory, 107 raw item names collapsed into a workable icon set):

Treadmill · Elliptical · Bike (upright/recumbent/airdyne) · Rower/Ski Erg · Stair/Climber · Arc Trainer · Curved Treadmill · Bench (adjustable/flat/decline/incline) · Squat Rack/Smith/Hack · Leg Machine (press/extension/curl/calf) · Cable/Pulley · Selectorized Upper Body · Dumbbell/Weight Rack · Functional Training Tool · Specialty/Other

## 10. Warranty & Manuals

- Warranty alerts staged at **30/60/90 days** before expiration — in-app banner, plus the standalone warranty report
- Manuals: **strict exact-model-number matching only** — no assumptions or substitutions. Every manual gets stored/linked as both a **searchable PDF** and a **link to the manufacturer's online manual**.
- Manual research for all 65 distinct brand+model combinations in the inventory is complete (`docs/manual-research.md`) — roughly 40 exact matches ready to load as-is, ~13 "likely, not exact" matches with a documented code discrepancy (e.g., inventory says CMACC, manufacturer says CMACO), and ~12 items where the inventory "model number" is actually a serial/SKU and needs a physical nameplate check before a manual can be attached with confidence.
- When new equipment is added later, the app should offer to **search the web for the manufacturer's manual** based on brand/model and present it for confirmation before saving — assist, not blind auto-save.

## 11. Notifications

**Email only, confirmed.** No web push for v1. Threshold flags (5% downtime) and warranty alerts (30/60/90 days) go out by email.

## 12. Auth

Custom-built, mirroring the pattern from Walden A/B (logic only — none of its theme/branding, and a fully separate database):
- Email + password, hashed with `scrypt` (salted, timing-safe compare)
- Signed HMAC session cookie, no session table
- Fixed daily expiration rather than a rolling idle timer
- Per-account and per-IP rate limiting on login
- CSRF origin-check on mutating API routes
- Every login/logout, success or fail, hits the audit log

## 13. Design Direction

**High-end visual design** — modern, premium-agency feel. Own brand and theme; nothing carried over from Walden A/B or Kitchen visually.

## 14. Deferred to v2 (explicitly out of v1 scope)

QR code per equipment item · dedicated mobile-first quick-log flow (the app will still be responsive/usable on a phone by default — this is about a specifically optimized on-the-floor logging experience) · replacement-priority score (downtime % + cost + age combined) · photo attachment per downtime event · vendor/technician log per repair · "still open" staleness alerts · public-facing known-issues status screen

## 15. Data Cleanup — apply AFTER initial import, not before

Import the 208-row inventory as-is first. Then apply these corrections, all surfaced by the manual research pass:

- **Item #53 (Hack Squat) is mislabeled "Rogue" — it's actually Nautilus** (NP-L1130). Fix the brand field.
- **Model code corrections** for items with a "likely, not exact" manual match: CMACC → CMACO, FWFB → FW-FB, FXT-CCVV → FXTX-CCVV, PLLHP → PL-LHS, OSLR → LBR-OS (verify), plus several others listed in `docs/manual-research.md`.
- **Nameplate audit needed** for ~12 items where the spreadsheet's "model number" is actually a serial/SKU/config string (StairMaster/StarTrac "9-####-######" codes, several Nautilus "9NP-/9HSFT-/HSPL360-/HSSC360-" codes, Torque and TKO numeric codes). Someone needs to physically check the nameplate on these machines before an exact manual can be attached.

## 16. Open assumption still needing a final call

- "Annual" reports default to calendar year vs. the 5% auto-flag running on a rolling trailing-12-month basis regardless of viewed period (see §7) — proceed with this as the default unless told otherwise.

---

Spec is locked. Build proceeds in Claude Code from here.
