# Attendance System — System Design Document

## 1. Overview

A web-based school attendance system for non-Excel users (e.g. age ~50). Users manage heading, **user-defined columns only** (no fixed columns), rows (students), attendance (Present/Absent), and holidays through a simple UI. The system exports a formatted Excel (.xls/.xlsx) file matching the required school attendance sheet layout.

---

## 2. Design Principles

| Principle | Description |
|-----------|-------------|
| **Easy UI first** | Every action is option/button driven; no Excel knowledge required. |
| **Define once, use everywhere** | School/class/header and student list are entered once and reused in export. |
| **Absent-only input** | User only tells "which student was absent on which dates"; system fills Present (P) for the rest. |
| **Fully flexible columns** | No fixed columns. User adds every column from the UI with a heading of their choice (e.g. SL.no, Name, ADMN, Father's name); Excel is built from that. |
| **Holidays by date** | User marks dates as holiday with reason (e.g. Sunday); system fills that day's column accordingly. |
| **Export = final sheet** | One "Export/Download" action produces the full Excel file with correct layout and styling. |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  • School/Class/Incharge setup   • Student list (add/edit)       │
│  • User-added columns only       • Attendance (absent dates)     │
│  • Holiday/date config           • Export/Download button        │
└────────────────────────────┬────────────────────────────────────┘
                              │ API
┌─────────────────────────────▼────────────────────────────────────┐
│                        BACKEND (Django)                           │
│  • Auth & multi-tenant (per user/school)  • Students CRUD         │
│  • Month/calendar config         • Attendance storage            │
│  • Excel export (openpyxl/xlwt)   • Holiday rules                 │
└────────────────────────────┬────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                     DATABASE (PostgreSQL/SQLite)                  │
│  Schools, Classes, Students, Columns, Attendance, Holidays, etc.  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Feature Breakdown & Strategy

### 4.1 User & Tenant

- **Strategy**: One user (teacher/incharge) can have one or more classes. Data is scoped per user (or per school if we add school entity later).
- **Flow**: Login/Register → Dashboard → Select or create Class → Work on that class's data.

---

### 4.2 Heading Configuration (School, Class, Class Incharge)

| Item | Description | Excel placement |
|------|-------------|-----------------|
| School name | User types once | Merged header row (e.g. A3:C3) "ASIAN PUBLIC SCHOOL" |
| Class | e.g. "2nd" | Next row "CLASS - 2nd" |
| Class Incharge | e.g. "POOJA GULATI" | Next row "CLASS INCHARGE - POOJA GULATI" |

- **Strategy**: Single form/section "Heading" where user enters these three. Stored per class. On export, we write them at the top of each monthly sheet automatically.

---

### 4.3 Columns — 100% User-Added (No Fixed Columns)

- **Strategy**: There are **no fixed columns**. The user adds every column from the UI as per their need.
- **Flow**:
  1. User clicks **"Add column"**.
  2. User types the **column heading** (e.g. "SL.no", "Name of the students", "ADMN", "Father's name", "Stop Name", "Route No", "Contact No" — or any other label they want).
  3. That heading becomes one column in the sheet. User can add as many columns as they want, in any order.
  4. User fills values **per row** (manual entry or copy-paste). We store and show data row-wise; in Excel export we write exactly these columns in the same order.

- **Examples**: User might add columns like: "SL.no", "Admission No", "Name", "Father's name", "Stop Name", "Route No", "Contact No". Or fewer, or more, or different names — entirely up to the user.
- **Copy-paste**: Allow paste of multiple rows/columns so user can paste from another sheet; we map to columns by order (or let user map once) and save row-wise.

---

### 4.4 Rows (Students / One Row per Student in Excel)

- **Strategy**: Each "student" is one **row** in the sheet. User adds rows one by one or via bulk paste. No predefined row structure — each row has values only for the columns the user has added.
- **Flow**:
  1. User adds a row (e.g. first row, second row, …).
  2. For each column the user has defined, they fill the value for that row (or leave blank).
  3. In Excel export: one row per added row; columns appear in the order the user added them.
- **Order**: Rows are kept in the order user added them; that order is preserved in Excel (row 1, row 2, …).

---

### 4.5 Month & Calendar Configuration

- **Strategy**: For each month we need:
  - Number of days (28, 29, 30, 31).
  - Which dates are "non-working" (holidays/weekends) and how to label them in Excel.
- **Options**:
  - **A) Fixed rule**: e.g. "Every Sunday = off" → system marks all Sundays in that month with a label (e.g. "SUNDAY" or code "S").
  - **B) Manual per date**: User picks date (e.g. 10) and sets "Holiday" with reason "Sunday" or "Festival" → we fill that day's column with the reason/code.
- **Export**: For each day column (1 to max days in month):
  - If date is holiday → fill entire column with the chosen label (e.g. "S" or "SUNDAY" or "S U N D A Y" as per design).
  - Else → column is for attendance (P/A).

---

### 4.6 Attendance Logic (Present / Absent)

**Core rule:**

- User **only** provides **absent** information: "Student X was absent on dates D1, D2, …".
- Any date that is **not** a holiday and **not** marked absent → we treat as **Present (P)**.

**Strategy:**

