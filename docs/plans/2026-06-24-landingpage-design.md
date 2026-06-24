# Spesifikasi Desain: Landing Page Publik Premium
**Tanggal:** 24 Juni 2026  
**Status:** Disetujui  
**Target:** Fase 4 Akhir & Penyempurnaan SI-DIGI RT/RW  

---

## 1. Ikhtisar & Tujuan (Overview & Objective)
Halaman depan/utama (`/`) merupakan pintu masuk bagi warga, pengurus, maupun tamu luar (Guest). Desain dirancang sebagai Landing Page SaaS modern (Sleek Light Mode) yang menyajikan informasi lingkungan secara ringkas, transparan, dan interaktif. Halaman ini juga berfungsi sebagai Hub Navigasi Cepat ke fitur-fitur internal serta direktori darurat warga.

---

## 2. Struktur Visual & Komponen UI (Tata Letak A)

Halaman utama ini dibagi menjadi 4 bagian vertikal utama:

### 2.1 Hero Section
*   **Aesthetics**: Gradasi latar belakang halus (`bg-gradient-to-br from-blue-50 via-white to-indigo-50`) dengan ornamen lingkaran buram (`blur-3xl`) berwarna indigo dan biru.
*   **Judul Utama**: "Sistem Informasi Digital untuk Lingkungan Modern & Transparan".
*   **Tombol Utama**: 
    - Tombol A: "Masuk ke Sistem" / "Menuju Dashboard" (Biru pekat dengan bayangan menyala, mengarah ke `/login` atau `/admin/residents`).
    - Tombol B: "Lapor RT (Pengaduan)" (Outline biru, mengarah ke `/admin/complaints`).

### 2.2 Grid Layanan Utama
Menampilkan 4 kartu navigasi utama:
1.  **Data Warga**: Penjelasan CRUD KK & Warga (Ikon: `Users`).
2.  **Persuratan**: Pengajuan surat domisili & pengantar (Ikon: `FileText`).
3.  **Keuangan Kas**: Rekap pemasukan/pengeluaran kas RT/RW (Ikon: `DollarSign`).
4.  **Pengumuman**: Broadcast informasi penting lingkungan (Ikon: `Bell`).

### 2.3 Statistik Lingkungan & Kontak Darurat (Side-by-Side)
*   **Sisi Kiri (Statistik)**: 3 kartu horizontal berisi data statis:
    *   Wilayah: "05 RT"
    *   Kepala Keluarga: "230 KK"
    *   Total Warga: "980 Jiwa"
*   **Sisi Kanan (Kontak Darurat)**: Daftar kontak cepat keadaan darurat yang bisa diklik untuk melakukan panggilan telepon langsung (`tel:`):
    *   Ambulans & Medis: `118` (Ikon: `HeartPulse`)
    *   Pemadam Kebakaran: `113` (Ikon: `Flame`)
    *   Polsek Terdekat: `021-123456` (Ikon: `Shield`)
    *   Pos Keamanan RW: `0812-3456-7890` (Ikon: `PhoneCall`)

### 2.4 Bagan Pengurus RW & Pengumuman Publik (Side-by-Side)
*   **Sisi Kiri (Pengurus RW)**: Bagan kepengurusan aktif dengan nama & peran:
    *   Ketua RW: "Bpk. Heru Santoso"
    *   Sekretaris: "Ibu Rina Lestari"
    *   Bendahara: "Bpk. Joko Susilo"
    *   Koordinator Keamanan: "Bpk. Slamet Wijaya"
*   **Sisi Kanan (Pengumuman Publik)**: Feed pengumuman terbaru yang diambil dari API publik. Maksimal menampilkan 3 entri dengan format tanggal lokal Indonesia (`id-ID`).

---

## 3. Integrasi & Perilaku Dinamis

1.  **Deteksi Sesi Login**:
    *   Saat halaman `/` dimuat, periksa `localStorage.getItem('token')`.
    *   Jika token ada dan valid, tombol Hero otomatis berubah teks menjadi `"Menuju Dashboard"` dan mengarah ke `/admin/residents`.
2.  **Pemuatan Pengumuman Publik**:
    *   Melakukan fetch ke `GET /api/public/announcements` secara asynchronous.
    *   Menampilkan loading state mandiri tanpa memblokir pemuatan halaman utama.
    *   Jika terjadi kesalahan/eror, tampilkan keterangan *"Belum ada pengumuman publik"* tanpa menghentikan fungsi navigasi halaman.
