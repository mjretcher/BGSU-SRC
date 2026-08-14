-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('IN_SERVICE', 'DOWN_REPORTED', 'DOWN_PARTS_ORDERED', 'DOWN_AWAITING_VENDOR', 'DOWN_SCHEDULED', 'DOWN_AWAITING_REPLACEMENT', 'RETIRED');

-- CreateEnum
CREATE TYPE "CauseCategory" AS ENUM ('MOTOR_MECHANICAL', 'BELT_DRIVE_CHAIN', 'ELECTRICAL_POWER', 'ELECTRONICS', 'SOFTWARE_FIRMWARE', 'HYDRAULIC_PNEUMATIC', 'CABLE_PULLEY', 'FRAME_STRUCTURAL', 'VANDALISM_MISUSE', 'UNKNOWN_OTHER');

-- CreateEnum
CREATE TYPE "BuildingLevel" AS ENUM ('ENTRY', 'BALCONY', 'LOWER_2');

-- CreateEnum
CREATE TYPE "IconCategory" AS ENUM ('TREADMILL', 'ELLIPTICAL', 'BIKE', 'ROWER_SKI', 'STAIR_CLIMBER', 'ARC_TRAINER', 'CURVED_TREADMILL', 'BENCH', 'RACK_SMITH', 'LEG_MACHINE', 'CABLE_PULLEY', 'SELECTORIZED_UPPER', 'DUMBBELL_RACK', 'FUNCTIONAL_TOOL', 'SPECIALTY');

-- CreateEnum
CREATE TYPE "ManualMatch" AS ENUM ('EXACT', 'LIKELY', 'NOT_FOUND', 'NEEDS_NAMEPLATE', 'UNREVIEWED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rawItemName" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "modelNote" TEXT,
    "serial" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "zone" TEXT NOT NULL,
    "level" "BuildingLevel" NOT NULL,
    "mapX" DOUBLE PRECISION,
    "mapY" DOUBLE PRECISION,
    "iconCategory" "IconCategory" NOT NULL DEFAULT 'SPECIALTY',
    "vendor" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "cost" DECIMAL(10,2),
    "warrantyMonths" INTEGER,
    "warrantyExpiresAt" TIMESTAMP(3),
    "manualUrl" TEXT,
    "manualPdfUrl" TEXT,
    "manualMatch" "ManualMatch" NOT NULL DEFAULT 'UNREVIEWED',
    "manualComment" TEXT,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "retiredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DowntimeEvent" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "status" "EquipmentStatus" NOT NULL,
    "cause" "CauseCategory" NOT NULL DEFAULT 'UNKNOWN_OTHER',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "repairCost" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DowntimeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL,
    "cost" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_itemId_key" ON "Equipment"("itemId");

-- CreateIndex
CREATE INDEX "Equipment_level_status_idx" ON "Equipment"("level", "status");

-- CreateIndex
CREATE INDEX "Equipment_brand_idx" ON "Equipment"("brand");

-- CreateIndex
CREATE INDEX "DowntimeEvent_equipmentId_openedAt_idx" ON "DowntimeEvent"("equipmentId", "openedAt");

-- CreateIndex
CREATE INDEX "DowntimeEvent_closedAt_idx" ON "DowntimeEvent"("closedAt");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_equipmentId_date_idx" ON "MaintenanceRecord"("equipmentId", "date");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "DowntimeEvent" ADD CONSTRAINT "DowntimeEvent_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
