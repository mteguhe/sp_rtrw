# Spesifikasi Desain: Modul Tiket Pengaduan (Complaints)
**Tanggal:** 24 Juni 2026  
**Status:** Disetujui  
**Target:** Fase 4 Pengembangan SI-DIGI RT/RW  

---

## 1. Ikhtisar & Tujuan (Overview & Objective)
Modul **Tiket Pengaduan** memfasilitasi warga (Warga) untuk melaporkan masalah lingkungan (seperti fasilitas rusak, kebersihan, atau keamanan) secara langsung ke pengurus lingkungan. Agar laporan valid, warga diwajibkan mengunggah satu foto bukti fisik. Pengaduan diproses secara berjenjang di mana Admin RT hanya mengelola pengaduan di lingkup RT-nya, dan Admin RW mengelola semua laporan di lingkup RW. Seluruh pengaduan dapat dilihat secara transparan oleh sesama warga di lingkup RW yang sama untuk kolaborasi sosial.

---

## 2. Model Database (`models.Complaint`)
Di dalam `projects/si-digi-rtrw/backend/models/models.go`, skema tabel MySQL adalah sebagai berikut:

```go
type ComplaintStatus string

const (
	StatusDiterima ComplaintStatus = "Diterima"
	StatusDiproses ComplaintStatus = "Diproses"
	StatusSelesai  ComplaintStatus = "Selesai"
)

type Complaint struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	Title       string          `gorm:"not null" json:"title"`
	Description string          `gorm:"type:text;not null" json:"description"`
	PhotoURL    string          `gorm:"not null" json:"photo_url"`
	Status      ComplaintStatus `gorm:"type:varchar(20);default:'Diterima'" json:"status"`
	ReporterID  uint            `json:"reporter_id"`
	Reporter    User            `gorm:"foreignKey:ReporterID" json:"reporter"`
	RT          string          `json:"rt"`
	RW          string          `json:"rw"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"-"`
}
```

---

## 3. Penanganan File & Static Serving
*   **Penyimpanan Lokal**: Gambar bukti diunggah menggunakan form data multipart. Backend menyimpan file fisik ke folder `./uploads/complaints/`.
*   **Keamanan Nama File**: Menggunakan timestamp dan string acak untuk mencegah konflik nama, contoh: `complaint-1719234567-987a.png`.
*   **Validasi File**:
    *   Tipe file diizinkan: `.jpg`, `.jpeg`, `.png`.
    *   Ukuran maksimum file: **5MB**.
*   **Penyajian File Statis**: Ditambahkan ke router Gin agar file dalam folder `./uploads` dapat diakses langsung oleh frontend.
    `r.Static("/uploads", "./uploads")`

---

## 4. API Endpoints

### 4.1 Membuat Pengaduan Baru
*   **Rute**: `POST /api/complaints`
*   **Hak Akses**: Warga / Admin RT / Admin RW
*   **Tipe Payload**: `multipart/form-data`
*   **Fields**:
    *   `title` (Teks, wajib)
    *   `description` (Teks, wajib)
    *   `photo` (File Gambar, wajib)
*   **Response Sukses (201 Created)**:
```json
{
  "id": 1,
  "title": "Lampu Jalan Mati Blok A",
  "description": "Lampu jalan depan rumah nomor 12 mati sejak 3 hari yang lalu.",
  "photo_url": "/uploads/complaints/complaint-1719234567-987a.png",
  "status": "Diterima",
  "reporter_id": 4,
  "rt": "01",
  "rw": "03",
  "created_at": "2026-06-24T15:40:00Z"
}
```

### 4.2 Mendapatkan Daftar Pengaduan
*   **Rute**: `GET /api/complaints`
*   **Hak Akses**: Warga / Admin RT / Admin RW
*   **Saringan Scope (Backend)**:
    *   **Warga**: Mengembalikan seluruh pengaduan yang terdaftar di wilayah RW tersebut.
    *   **Admin RT**: Mengembalikan pengaduan dari wilayah RT-nya saja.
    *   **Admin RW**: Mengembalikan semua pengaduan di RW tersebut.
*   **Response (200 OK)**: JSON Array objek `Complaint` dengan preloads `Reporter` (termasuk profil `Resident`).

### 4.3 Mengubah Status Pengaduan
*   **Rute**: `PUT /api/complaints/:id/status`
*   **Hak Akses**: Admin RT / Admin RW
*   **Payload (JSON)**:
```json
{
  "status": "Diproses"
}
```
*   **Response (200 OK)**: Objek `Complaint` terupdate.

---

## 5. Rancangan UI/UX Frontend

### 5.1 Navigasi Sidebar (`DashboardLayout.tsx`)
Menambahkan 3 menu baru:
1.  **Persuratan** -> Rute `/admin/letters` (Ikon: `FileText`)
2.  **Pengumuman** -> Rute `/admin/announcements` (Ikon: `Bell`)
3.  **Pengaduan** -> Rute `/admin/complaints` (Ikon: `AlertTriangle`)

### 5.2 Dashboard Pengaduan Warga
Menggunakan Layout Tab:
*   **Tab 1: Buat Laporan (Form)**:
    *   Input Judul Pengaduan.
    *   Input Area Teks Detail Deskripsi.
    *   Input Drag-and-Drop / File Picker untuk Foto Bukti (wajib).
    *   Tombol Submit dengan spinner loading.
*   **Tab 2: Semua Pengaduan (Feed Kartu Visual)**:
    *   Menampilkan daftar pengaduan warga dengan layout kartu yang berisi gambar, judul, status badge (`Diterima` / `Diproses` / `Selesai`), nama pelapor, tanggal, dan deskripsi singkat.

### 5.3 Dashboard Pengaduan Admin
Menggunakan Layout Tab:
*   **Tab 1: Antrean Pengaduan (Tabel)**:
    *   Daftar pengaduan berstatus `Diterima` dan `Diproses`.
    *   Kolom aksi memiliki tombol:
        *   **"Proses"** (Hanya muncul jika status `Diterima`).
        *   **"Selesaikan"** (Mengubah status menjadi `Selesai`).
*   **Tab 2: Arsip Pengaduan**:
    *   Daftar laporan dengan status akhir `Selesai`.
