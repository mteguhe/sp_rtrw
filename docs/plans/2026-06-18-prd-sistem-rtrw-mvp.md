# Product Requirements Document (PRD)
**Product Name:** SI-DIGI RT/RW (Sistem Informasi Digital RT/RW)
**Document Version:** 1.0 (MVP)
**Date:** 18 Juni 2026

## 1. Pendahuluan
### 1.1 Latar Belakang
Pengelolaan administrasi tingkat RT/RW seringkali masih dilakukan secara konvensional menggunakan buku fisik atau spreadsheet sederhana. Hal ini memicu masalah seperti hilangnya data riwayat warga, lambatnya distribusi informasi, kurangnya transparansi kas (iuran), dan rumitnya proses pembuatan surat pengantar. 

### 1.2 Tujuan Produk (Objectives)
Sistem ini dibangun untuk mendigitalkan dan menyederhanakan proses administratif di lingkungan RT/RW, dengan tujuan utama:
- Menciptakan transparansi laporan keuangan dan iuran kas warga.
- Mempermudah warga dalam mengurus administrasi persuratan.
- Menjadi portal komunikasi dan pengaduan satu pintu yang responsif.

## 2. Pengguna Sasaran (User Personas)
Sistem ini akan digunakan oleh 4 jenis pengguna utama:

| Role | Deskripsi & Wewenang Utama |
|------|----------------------------|
| **Admin RW** | Mengawasi seluruh RT dalam wilayahnya. Berwenang melihat statistik & detail warga, menyetujui surat tingkat RW, mengelola kas RW, dan broadcast pengumuman RW. |
| **Admin RT** | Pengelola utama data warga di lingkup RT. Berwenang CRUD data warga (mutasi), menyetujui surat tingkat RT, mengelola kas RT, dan broadcast pengumuman RT. |
| **Warga** | Penduduk terdaftar. Dapat mengelola data keluarga sendiri, melihat riwayat iuran pribadi, melihat laporan kas RT/RW (read-only), dan mengajukan surat. |
| **Guest** | Pengunjung umum. Hanya dapat melihat konten publik seperti informasi lingkungan atau pengumuman umum (view-only). |

## 3. Ruang Lingkup MVP (Minimum Viable Product)
MVP ini mencakup manajemen berjenjang (RT & RW) dengan fokus:
1. Manajemen Data Warga Berjenjang
2. Transparansi Kas RT & RW
3. Administrasi Surat Pengantar (RT -> RW)
4. Komunikasi & Informasi Publik

## 4. Kebutuhan Fungsional (Functional Requirements)

### 4.1 Modul Manajemen Warga
- **FR-1.1 (Admin RT):** Dapat melakukan CRUD data warga termasuk pencatatan peristiwa penting (Warga Pindahan, Kelahiran, Meninggal Dunia).
- **FR-1.2 (Admin RW):** Dapat melihat statistik agregat warga (jumlah total, kategori usia, status tinggal) dan detail warga di seluruh RT di bawahnya.
- **FR-1.3 (Warga):** Dapat melihat dan memperbarui data anggota keluarga yang terdaftar dalam satu rumah/KK.

### 4.2 Modul Keuangan & Kas
- **FR-2.1 (Admin RT/RW):** Dapat mencatat pemasukan (iuran/sumbangan) dan pengeluaran kas sesuai level masing-masing (Kas RT atau Kas RW).
- **FR-2.2 (Warga):** Dapat melihat riwayat iuran pribadi dan mengakses laporan pengeluaran kas RT maupun RW secara transparan (Read-only).
- **FR-2.3:** Sistem memisahkan pencatatan saldo Kas RT dan Kas RW secara mandiri.

### 4.3 Modul Administrasi E-Surat
- **FR-3.1 (Warga):** Dapat mengajukan permohonan surat digital (**Surat Domisili** atau **Surat Pengantar**) untuk diri sendiri maupun anggota keluarga yang terdaftar dalam satu Kartu Keluarga (KK) yang sama.
- **FR-3.2 (Admin RT):** Melakukan review tahap pertama. Berwenang untuk **Approve** (meneruskan ke RW) atau **Reject** permohonan warga.
- **FR-3.3 (Admin RW):** Melakukan review tahap kedua/akhir. Berwenang untuk **Approve** (men-generate surat) atau **Reject** permohonan yang telah disetujui RT.
- **FR-3.4:** Sistem otomatis men-generate file PDF dengan QR Code/Tanda Tangan Digital setelah mendapat Approval RW.

