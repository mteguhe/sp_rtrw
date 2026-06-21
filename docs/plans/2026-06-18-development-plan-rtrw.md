# Development Plan: SI-DIGI RT/RW

**Dokumen Terkait:** [PRD Sistem RT/RW MVP](./2026-06-18-prd-sistem-rtrw-mvp.md)
**Status:** Perencanaan
**Target Fase:** Minimum Viable Product (MVP)

---

## 1. Arsitektur & Teknologi (Tech Stack)

Berdasarkan keputusan strategis, berikut adalah tumpukan teknologi yang akan digunakan:

### 1.1 Backend (Core System)
*   **Bahasa & Framework:** **Golang (Go)**. Dipilih karena performanya yang sangat tinggi, efisiensi resource, dan sangat baik dalam menangani konkurensi (berguna saat banyak warga mengakses/mendownload surat secara bersamaan). Framework yang disarankan adalah **Gin** atau **Echo** untuk *routing* API yang cepat.
*   **Database:** **MySQL**. Database relasional yang paling populer, sangat handal untuk menyimpan data warga, riwayat iuran, dan pengelolaan hak akses berjenjang (RBAC). MySQL dipilih karena kemudahan manajemen dan dukungan luas di berbagai layanan hosting.
*   **File Storage:** AWS S3, Google Cloud Storage, atau MinIO (Self-hosted) untuk menyimpan foto bukti pengaduan dan file PDF dokumen surat.

### 1.2 Frontend (User Interface)
*   **Rekomendasi Utama:** **React.js** (dengan TypeScript).
    *   *Alasan:* Ekosistem React sangat matang. Banyak komponen siap pakai untuk *dashboard admin*, tabel data (data grid) untuk menampilkan riwayat warga/kas, dan *form handling* yang kompleks untuk pengajuan surat. TypeScript akan memastikan tipe data selaras dengan API dari Golang.
*   **UI Framework:** Tailwind CSS atau Material UI (MUI) untuk mempercepat pembuatan desain responsif agar nyaman diakses via HP oleh warga.

---

## 2. Desain Database (High-Level Schema)

Untuk mendukung PRD, sistem memerlukan beberapa tabel inti yang dioptimalkan untuk MySQL:

1.  **`users`**: Data kredensial login (ID, username/email, password hash, role_id).
2.  **`roles`**: Tabel referensi akses (Admin RW, Admin RT, Warga).
3.  **`families` (Kartu Keluarga):** Data KK (No_KK, Alamat, ID_Kepala_Keluarga).
4.  **`residents` (Warga):** Detail warga (NIK, Nama, Tempat/Tgl Lahir, ID_KK, Status_Tinggal).
5.  **`finances` (Kas/Iuran):** Transaksi keuangan (Nominal, Tipe (Pemasukan/Pengeluaran), Level (RT/RW), Tanggal, Status Lunas).
6.  **`letters` (Surat):** Pengajuan surat (ID_Pengaju, ID_Subjek, Jenis_Surat, Status (Pending_RT, Pending_RW, Selesai), File_URL).
7.  **`complaints` (Pengaduan):** Tiket laporan (ID_Pelapor, Judul, Deskripsi, Foto_URL, Status).
8.  **`announcements` (Pengumuman):** Konten informasi (Judul, Konten, Target_Audience, Tanggal_Publish).

---

## 3. Milestone Pengembangan (Roadmap)

Pengembangan MVP akan dibagi menjadi 4 Fase (Sprint) utama. Estimasi 1 Sprint = 1-2 Minggu tergantung kapasitas tim.

### Fase 1: Fondasi Sistem & Manajemen Autentikasi
**Fokus:** Menyiapkan kerangka kerja, database MySQL, dan login/role.
- [ ] Setup *Project Repository* (Golang Backend & React Frontend).
- [ ] Desain skema MySQL dan pembuatan *migration scripts*.
- [ ] Implementasi sistem Autentikasi (JWT) dan Middleware otorisasi (RBAC).
- [ ] **Frontend:** Setup routing, layouting Dashboard dasar, dan halaman Login.

### Fase 2: Modul Core (Manajemen Warga & Pengumuman)
**Fokus:** Mendukung CRUD data warga dan komunikasi dasar.
- [ ] **API & UI:** CRUD Manajemen Kartu Keluarga (`families`).
- [ ] **API & UI:** CRUD Anggota Keluarga (`residents`).
- [ ] Implementasi logika akses: Admin RT mengelola warga di RT-nya, Admin RW melihat keseluruhan.
- [ ] **API & UI:** Fitur Broadcast Pengumuman (Tingkat RW, Tingkat RT, dan Publik).

### Fase 3: Modul Kompleks (Keuangan & E-Surat)
**Fokus:** Transparansi kas dan alur persuratan dua tahap.
- [ ] **API & UI:** Modul Keuangan (Pemasukan/Pengeluaran).
- [ ] Pemisahan dashboard laporan Kas RT dan Kas RW.
- [ ] **API & UI:** Modul E-Surat. Pembuatan form pengajuan (dengan dropdown anggota keluarga).
- [ ] Implementasi alur approval 2 tahap (RT -> RW).
- [ ] Integrasi *library* Golang untuk men-generate file PDF otomatis setelah RW *Approve*.

### Fase 4: Modul Pengaduan & Finalisasi (Testing)
**Fokus:** Penyelesaian fitur pelaporan dan stabilisasi.
- [ ] **API & UI:** Modul Tiket Pengaduan beserta fitur upload foto ke Storage.
- [ ] Endpoint Publik untuk Guest (Halaman Informasi Umum & Pengumuman Publik).
- [ ] Unit Testing pada Golang (terutama logika Kas dan Alur Persetujuan Surat).
- [ ] UAT (User Acceptance Testing) bersama calon pengguna simulasi.
- [ ] Deployment ke Staging Environment.

---

## 4. Rencana Implementasi Awal (Next Action)

Setelah dokumen ini disetujui, langkah praktis pertama yang harus dilakukan oleh *developer* adalah:
1. Inisialisasi struktur proyek Golang.
2. Inisialisasi proyek React.
3. Membangun dan menguji koneksi *Database Migration* ke MySQL.