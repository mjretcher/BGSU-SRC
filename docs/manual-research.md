# BGSU Student Rec Center — Fitness Equipment Manual Research (Exact-Model-Match)

## TL;DR
- **Of the 65 items, ~40 have a confident exact-match official/authoritative manual, ~13 are "likely-but-not-exact" (a real manual exists but the inventory code differs from the manufacturer's official code), and ~12 are "not found" or unresolvable because the inventory "model number" is actually a serial/SKU/config string, not a true product model.** The single biggest data-quality issue in this inventory is that many "model numbers" are serial or order-configuration codes.
- **Confirmed serial-vs-model traps** (do NOT treat these as models): both Concept2 rowers listed by 9-digit numbers; all four StairMaster/StarTrac "9-####-######" cardio codes; StarTrac "9IP-L8505-13AAS"; all four Nautilus "9HSFT.../9NP.../HSPL360.../HSSC360..." codes; Rogue "9NP-L1130-60BZS" (which is actually a **Nautilus**, not Rogue); Torque "041124001040"; and TKO "122023."
- **Confirmed naming discrepancies to flag** beyond the known CMACC→**CMACO**: BWBE is a **Body-Weight-series** code (not Free-Weight, and probably mislabeled "45-degree bench"); "HSLEPLT" is not a real code (use **PL-LE**); "OSLR" is not a Life Fitness code (current Olympic squat rack is **LBR-OS**); HSSM is published only as **HSSMV** (vertical); "FXT-CCVV" is missing its series letter (closest **FXTX-CCVV**); and PLLHP "Linear Hack Press" is the **PL-LHS Linear Hack Squat**.

---

## Key Findings

**Best authoritative sources, in priority order:**
1. **support.lifefitness.com** (Zendesk knowledge base) — current owner's manuals for all Life Fitness / Hammer Strength lines (PDFs attached inside each article).
2. **kb.cybexintl.com** — direct, stable PDF links for many Life Fitness/Hammer Strength/Cybex manuals (this is the same knowledge base that hosts the verified Cybex 771AT manual).
3. **support.corehandf.com** — official Core Health & Fitness portal for Nautilus / StarTrac / StairMaster / Schwinn.
4. **concept2.com** and **truefitness.com** / **shop.truefitness.com** — manufacturer sites for those brands.
5. Secondary archives accepted where the manufacturer PDF isn't directly exposed: **ManualsLib**, **Internet Archive**, **fitnesssuperstore.info**.

**Count summary**
- Exact match: **~40** (most Hammer Strength IL-/PL- codes, Concept2 Model D, Cybex 771AT, GBSL, HS-SC, HSLLP, CMDAP, MJ-CORE, SADB, True TI1000, etc.)
- Likely-but-not-exact: **~13** (CMACC/CMACO, FWFB/FW-FB, HSSM/HSSMV, PLLHP/PL-LHS, FXT-CCVV/FXTX-CCVV, Matrix R-PS/U-PS/T-5x config suffixes, SS/SS-AB, True Pendulum garbled code, StarTrac Max Rack SKU, etc.)
- Not found / unresolvable: **~12** (TKO 122023, Torque 041124001040 dumbbell rack, the four "9-####" cardio SKUs pending nameplate confirmation, HDLADJ, HOLSTOR-SA, and the Nautilus serial-coded items where the exact sub-model can't be confirmed from the serial alone).

---

## Details (by brand)

### Concept 2
| # | Inventory code | Manual found? | Direct PDF / online | Confidence | Discrepancy |
|---|---|---|---|---|---|
| 1 | 1991 Model D | Yes — official | concept2.com/support/indoor-rowers/model-d/manuals-and-schematics → "Model D/E Owners Manual (serial# 073106 to present)" PDF | **Exact match** | The Model D "was renamed 'RowErg' effective April 2021; support information for the RowErg applies to the Model D." "1991" appears to be an inventory tag, not a model year for the D (the Model D launched 2003). |
| 2 | 432156244 (Rower) | Yes (by product type) | Same Model D page | **Not exact — code is a serial number** | 432156244 is a serial, not a model. Product is a Model D / RowErg. |
| 3 | 432177567 (SkiErg) | Yes (by product type) | concept2.com/support/skierg/skierg/manuals-and-schematics → "SkiErg Product Manual" PDF | **Not exact — code is a serial number** | 432177567 is a serial. Confirm SkiErg1 vs SkiErg2 by serial range on the machine. |

### Cybex
| # | Code | Manual | Link | Confidence | Notes |
|---|---|---|---|---|---|
| 4 | 771AT Arc Trainer | Official owner's manual | kb.cybexintl.com/Owners_Manuals/Arc/5771-4_Owner's_Manual_772A_771A.pdf — "771A/771AT, 772A/772AT Arc Trainer Owner's Manual, Part No. 5771-4" (Rev G current per Life Fitness Support) | **Exact match** | Clean; single manual covers 771A/771AT and 772A/772AT. |

### Hammer Strength (a Life Fitness brand)
Two umbrella manuals cover most of these: **Iso-Lateral Owner's Manual (1000419-0001)** and **Plate Loaded Owner's Manual (1000420-0001 Rev AG)**, both on support.lifefitness.com and mirrored at kb.cybexintl.com (e.g., kb.cybexintl.com/Owners_Manuals/Strength/Hammer_Strength_Plate_Loaded_Owners_Manual.pdf). Per-machine assembly manuals are also on Internet Archive.

| # | Code / item | Manual | Confidence | Discrepancy / notes |
|---|---|---|---|---|
| 5 | BWBE (45° Bench) | Hammer Strength **Body Weight** Series Owner's Manual (support.lifefitness.com art. 4413300539543) | **Likely, not exact** | BWBE = Body-Weight-series **Back Extension**, NOT Free Weight. Inventory label "45 Degree Bench" is suspect — verify the machine. |
| 6 | FW-DR2 (Dumbbell Rack) | Hammer Strength Free Weight Series Owner's Manual (support.lifefitness.com art. 31294951801751) | **Exact match** | FW-DR2 = two-tier dumbbell rack. |
| 7 | FW-MAB (Adj. Bench) | Free Weight Series Owner's Manual | **Exact match** | LF calls it **Multi-Angle Bench** (inventory says "adjustable"). |
| 8 | FWFB (Flat Bench) | Free Weight Series Owner's Manual | **Likely, not exact** | Official code is **FW-FB** (hyphenated). |
| 9 | FWUB (90° Bench) | — | **Not found / discrepancy** | No current "FWUB" 90-degree code; docs show **FW-UB75** (75° utility). Verify machine. |
| 10 | GBSL (Squat Lunge) | Ground Base Series Owner's Manual (1000421-0001): kb.cybexintl.com/Owners_Manuals/Strength/OM_Hammer_Strength_Ground_Base_1000421-0001.pdf | **Exact match** | GBSL = Ground Base Squat Lunge, listed in manual. |
| 11 | HOLSTOR-SA (Squat Rack) | — | **Not found** | Not in HD Elite or any official roster; confirm the true code from the frame. |
| 12 | HDLADJ (Adj. Bench, yellow wheel) | HD Elite / Heavy Duty family (support.lifefitness.com art. 4421422157591) | **Not found (exact)** | HDLADJ not listed in the HD Elite manual's model roster; likely a newer/variant SKU. Flag. |
| 13 | HS-SC (Standing Calf) | Hammer **Select** Owner's Manual (9510901 Rev BC; support.lifefitness.com art. 30288253394327) | **Exact match** | HS-SC covered. |
| 14 | HSLEPLT (Leg Extension) | Plate Loaded Owner's Manual (**PL-LE**) | **Discrepancy** | "HSLEPLT" is not a real code. Plate-loaded leg extension = **PL-LE**; selectorized = **HS-LE** (Hammer Select). Decide which physical machine it is. |
| 15 | HSLLP (Linear Leg Press) | Hammer Strength Linear Leg Press Owner's Manual (8344901): fitnesssuperstore.info/pdfs/Hammer%20Strength%20Linear%20Leg%20Press%20Owners%20Manual.pdf; ManualsLib 94052 | **Exact match** | Listed under Selectorized. |
| 16 | HSSM (Smith Machine) | HS **HSSMV** Vertical Smith Machine Owner's Manual (1013955-0001): kb.cybexintl.com/Owners_Manuals/Strength/OM_HS_HSSMV_Hammer_Strength_Smith_Machine_Vertical_1013955-0001.pdf | **Likely, not exact** | HSSM (angled) ≠ HSSMV (vertical). HSSM appears in parts lists but no standalone HSSM owner's-manual PDF was located. Confirm bar angle. |
| 17 | ILBP (Iso Lateral Bench Press) | Iso-Lateral Owner's Manual + IA "ISO Lateral Horizontal Bench Press" assembly manual | **Exact match** | |
| 18 | ILDP (Iso Lateral Decline Press) | Iso-Lateral Owner's Manual | **Exact match** | |
| 19 | ILFLP (Front Lat Pulldown) | Iso-Lateral Owner's Manual | **Likely, not exact** | Manual labels this **IL-WPD** (Front Lat Pulldown). Minor code mismatch. |
| 20 | ILKLC (Kneeling Leg Curl) | IA "ISO Lateral Kneeling Leg Curl Assembly Manual" + Iso-Lateral Owner's Manual | **Exact match** | |
| 21 | ILLC (Leg Curl) | Iso-Lateral Owner's Manual | **Exact match** | |
| 22 | ILLE (Leg Extension) | fitnesssuperstore.info/pdfs/Hammer%20Strength%20ISO-Lateral%20Leg%20Extension%20ILLE%20Owners%20Manual.pdf + IA "ISO Lateral Leg Extension Rev C" | **Exact match** | |
| 23 | ILLR (Low Row) | IA "ISO Lateral High Row / DY Row" family + Iso-Lateral Owner's Manual | **Exact match** | Confirm Low Row vs High Row variant. |
| 24 | ILR (Row) | IA "ISO Lateral DY Row Assembly Manual" + Iso-Lateral Owner's Manual | **Exact match** | |
| 25 | ILSIP (Super Incline Press) | Iso-Lateral Owner's Manual + IA "ISO Lateral Incline Press Rev D" | **Exact match** | |
| 26 | ILSP (Shoulder Press) | Iso-Lateral Owner's Manual | **Exact match** | |
| 27 | ILWP (Wide Pulldown) | Iso-Lateral Owner's Manual | **Exact match** | |
| 28 | OBWS (Decline Press) | Legacy "Hammer Strength Olympic Gym Bench and Rack Systems" catalog (ManualsLib 94113) | **Likely, not exact** | OBWS = Olympic Bench Weight Storage in legacy catalog; this is a product catalog, not a full owner's manual. Modern equivalent = LBR benches. |
| 29 | OFB (Bench Press) | Legacy Olympic Gym Bench catalog (ManualsLib 94113) | **Likely, not exact** | OFB = Olympic Flat Bench (legacy naming exact; no current standalone owner's manual). |
| 30 | OIB (Incline Bench) | Legacy Olympic Gym Bench catalog | **Likely, not exact** | OIB = Olympic Incline Bench (legacy naming). |
| 31 | PL-BSQPLTPLTENGNON (Belt Squat) | Plate Loaded Owner's Manual (**PL-BSQ**) | **Likely, not exact** | Base model = **PL-BSQ**; the long suffix is a build/config string. |
| 32 | PL-GRIP (Gripper) | Plate Loaded Owner's Manual | **Exact match** | |
| 33 | PLBI (Seated Bicep) | Plate Loaded Owner's Manual (**PL-BI**); IA "Plate Loaded Seated Bicep Assembly Manual" | **Exact match** | Inventory drops the hyphen. |
| 34 | PLCALF (Seated Calf) | Plate Loaded Owner's Manual (**PL-CALF**) | **Exact match** | |
| 35 | PLLHP (Linear Hack Press) | Plate Loaded Owner's Manual (**PL-LHS**); parts: sportsmith.com PL-LHS/PL-LHS-01 | **Likely, not exact** | Official = **PL-LHS Linear Hack Squat** (not "Hack Press"). |
| 36 | PLLR (Lat Raise) | Plate Loaded Owner's Manual (**PL-LR**); IA "Plate Loaded Lateral Raise" | **Exact match** | |
| 37 | PLPO (Pullover) | Plate Loaded Owner's Manual (**PL-PO**) | **Exact match** | |

### Life Fitness
| # | Code / item | Manual | Confidence | Discrepancy / notes |
|---|---|---|---|---|
| 38 | CMACC (Cable Crossover) | Cable Motion Owner's Manual (ManualsLib 743130; fitnesssuperstore.info Cable Motion Owners Manual PDF) | **Likely, not exact** | **Manufacturer code is CMACO** (Cable Motion Adjustable Cable Crossover); nameplate reads "MODEL: CMACO." Inventory "CMACC" is a near-miss — treat as CMACO. (Note: CMCC is a different product, the Cable Column.) |
| 39 | CMDAP (Dual Action Pulley) | Cable Motion Owner's Manual (1011084-0001 Rev AC; support.lifefitness.com art. 360040578414) | **Exact match** | LF name = **Dual Adjustable Pulley** (inventory says "Dual Action"). |
| 40 | FXT-CCVV (8-Stack Cable) | Synrgy360 Owner's Manual (1002154-0001): kb.cybexintl.com/Owners_Manuals/Strength/OM_FXT_Synrgy360_1002154-0001.pdf | **Likely, not exact** | "FXT-CCVV" is missing the series letter; closest official = **FXTX-CCVV** (XS config). Manual covers FXTT/FXTX/FXTM/FXTF. |
| 41 | MJCORE (Synergy 360) | Multi Jungle Owner's Manual (support.lifefitness.com art. 360036925454) / Synrgy manuals | **Exact match** | Official = **MJ-CORE**. |
| 42 | OSLR Tower Box - PLT | LBR-OS Olympic Squat Rack Assembly Instr. (1024350-0001): kb.cybexintl.com/Assembly_Manuals/Strength/LBR_OS_1024350-0001.pdf | **Not found (as "OSLR") / discrepancy** | No "OSLR" LF code. Current Olympic squat rack = **LBR-OS**; legacy = **SOSR** (Signature). Verify which rack this is. |
| 43 | SADB-0102 (Decline Bench) | Signature Adjustable Decline Bench Owner's Manual (ManualsLib 94198; product page 7039197) | **Exact match** | Base model **SADB**; "-0102" is a config/version suffix. |
| 44 | SS (Abdominal) | Insignia Series Strength Owner's Manual (9481201 Rev BE; support.lifefitness.com art. 360043013933) | **Likely, not exact** | Insignia abdominal = **SS-AB** (standard) or **SS-ABD** (Advanced, prod. Oct 2023). Inventory "SS" is ambiguous — confirm AB vs ABD. |

### Matrix (Johnson Health Tech)
| # | Code / item | Manual | Confidence | Notes |
|---|---|---|---|---|
| 45 | R-PS (Recumbent Bike) | Matrix Performance Recumbent Cycle (R-PS-F) — manuals.plus / Matrix owner's manuals | **Likely, not exact** | R-PS = Performance-series recumbent; "-F" is a console/config suffix. |
| 46 | T-5XWF-08-C (Treadmill) | T5x Owner's Manual — content.johnsonfit.com (…/T7xi_T7xe_T5x owner's guide PDF); ManualsLib MX-T5x | **Likely, not exact** | Core model = **T5x**; "WF-08-C" is a config/console/year string. |
| 47 | U-PS (Upright Bike) | Matrix Performance Upright Cycle — Matrix owner's manuals | **Likely, not exact** | U-PS = Performance-series upright. |

### Nautilus / Rogue (all Core Health & Fitness)
| # | Code / item | Manual | Confidence | Notes |
|---|---|---|---|---|
| 48 | 9HSFT36000AAE (Freedom Trainer) | Core H&F Nautilus HumanSport Freedom Trainer Owner's Manual (ManualsLib 1963114); model **9-HSFT3 / HSFT3** | **Likely, not exact — code is a serial** | 9HSFT36000AAE is a serial/SKU; product is the HumanSport Freedom Trainer (HSFT3). |
| 49 | 9NP-L113160BZS (Glute Bridge) | Nautilus Plate-Loaded (NP-L series) — corehandf.com | **Not found (exact) — code is a serial** | Confirm the specific NP-L glute/bridge model from the frame nameplate. |
| 50 | HSPL360-L24121026 (Lift/Pull) | Nautilus HumanSport family — corehandf.com | **Not found (exact) — code is a serial** | "HSPL" = HumanSport Lift/Pull; "-L24121026" is a serial. |
| 51 | HSSC360-L24121014 (Shoulder/Chest) | Nautilus HumanSport family — corehandf.com | **Not found (exact) — code is a serial** | "HSSC" = HumanSport Shoulder/Chest; "-L24121014" is a serial. |
| 53 | Rogue 9NP-L1130-60BZS (Hack Squat) | **Nautilus** NP-L1130 Hack Squat Owner's Manual (620-8458): support.corehandf.com/Brands/Nautilus/Manuals/620-8458-NP-L1130-HackSquatOM.pdf | **Likely, not exact — brand + serial discrepancy** | This is a **Nautilus NP-L1130**, not a Rogue product. The "9…-60BZS" is a serial/config wrapper around model NP-L1130. |

### Power Lift
| # | Code / item | Manual | Confidence | Notes |
|---|---|---|---|---|
| 52 | PLTBR (T-Bar Row) | Power Lift product page (powerliftusa.com T-Bar Row); no downloadable owner's manual located | **Not found (manual)** | Power Lift does not publish a public PDF owner's manual for this; contact Power Lift for docs. (Note: a separate **Hammer Strength PL-TBR** exists but is a different manufacturer — do not substitute.) |

### Stair Master / StarTrac (Core Health & Fitness)
All four "9-####-######" codes are **Core order/config SKUs**, not serial numbers in the classic sense and not the published model names. Read the machine nameplate to confirm the true model, then pull from support.corehandf.com.
| # | Code / item | Manual | Confidence | Notes |
|---|---|---|---|---|
| 54 | 9-4580-BINTP0 (StairMaster Airdyne Bike) | Likely **Schwinn/StairMaster Airdyne AD Pro** Owner's Manual (Nautilus/Core; ManualsLib 1090370) | **Not found (exact) — SKU/config code** | There is no "StairMaster Airdyne"-branded manual; the air bike is the Schwinn Airdyne. Confirm via nameplate. |
| 55 | 9-5295-MUNBPO (Stair Master) | **StairMaster 10G** Owner's Manual, Part No. **620-8762 Rev A** — "Also for: 9-5295"; spec sheet: "SKU 9-5295 = 10G." PDF: fitnessengros.dk/…/Owners%20manual%2010G.pdf | **Likely match** | Enricher confirmed SKU **9-5295 = 10G Gauntlet stepmill**. This aligns with BGSU's own facility listing of a Stairmaster 10-Series Gauntlet. |
| 56 | 9-4550-MINTPO (StarTrac Airdyne Bike) | Likely **Schwinn Airdyne AD Pro** Owner's Manual (Nautilus/Core) | **Not found (exact) — SKU/config code** | Same as #54; StarTrac-branded Airdyne manual doesn't exist separately. Confirm nameplate. |
| 57 | 9-8100-MUNBPO (StarTrac Bike) | Likely **Star Trac 8-Series** upright/recumbent bike (8UB/8RB) — support.corehandf.com StarTrac cardio section | **Not found (exact) — SKU/config code** | "8100" suggests 8-series; confirm 8UB vs 8RB from nameplate. |
| 58 | 9IP-L8505-13AAS (StarTrac Max Rack) | **Star Trac Max Rack IP-L8505** Owner's Manual & Installation Instructions, **Part No. 620-8048, Rev A, Oct 2010** (ManualsLib 638362; fitnesssuperstore.info Max Squat Rack PDF) | **Likely, not exact** | Base model = **IP-L8505**; "9…-13AAS" is an order/color config, "9" a Core SKU prefix. Manual titled simply "IP-L8505." |

### TKO / Torque Fitness
| # | Code / item | Manual | Confidence | Notes |
|---|---|---|---|---|
| 59 | TKO 122023 (Dumbbell Rack 5-50) | None located | **Not found** | "122023" matches no TKO published model (resembles a 12/20/23 date code). TKO Strength publishes product pages, not per-SKU manuals. |
| 60 | Torque 041124001040 (Dumbbell Rack) | None located | **Not found — serial number** | 12-digit numeric (leading "041124" ≈ 04/11/24 date). Torque indexes manuals by model name; confirm the rack's model name, then use torquefitness.com/pages/assembly-manuals-and-videos. |
| 61 | XCREATE-LPD-101 (Unit Cables) | Torque **X-CREATE** assembly manuals (commercial.torquefitness.com/pages/assembly-manuals) | **Likely, not exact** | X-CREATE is modular; LPD-101 is a component/config. Match to the specific X-CREATE module PDF. |
| 62 | XCREATE-UC1-F07 (Fixed Barbells) | Torque X-CREATE assembly manuals | **Likely, not exact** | "UC1-F07" is a config within X-CREATE; the "Fixed Barbells" label suggests a storage module. Verify configuration. |
| 63 | XTTM4-PH (Torque Tank) | Torque **TANK M4** assembly manual (torquefitness.com/pages/assembly-manuals-and-videos; ManualsLib TANK) | **Likely, not exact** | "XTTM4" → TANK **M4**; "-PH" is a config/handle suffix. |

### True Fitness
| # | Code / item | Manual | Confidence | Notes |
|---|---|---|---|---|
| 64 | 25-PlS140029C (Pendulum Squat) | True **Palladium PLS-1400 Pendulum Squat** — Downloads tab at truefitness.com/products/pls-1400-pendulum-squat/ | **Likely, not exact** | Inventory code is garbled; the model is **PLS-1400**. "25" ≈ 2025, trailing chars are config/color. |
| 65 | TI1000-19 (Treadmill) | True **TI1000 "Alpine Runner" Owner's Manual, Model# TI1000** (all-guidesbox/ManualsLib 1513023; current PDF hosted at shop.truefitness.com, Rev 071221) | **Exact match** | Base model **TI1000**; "-19" is a year/config suffix. |

---

## Recommendations

**Stage 1 — Ship the confident exact matches now (~40 items).** Load the manuals for Concept2 Model D, Cybex 771AT, all Iso-Lateral (IL-) and Plate-Loaded (PL-) Hammer Strength machines, GBSL, HS-SC, HSLLP, CMDAP, MJ-CORE, SADB, and True TI1000. For Life Fitness/Hammer Strength, prefer the stable **kb.cybexintl.com** direct PDFs and the **support.lifefitness.com** articles; these are authoritative and unlikely to rot.

**Stage 2 — Resolve the "likely-but-not-exact" items by correcting the inventory codes (~13 items).** These have real manuals; the fix is a data cleanup:
- CMACC → **CMACO**; FWFB → **FW-FB**; FXT-CCVV → **FXTX-CCVV**; PLLHP → **PL-LHS**; HSSM → confirm **HSSM vs HSSMV**; SS → confirm **SS-AB vs SS-ABD**; OSLR → **LBR-OS** (or SOSR); ILFLP → **IL-WPD**; Rogue hack squat → **Nautilus NP-L1130**.
- Change the inventory brand for item 53 from **Rogue to Nautilus** — this is a straight mislabel.

**Stage 3 — Nameplate audit for the serial/SKU-coded items (~12 items).** For every "9-####-######," "9IP-…," "9NP-…," "9HSFT…," "HSPL360-…," "HSSC360-…," Torque "041124001040," and TKO "122023," send a technician to record the **model number printed on the machine's nameplate** (usually near the serial). Then:
- StairMaster #55 is already resolved: SKU **9-5295 = 10G Gauntlet** (use 620-8762). Apply the same lookup approach to #54/#56/#57 via Core Health & Fitness.
- The two "Airdyne" units are almost certainly **Schwinn Airdyne AD Pro** — confirm and use the Schwinn manual.
- StarTrac Max Rack #58 → use the **IP-L8505** manual (620-8048).

**Stage 4 — Manufacturer contact for the true gaps.** For **TKO 122023**, **Torque 041124001040**, **Power Lift PLTBR**, **HDLADJ**, **HOLSTOR-SA**, and any Nautilus item whose sub-model can't be read from the nameplate, email the manufacturer (Torque: sales@torquefitness.com; Life Fitness: 1-800-351-3737 / customersupport@lifefitness.com; Core H&F via corehandf.com; Power Lift via powerliftusa.com) with the nameplate model + serial to request the exact PDF.

**Benchmarks that change the plan:**
- If a Stage-3 nameplate reveals a model that has a dedicated manual (e.g., a specific Star Trac 8-series bike), promote that item to "exact match."
- If the manufacturer confirms a discontinued product has no surviving manual, downgrade to "not found" and record the last-known catalog/spec sheet as the best available reference.
- Treat any item still relying only on a **secondary archive** (ManualsLib/Internet Archive) as "acceptable but re-verify annually," since those URLs are less stable than manufacturer KBs.

---

## Caveats
- **Serial vs. model is the dominant risk.** At least a dozen inventory "model numbers" are serial/SKU/config strings. Any manual mapped from those is inferred from the product type/name, not from an exact model code, and must be confirmed against the physical nameplate before being treated as authoritative.
- **Legacy vs. current documentation.** OFB/OIB/OBWS appear only in an older Hammer Strength Olympic **catalog** (a product/spec document, not a full safety/maintenance owner's manual). The modern equivalents are the LBR bench/rack line; if BGSU's units are old, the legacy catalog is the closest authentic document, but it is not a full owner's manual.
- **Umbrella manuals.** Many Hammer Strength IL-/PL- "manuals" are single umbrella owner's manuals covering the whole line (e.g., 1000419-0001 for all Iso-Lateral, 1000420-0001 for all Plate-Loaded). That is authoritative and exact at the model-code level, but there is not always a separate one-machine PDF — for machine-specific assembly steps, the Internet Archive per-machine assembly manuals are the supplement.
- **Console/config suffixes** on Matrix (T-5XWF-08-C), True (TI1000-19, PLS-1400 variant), Torque (X-CREATE), and Life Fitness (SADB-0102, FXTX-CCVV) items change electronics/finish but generally not the safety/operation content, so the base-model manual is the correct authoritative document — just note the suffix in your records.
- **Two items warrant a brand correction in the source data** regardless of the manual: item 53 is a **Nautilus**, not Rogue; and the "Airdyne" bikes are **Schwinn** air bikes sold under Core's StairMaster/StarTrac umbrella.
- **Secondary sources** (ManualsLib, Internet Archive, fitnesssuperstore.info, johnsonfit CDN) were used only where the manufacturer's own PDF wasn't directly exposed; they mirror the same documents but should be periodically re-checked for link stability.