### 4.4 Modul Pengumuman & Pengaduan
- **FR-4.1 (Admin RT/RW):** Dapat membuat dan mengirimkan Pengumuman kepada warga (internal) atau diatur sebagai konten publik.
- **FR-4.2 (Warga):** Dapat membuat Tiket Pengaduan (misal: "Lampu jalan mati di Blok A") disertai foto sebagai bukti.
- **FR-4.3 (Admin RT/RW):** Dapat melihat daftar pengaduan warga dan mengubah statusnya (Diterima, Diproses, Selesai).
- **FR-4.4 (Guest):** Dapat mengakses halaman publik untuk melihat informasi umum lingkungan dan pengumuman yang bersifat "Public".

### 4.5 Rekomendasi Data Pengajuan Surat
Untuk memastikan surat yang dihasilkan akurat, berikut adalah data yang direkomendasikan untuk diisi dalam form pengajuan:

| Kategori Data | Field / Informasi | Keterangan |
|---------------|-------------------|------------|
| **Data Pemohon** | Nama Pengaju | Otomatis terisi dari akun yang login. |
| **Data Subjek** | Pilih Anggota Keluarga | Dropdown daftar orang yang ada dalam satu KK pengaju. |
| | NIK Subjek | Otomatis ditarik dari database warga. |
| | Tempat/Tgl Lahir | Otomatis ditarik dari database warga. |
| **Detail Surat** | Jenis Surat | Dropdown: Surat Domisili atau Surat Pengantar. |
| | Keperluan | Input teks (misal: Urus Paspor, Melamar Kerja, Domisili Usaha). |
| | Masa Berlaku | Pilihan durasi (misal: 1 bulan, 3 bulan, 6 bulan) atau tanggal berakhir. |
| | Keterangan Tambahan | Opsional (misal: Lampiran tambahan yang dibawa). |
| **Lampiran** | Foto KTP/KK | Opsional, sebagai bukti verifikasi tambahan jika diperlukan. |

## 5. Kebutuhan Non-Fungsional (Non-Functional Requirements)
- **NFR-1 (Aksesibilitas):** Sistem berbasis web (Mobile-Responsive), agar warga dapat membukanya dengan nyaman melalui browser HP tanpa harus menginstal aplikasi.
- **NFR-2 (Keamanan Data):** Data NIK dan detail keluarga bersifat privasi; Warga A tidak dapat melihat NIK/Detail Warga B, kecuali Admin.
- **NFR-3 (Audit Trail):** Setiap transaksi kas yang ditambahkan, diubah, atau dihapus oleh bendahara harus memiliki rekam jejak (log).

## 6. Alur Pengguna (Key User Flows)
### Flow Pengajuan Surat Berjenjang (Dua Tahap)
1. **Warga:** Login -> Buka menu "Persuratan" -> Pilih **Subjek Surat** (Diri sendiri/Anggota Keluarga) -> Pilih Jenis Surat -> Isi Keperluan -> Submit.
2. **Admin RT:** Menerima notifikasi -> Review data & keperluan -> Pilih **Approve** (Lanjut ke RW) atau **Reject**.
3. **Admin RW:** Menerima notifikasi (hanya jika RT sudah Approve) -> Review Akhir -> Pilih **Approve** atau **Reject**.
4. **Sistem:** Jika RW Approve, sistem men-generate PDF surat.
5. **Warga:** Menerima notifikasi "Surat Selesai" -> Download file PDF.

### Flow Pembayaran Iuran
1. Awal bulan, tagihan muncul di dashboard Warga.
2. Warga membayar ke rekening RT secara manual.
3. Warga kirim bukti bayar via sistem (atau lapor via chat).
4. Bendahara login -> Cek menu "Iuran" -> Tandai tagihan warga X sebagai "Lunas".
5. Laporan Kas Warga otomatis terupdate.

## 7. Penutup
Dokumen PRD MVP ini menjadi dasar pengembangan tahap pertama. Iterasi berikutnya (V2) dapat mencakup fitur lanjutan seperti integrasi Payment Gateway otomatis, Panic Button, dan sistem Booking Fasilitas.