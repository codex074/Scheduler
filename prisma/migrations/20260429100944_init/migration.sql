-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT NOT NULL,
    "pha_id" TEXT NOT NULL,
    "date_of_birth" DATETIME NOT NULL,
    "pregnancy_status" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schedule_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "shift_type" TEXT NOT NULL,
    CONSTRAINT "shift_assignments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shift_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "team_members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "team_members_nickname_key" ON "team_members"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_pha_id_key" ON "team_members"("pha_id");

-- CreateIndex
CREATE UNIQUE INDEX "public_holidays_date_key" ON "public_holidays"("date");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_year_month_key" ON "schedules"("year", "month");

-- CreateIndex
CREATE INDEX "shift_assignments_schedule_id_date_idx" ON "shift_assignments"("schedule_id", "date");

-- CreateIndex
CREATE INDEX "shift_assignments_member_id_date_idx" ON "shift_assignments"("member_id", "date");
