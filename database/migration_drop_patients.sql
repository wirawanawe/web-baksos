-- Migration script: Hapus tabel patients lama
-- Script ini menghapus tabel patients yang sudah diganti dengan pasien dan pemeriksaan

USE baksos_db;

-- Nonaktifkan foreign key checks sementara
SET FOREIGN_KEY_CHECKS = 0;

-- Hapus foreign key constraint dari resep_detail jika masih menggunakan patient_id
-- Cari semua constraint yang mereferensikan tabel patients
SELECT CONCAT('ALTER TABLE ', TABLE_NAME, ' DROP FOREIGN KEY ', CONSTRAINT_NAME, ';') AS drop_statement
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'baksos_db'
  AND REFERENCED_TABLE_NAME = 'patients';

-- Hapus foreign key constraint resep_detail_ibfk_1 jika ada (yang mereferensikan patients)
-- Jika constraint name berbeda, sesuaikan dengan output dari query di atas
ALTER TABLE resep_detail DROP FOREIGN KEY IF EXISTS resep_detail_ibfk_1;

-- Alternatif: Hapus semua constraint yang mereferensikan patients secara dinamis
-- (Uncomment jika cara di atas tidak bekerja)
/*
SET @sql = (
  SELECT CONCAT('ALTER TABLE ', TABLE_NAME, ' DROP FOREIGN KEY ', CONSTRAINT_NAME)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = 'baksos_db'
    AND REFERENCED_TABLE_NAME = 'patients'
  LIMIT 1
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
*/

-- Hapus tabel patients
DROP TABLE IF EXISTS patients;

-- Aktifkan kembali foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Catatan: 
-- 1. Pastikan semua data sudah dimigrasi ke tabel pasien dan pemeriksaan sebelum menjalankan script ini
-- 2. Pastikan juga tabel resep_detail sudah diupdate untuk menggunakan pemeriksaan_id, bukan patient_id
-- 3. Jika masih ada error, jalankan query SELECT di atas untuk melihat nama constraint yang tepat,
--    lalu sesuaikan nama constraint di ALTER TABLE statement
