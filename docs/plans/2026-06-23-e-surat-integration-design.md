# Design Spec: E-Surat Workflow and Integration

## 1. Overview
The **E-Surat** module enables citizens (Warga) to request digital letters (e.g. Surat Domisili, Surat Pengantar) for themselves or family members, handles a 2-stage approval workflow (RT Admin -> RW Admin), and generates the final PDF output. 

This document details the architectural layout, frontend pages, backend endpoint additions, and security requirements to integrate E-Surat in the SI-DIGI RT/RW application.

---

## 2. Technical Scope

### 2.1 Backend Route Extension
Currently, `/api/rt/...` endpoints are restricted to Admins. Warga accounts need a safe way to fetch their family members (residents under the same KK) to select the letter's subject.
- **Endpoint:** `GET /api/my-family`
- **Controller Function:** `GetMyFamily` in `projects/si-digi-rtrw/backend/controllers/resident_controller.go`
- **Route registration:** in `projects/si-digi-rtrw/backend/routes/routes.go` inside the protected group (`api`).
- **Response Format:** A JSON array of `Resident` records under the same `FamilyID` as the logged-in user's linked resident.

### 2.2 Frontend Route & Page Creation
- **New Page:** `projects/si-digi-rtrw/frontend/src/pages/admin/Letters.tsx`
- **App Route Map:** `/admin/letters` mapping to `Letters.tsx` inside `App.tsx`
- **Sidebar Integration:** Sidebar entry "Persuratan Surat" utilizing `FileText` icon in `DashboardLayout.tsx`

---

## 3. UI/UX Design System (Layout A - Unified Tabbed Dashboard)

The page layout dynamically adjusts based on the authenticated user's role:

### 3.1 Citizen (Warga) view:
- **Tab 1: Buat Pengajuan (Form)**
  - Subjek Surat dropdown (populated from `GET /api/my-family`).
  - Jenis Surat dropdown (Surat Domisili / Surat Keterangan Pengantar).
  - Masa Berlaku dropdown (1 Bulan, 3 Bulan, 6 Bulan).
  - Keperluan input (Text area).
  - Form validation: check that required fields are filled.
- **Tab 2: Riwayat Pengajuan (Table)**
  - Table columns: Tanggal Pengajuan, Subjek Surat, Jenis Surat, Keperluan, Status, Unduh.
  - Unduh column: shows a clickable "Unduh PDF" link only if status is `Selesai` (linking to backend `pdf_url`).
  - Status column has dynamic color badges:
    - `Menunggu RT`: Yellow (`bg-amber-100 text-amber-700`)
    - `Menunggu RW`: Orange (`bg-orange-100 text-orange-700`)
    - `Selesai`: Green (`bg-green-100 text-green-700`)
    - `Ditolak`: Red (`bg-red-100 text-red-700`)

### 3.2 Admin view (Admin RT & Admin RW):
- **Tab 1: Antrean Persetujuan (Table)**
  - Table of pending letters waiting for review by the admin's level:
    - Admin RT only sees `Menunggu RT` status letters within their RT scope.
    - Admin RW only sees `Menunggu RW` status letters within their RW scope.
  - Columns: Tanggal, Pemohon, Subjek, Jenis, Keperluan, Aksi.
  - Aksi column: two buttons "Setujui" and "Tolak" with loading indicators to prevent double action.
- **Tab 2: Arsip Riwayat (Table)**
  - Lists all letters that have been approved (`Selesai`) or rejected (`Ditolak`).

---

## 4. REST API Endpoint Mapping

The frontend consumes the following endpoints:
1. `GET /api/my-family` (Warga only) - returns family member list.
2. `GET /api/letters` (All roles) - returns letters list (backend isolates results by role/jurisdiction).
3. `POST /api/letters` (Warga & Admin RT) - submits a new letter request.
4. `POST /api/letters/:id/approve` (Admins only) - moves status (`Menunggu RT` -> `Menunggu RW` -> `Selesai`).
5. `POST /api/letters/:id/reject` (Admins only) - moves status to `Ditolak`.

---

## 5. Security & Isolation Boundaries
1. **Claims Verification:** Backend automatically extracts user's `rt`, `rw`, and `role` claims from JWT.
2. **Read Scope:**
   - Warga: Only queries letters where `applicant_id = current_user_id`.
   - Admin RT: Only queries letters where `status = "Menunggu RT" AND rt = current_user_rt AND rw = current_user_rw`.
   - Admin RW: Only queries letters where `status = "Menunggu RW" AND rw = current_user_rw`.
3. **Write Scope:**
   - Approvals are guarded via `RoleMiddleware("Admin RT", "Admin RW")`.
   - Admin RT can only approve `Menunggu RT` letters in their own RT/RW.
   - Admin RW can only approve `Menunggu RW` letters in their own RW.
