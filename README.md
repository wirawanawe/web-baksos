# Web Baksos - Aplikasi Input Data Pasien Bakti Sosial

Aplikasi web untuk menginput data pasien yang mengikuti bakti sosial pengobatan gratis.

## Fitur

- Form input data pasien lengkap sesuai kebutuhan bakti sosial
- Responsive design untuk smartphone dan tablet
- Penyimpanan data langsung ke database MySQL
- Export data ke format Excel (.xlsx)
- Desain modern dan menarik

## Teknologi

- Next.js 14
- React 18
- MySQL2
- XLSX (untuk export Excel)
- TypeScript

## Instalasi

1. Install dependencies:
```bash
npm install
```

2. Setup database:
   - Pastikan MySQL sudah terinstall dan berjalan
   - Buat database MySQL dengan nama `baksos_db` atau sesuaikan dengan kebutuhan
   - Import file `database/schema.sql` ke MySQL untuk membuat tabel

3. Setup environment variables:
   - Buat file `.env.local` di root project
   - Copy isi dari `.env.local.example` ke `.env.local`
   - Isi konfigurasi database sesuai dengan setup MySQL Anda:
     ```
     DB_HOST=localhost
     DB_PORT=3306
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=baksos_db
     ```

4. Jalankan aplikasi:
```bash
npm run dev
```

5. Buka browser di `http://localhost:3000`

## Cara Menggunakan

1. **Input Data Pasien**: 
   - Buka halaman utama (`/`)
   - Isi form dengan data pasien
   - Klik "Simpan Data" untuk menyimpan ke database

2. **Rekapitulasi Data**:
   - Klik tombol "Rekapitulasi Data" di header
   - Atau akses langsung ke `/rekapitulasi`
   - Filter data berdasarkan tanggal (opsional)
   - Klik "Export ke Excel" untuk mengunduh data dalam format .xlsx

## Struktur Database

Tabel `patients` berisi semua data pasien yang diinput melalui form.

