# Pharmacy Shift Scheduler — Web App Specification

> เอกสารนี้คือ specification สำหรับ Claude Code ใช้สร้างเว็บแอปจัดตารางเวรห้องยาโรงพยาบาล อ่านเอกสารทั้งหมดให้จบก่อนเริ่มเขียนโค้ด แล้ววางแผน implementation ให้ผู้ใช้ confirm ก่อนลงมือ

---

## 1. ภาพรวมโปรเจกต์

เว็บแอปสำหรับช่วยเภสัชกร 1 คน (เจ้าของระบบ) จัดตารางเวรห้องยาโรงพยาบาลรายเดือน ระบบต้องเคารพกฎอายุของบุคลากร, สถานะตั้งครรภ์, และข้อจำกัดด้านเวลาเวรต่างๆ — แล้ว export เป็น Excel

### ผู้ใช้
- **เจ้าของระบบเพียงคนเดียว** ไม่ต้องมี authentication
- รันบน localhost หรือ deploy ส่วนตัว

---

## 2. Tech Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS v4** + **shadcn/ui**
- **TanStack Query** + **Zustand**
- **SQLite** + **Prisma**
- **TypeScript-only** scheduler (greedy + backtracking, 5 random restarts)
- **ExcelJS**, **date-fns**, **lucide-react**

---

## 3. Domain Logic

### 3.1 ประเภทวัน
`day_type` = `'working' | 'holiday'` (holiday รวม weekend + public_holiday)

### 3.2 ผลัดเวร

| Shift | Time | Days |
|-------|------|------|
| morning | 08:30–16:30 | holiday |
| afternoon | 16:30–23:59 | ทุกวัน |
| night | 00:00–08:30 | ทุกวัน |
| dawn | 07:00–08:30 | working |
| ext_weekday | 16:30–20:30 | จ–ศ |
| ext_holiday | 09:00–13:00 | holiday |
| smc | 16:30–20:30 | จ–พฤ |

### 3.3 Slots ต่อวัน

**Working day:**
- afternoon-MED (บM) ×1, afternoon-ER (บE) ×1
- ext_weekday (Ext) ×1
- smc (SMC) ×2 — เฉพาะ จ–พฤ
- dawn-OPD (รO) ×1, dawn-ER (รE) ×1 — เฉพาะ อ–ศ
- night (ด) ×1

**Holiday:**
- morning-SURG (s) ×2, morning-MED-DC (d) ×1, morning-MED-Cont (c) ×1, morning-ER (e) ×1
- ext_holiday (Ext) ×1
- afternoon-MED (บM) ×1, afternoon-ER (บE) ×1
- night (ด) ×1

### 3.4 Symbol Mapping
```typescript
const SHIFT_SYMBOLS = {
  'afternoon-MED': 'บM', 'afternoon-ER': 'บE',
  'ext_weekday': 'Ext', 'ext_holiday': 'Ext',
  'smc': 'SMC',
  'dawn-OPD': 'รO', 'dawn-ER': 'รE',
  'night': 'ด',
  'morning-SURG': 's', 'morning-MED-DC': 'd',
  'morning-MED-Cont': 'c', 'morning-ER': 'e',
};
```

### 3.5 Hard Constraints

- **HC1**: night วัน D ⇒ ห้าม dawn-* วัน D
- **HC2**: night วัน D ⇒ ห้าม morning-* วัน D
- **HC3**: afternoon-* วัน D ⇒ ห้าม night วัน D+1
- **HC4**: ห้ามเวรซ้อนเวลา 1 คน (afternoon ครอบคลุม ext_weekday/smc; dawn ไม่ทับใคร ยกเว้น night วันเดียวกัน—ดู HC1)
- **HC5**: กฎ pregnancy + กฎอายุ

