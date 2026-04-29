# Pharmacy Shift Scheduler

ระบบจัดตารางเวรห้องยาโรงพยาบาลรายเดือน — ตามสเปกใน [`CLAUDE.md`](./CLAUDE.md) และ skill [`SKILL.md`](./SKILL.md)

## คุณสมบัติหลัก

- จัดตารางเวรอัตโนมัติด้วย greedy + backtracking + 5 random restarts
- เคารพกฎ Hard Constraints (HC1–HC5: รุ่งอรุณ+ดึก, ดึก+เช้า, บ่าย+ดึกข้ามคืน, เวรซ้อนเวลา, กฎอายุ + pregnancy)
- ปรับสมดุล workload ภายในกลุ่มอายุ + scoring soft constraints (SC1–SC7)
- จัดการทีม / วันหยุด ผ่านหน้าเว็บภาษาไทย
- คลิกแก้ไขตารางทีละช่อง (validate กฎอัตโนมัติ)
- Export ตารางเป็น Excel (`.xlsx`) — มี 2 sheet: ตารางเวร + สรุป
- รองรับการเก็บประวัติทุกเดือน

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn-style custom UI
- TanStack Query
- Prisma 7 + SQLite (better-sqlite3 adapter)
- ExcelJS, date-fns, lucide-react, sonner
- Vitest

## เริ่มต้นใช้งาน

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. รัน migration สร้างฐานข้อมูล
npm run db:migrate

# 3. รัน dev server
npm run dev
```

เปิด <http://localhost:3000>

> ใช้คนเดียว ไม่มี authentication — รันบน localhost หรือ deploy ส่วนตัว

## ขั้นตอนใช้งาน

1. เพิ่มทีมงานในเมนู **ทีมงาน** (ระบุชื่อเล่น, รหัส, วันเกิด, สถานะตั้งครรภ์ถ้ามี)
2. เพิ่มวันหยุดราชการในเมนู **วันหยุด** (กรอกตามปี)
3. ไปที่ **ตารางเวร** → "สร้างตารางเดือนใหม่" → กด **Generate**
4. ตรวจตาราง คลิกช่องเพื่อแก้ไข (เพิ่ม/ลบเวร — ระบบเช็ค HC อัตโนมัติ)
5. กด **Export Excel** เมื่อพอใจ
6. กด **ปิดตาราง** เพื่อ finalize (ป้องกันการแก้ไขเพิ่ม)

## โครงสร้างโปรเจกต์

```
src/
├── app/
│   ├── (pages)            # หน้าเว็บ (/, /team, /holidays, /schedules, /schedules/[y]/[m])
│   └── api/               # API routes (members, holidays, schedules, validate, export)
├── components/            # Sidebar, ScheduleGrid, SummaryPanel, UI primitives
└── lib/
    ├── db.ts              # Prisma client
    ├── constants.ts       # SHIFT_SYMBOLS, SHIFT_COLORS, getShiftColor
    ├── excel/exporter.ts  # ExcelJS workbook builder
    └── scheduler/         # ⭐ Domain logic
        ├── types.ts       # Member/Slot/Assignment + age groups
        ├── slots.ts       # generate slots ของแต่ละเดือน
        ├── eligibility.ts # HC5 (pregnancy + age)
        ├── constraints.ts # HC1-HC4 (interval-based)
        ├── solver.ts      # greedy + backtracking
        ├── scoring.ts     # SC1-SC7
        ├── balance.ts     # workload balancing
        └── index.ts       # generateSchedule() entry
```

## คำสั่งสำคัญ

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # production server
npm test             # vitest run (41 tests)
npm run test:watch   # vitest --watch
npm run db:migrate   # prisma migrate dev
npm run db:studio    # prisma studio (GUI ดู DB)
```

## Testing

```bash
npm test
```

Test coverage:
- `tests/scheduler/slots.test.ts` — leap year, weekday/weekend slot generation, public holiday override
- `tests/scheduler/eligibility.test.ts` — HC5 ครบทุก age group + pregnancy status
- `tests/scheduler/constraints.test.ts` — HC1, HC2, HC3, HC4
- `tests/scheduler/solver.test.ts` — integration test (12 คน, full month, deterministic)

## Deployment

ระบบถูกออกแบบให้รัน local เป็นหลัก ถ้าจะ deploy:

- **Vercel + Turso/PostgreSQL**: เปลี่ยน `prisma/schema.prisma` provider เป็น `postgresql` แล้วใช้ Turso/Neon/Vercel Postgres
- **Self-hosted**: build แล้วรัน `npm start` พร้อม mount volume สำหรับ `prisma/dev.db`

## หมายเหตุ

- ภาษา UI: ภาษาไทย
- ภาษา error console: ภาษาอังกฤษ
- ใช้ปี พ.ศ. แสดงผลในหน้าเว็บ (ภายในเก็บเป็น ค.ศ.)

## License

Private — ใช้ภายในเท่านั้น
