-- Migration script: Ubah kolom usia menjadi tanggal_lahir
-- Script ini mengubah kolom usia (INT) menjadi tanggal_lahir (DATE)

USE baksos_db;

-- Nonaktifkan foreign key checks sementara
SET FOREIGN_KEY_CHECKS = 0;

-- Tambahkan kolom tanggal_lahir baru
ALTER TABLE pasien ADD COLUMN tanggal_lahir DATE AFTER jenis_kelamin;

-- Migrasi data: konversi usia menjadi tanggal lahir (estimasi)
-- Menggunakan tanggal 1 Januari (tahun sekarang - usia) sebagai estimasi
-- Catatan: Ini hanya estimasi, data sebenarnya harus diinput ulang
UPDATE pasien 
SET tanggal_lahir = DATE_SUB(CURDATE(), INTERVAL usia YEAR)
WHERE usia IS NOT NULL AND usia > 0;

-- Hapus kolom usia lama
ALTER TABLE pasien DROP COLUMN usia;

-- Aktifkan kembali foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Catatan: 
-- Data usia yang sudah ada akan dikonversi menjadi tanggal lahir dengan estimasi
-- Tanggal lahir akan di-set ke 1 Januari (tahun sekarang - usia)
-- Untuk data yang lebih akurat, silakan update manual tanggal lahir yang sebenarnya