1. **Input**: Per student, user selects or enters the list of dates when that student was absent (e.g. 5, 12, 19).
2. **Storage**: Store (student_id, date, status) where status = "A" for absent. For "P" we can either store explicitly or derive at export time.
3. **Export**:
   - For each day column (that is not a holiday):
     - If (student, date) is in absent list → write **"A"** and apply **red background** to that cell.
     - Else → write **"P"** (Present).
   - Holiday columns already filled with holiday label (e.g. "SUNDAY"), no P/A.

So: **only absences are input; present is automatic.**

---

### 4.7 Holiday & Special Days

- **Strategy**: User configures per month (or per class/month):
  - Either select weekday(s) as off (e.g. Sunday) → system finds all such dates in that month.
  - Or pick specific dates and assign reason (e.g. "10 – Sunday", "15 – Festival").
- **In Excel**: For that date's column, every row gets the same text/code (e.g. "S" or "SUNDAY" or "S U N D A Y" depending on desired look). No P/A in that column.

---

### 4.8 Totals (End of Month)

- **Strategy**: After the day columns (1–31), add summary columns, e.g.:
  - **M.U-FORWARD** (or similar): count of working days / present days (as per school rule).
  - **G. Total**: grand total (e.g. total present, or total working days).
- **Computation**: For each student row:
  - Count days that are "P".
  - Count days that are "A".
  - Optionally count working days (total days in month minus holidays).
  - Write these in the summary columns.

Exact formula (e.g. what "M.U-FORWARD" means) can be set in config; in design we only state that "total counts per student for that month" are computed and written in the last columns.

---

## 5. UI Flow (Step-by-Step)

1. **Login / Register** (if we have auth).
2. **Heading**: Enter School name, Class, Class Incharge → Save.
3. **Columns**: User adds columns as needed (e.g. "SL.no", "Name", "ADMN", "Father's name", "Stop Name", "Route No", "Contact No") — no fixed list; whatever headings user wants.
4. **Rows (students)**: User adds rows and fills values for each column (manual or copy-paste). One row = one student row in Excel.
5. **Month config**: Choose month → Set number of days → Set holidays (e.g. Sundays, or specific dates with reason).
6. **Attendance**: For that month, per row (student), user enters only **absent dates**. Rest = Present.
7. **Export**: Click "Export" or "Download" → backend generates Excel with:
   - Heading at top
   - Table: user-defined columns only (in order added), then day columns 1–31 (holiday columns filled with reason; others P/A, A in red), then summary columns (totals)
   - One sheet per month (or single sheet for selected month as per requirement).

---

## 6. Data Model (Conceptual)

- **User** (or School): id, name, …
- **Class**: id, user/school_id, name, class_label (e.g. "2nd"), school_name, class_incharge.
- **Column**: id, class_id, heading (user-defined, e.g. "Name", "ADMN", "Father's name"), order. (No fixed columns; all columns come from here.)
- **Row** (Student): id, class_id, row_order. (Represents one row in the sheet; no fixed fields.)
- **Cell** (RowColumnValue): id, row_id, column_id, value. (One cell = one value for one row and one column.)
- **MonthConfig**: id, class_id, month, year, num_days, …
- **Holiday**: id, month_config_id (or class_id + month + year), date, reason_or_code (e.g. "SUNDAY", "S").
- **Attendance**: id, row_id (student row), date (or month + day), status ("A" only stored; "P" derived).

---

## 7. Export (Excel) Strategy

- **Library**: openpyxl (for .xlsx) or xlwt (for legacy .xls).
- **Layout**:
  - Row 1–2: optional empty or title.
  - Row 3: Merged cell → School name.
  - Row 4: Merged → Class.
  - Row 5: Merged → Class Incharge.
  - Row 6: empty or separator.
  - Row 7: Headers — [user-added columns in order], 1, 2, … 31, M.U-FORWARD, G. Total.
  - Row 8 onwards: One row per row (same column order); user columns first (from Cell values), then day columns (P or A, A with red fill), then totals; for holiday days write the configured label.
- **Multi-sheet**: If export is for full year, one sheet per month (APRIL, MAY, … DECEMBER) with same structure.

---

## 8. Summary Table (Strategy at a Glance)

| Area | Strategy |
|------|----------|
| **Heading** | User enters School, Class, Incharge once → we write at top of Excel. |
| **Students** | Add per row; one row per student in Excel. |
| **Columns** | No fixed columns. User adds columns from UI with any heading (e.g. SL.no, Name, ADMN, Father's name); order and names are fully up to the user. |
| **Attendance** | User gives only **absent dates** per student; we fill **P** for all other (non-holiday) days. |
| **Holidays** | User sets holidays (by weekday or by date + reason); we fill that day's column with label (e.g. "SUNDAY" / "S"). |
| **Totals** | Compute per-student counts (e.g. present, absent, working days) and write in last columns. |
| **Export** | One button → generate .xls/.xlsx with correct layout, merged headers, red for "A", one sheet per month if needed. |

---

## 9. Out of Scope (for later)

- Multi-school / multi-role (admin vs teacher).
- Bulk import of students from CSV/Excel (can be added later).
- Notifications (e.g. alert when absenteeism is high).
- Mobile app (UI first; responsive web can support mobile later).

---

This document is the single reference for "everything in this tool" and each strategy. Implementation (Django + React, DB, API, export) should follow this design.
