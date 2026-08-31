-- Enforce at most one OPEN downtime event per piece of equipment.
--
-- POST /api/downtime checked for an existing open event and then created a new
-- one as two separate statements, with no transaction and nothing in the schema
-- to fall back on. Two concurrent reports on the same machine both passed the
-- check and both inserted. The failure was quiet rather than loud: the panel
-- closes the FIRST open event it finds and sets the equipment back to
-- IN_SERVICE, so the survivor stayed open forever while metrics kept billing it
-- to now -- a machine reading as in-service while its downtime grew without
-- bound in every report and export.
--
-- Prisma's schema language cannot express a partial unique index, so this is
-- raw SQL. The model in schema.prisma carries a comment pointing here.

-- Existing duplicates would make CREATE UNIQUE INDEX fail, so resolve them
-- first. Keep the earliest open event per machine (the original report) and
-- close each later duplicate at its own openedAt. A zero-length span is the
-- honest representation: it was a duplicate record, not an additional outage,
-- so it contributes no downtime and no event count to any period.
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "equipmentId" ORDER BY "openedAt" ASC, "id" ASC) AS rn
  FROM "DowntimeEvent"
  WHERE "closedAt" IS NULL
)
UPDATE "DowntimeEvent" AS d
SET "closedAt"  = d."openedAt",
    "notes"     = COALESCE(d."notes" || ' ', '') || '[auto-closed by migration: duplicate open event, superseded by the earlier report]',
    "updatedAt" = CURRENT_TIMESTAMP
FROM ranked AS r
WHERE d."id" = r."id"
  AND r.rn > 1;

CREATE UNIQUE INDEX "DowntimeEvent_one_open_per_equipment"
  ON "DowntimeEvent" ("equipmentId")
  WHERE "closedAt" IS NULL;
