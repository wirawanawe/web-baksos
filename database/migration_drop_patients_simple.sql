-- Migration script sederhana: Hapus tabel patients lama
-- Script ini menghapus tabel patients yang sudah diganti dengan pasien dan pemeriksaan
-- Versi sederhana yang langsung menghapus dengan menonaktifkan foreign key checks

USE baksos_db;

-- Nonaktifkan foreign key checks sementara
SET FOREIGN_KEY_CHECKS = 0;

-- Hapus tabel patients (akan menghapus meskipun ada foreign key constraint)
DROP TABLE IF EXISTS patients;

-- Aktifkan kembali foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Catatan: 
-- Pastikan semua data sudah dimigrasi ke tabel pasien dan pemeriksaan sebelum menjalankan script ini
-- Pastikan juga tabel resep_detail sudah diupdate untuk menggunakan pemeriksaan_id, bukan patient_id