#### กฎ pregnancy (override อายุ ถ้ามีค่า)
| status | morning | afternoon | night | aux |
|--------|---------|-----------|-------|-----|
| early | ✅ | ✅ | ✅ | ✅ |
| mid | ✅ | ❌ | ❌ | ❌ |
| late | ❌ | ❌ | ❌ | ❌ |
| postpartum | ✅ | ✅ | ✅ | ✅ |

#### กฎอายุ (เมื่อ pregnancy = null) — คำนวณอายุ ณ วันแรกของเดือน
| Age | morning | afternoon | night | aux |
|-----|---------|-----------|-------|-----|
| ≥50 | ❌ | ❌ | ❌ | ❌ |
| 47–49 | ✅ เฉพาะ morning-SURG | ❌ | ❌ | ❌ |
| 45–46 | ✅ ทุก morning | ✅ | ❌ | ❌ |
| 33–44 | ✅ | ✅ | ✅ | ✅ |
| <33 | ✅ | ✅ | ✅ (เยอะกว่า 33–44) | ✅ |

### 3.6 Soft Constraints (scoring)
- SC1: 3 เวรเดียวกันติดกัน → −1
- SC2: variance ของ gap > threshold → −2
- SC3: เวรนักขัตฤกษ์เกิน avg+1 → −5
- SC4: คนเดิมอยู่กลางวันหยุดยาวซ้ำ → −3
- SC5: เสาร์-อาทิตย์ deviation > 2 → −2 ต่อคน
- SC6: night ติดกัน 2+ → −10 ต่อ pair
- SC7: workload deviation ในกลุ่มอายุ → −1 ต่อหน่วย

---

## 4. Database Schema (Prisma)

`TeamMember` (id, nickname unique, phaId unique, dateOfBirth, pregnancyStatus?, isActive)
`PublicHoliday` (id, date unique, name)
`Schedule` (id, year, month, status, notes?) unique [year, month]
`ShiftAssignment` (id, scheduleId, memberId, date, shiftType)

---

## 5. API Routes
- Members: `GET/POST /api/members`, `PATCH/DELETE /api/members/:id` (soft delete)
- Holidays: `GET/POST /api/holidays`, `DELETE /api/holidays/:id`
- Schedules: list, get-by-month, generate, finalize, CRUD assignments, export, validate

---

## 6. UI Pages
- `/` Dashboard, `/team`, `/holidays`, `/schedules`, `/schedules/[year]/[month]` (หน้าหลัก)
- ภาษาไทย, sidebar layout

---

## 7. Color Scheme
```typescript
SHIFT_COLORS = {
  morning: '#FFFDE7', afternoon: '#E3F2FD', night: '#EDE7F6',
  dawn: '#FFF3E0', ext: '#E8F5E9', smc: '#FCE4EC',
  holiday_header: '#FFEBEE',
};
```

---

## 8. Excel Export
- File: `pharmacy_schedule_YYYY_MM.xlsx`
- Sheet 1 "ตารางเวร": header วันที่ + วันในสัปดาห์, freeze C3
- Sheet 2 "สรุป": ชื่อ, รหัส, อายุ, กลุ่ม, pregnancy, นับเวรแต่ละประเภท, รวม

---

## 9. Scheduling Algorithm
`src/lib/scheduler/{index,types,slots,eligibility,constraints,solver,scoring,balance}.ts`

Flow: setup → eligibility → 5 random restarts (greedy+backtrack) → balance → score → keep best

---

## 13. Phases
1. Foundation — scaffold + Prisma + Vitest
2. Domain Logic — scheduler **เขียน test ก่อน**
3. API Routes
4. Static UI
5. Interactive UI + Excel export
6. Polish + README

---

## 15. หมายเหตุ
- ภาษา UI = ไทย, error message console = อังกฤษ
- ห้าม hard-code data ที่ควรอยู่ใน DB
- ถ้า ambiguous ให้ถามก่อน

> สเปกฉบับเต็มอ้างอิงข้อความเดิมที่ผู้ใช้มอบให้ก่อน scaffold (ถูกย่อในไฟล์นี้เพื่อความกระชับ)
