-- Migration script: Update resep_detail table to use pemeriksaan_id instead of patient_id
-- Run this script if you get error: "Unknown column 'pemeriksaan_id' in 'field list'"

USE baksos_db;

-- Nonaktifkan foreign key checks sementara
SET FOREIGN_KEY_CHECKS = 0;

-- Check if table exists and has patient_id column
-- If it does, migrate it to pemeriksaan_id

-- Step 1: Drop foreign key constraints that reference patient_id
-- Get all foreign key constraints on resep_detail
SELECT CONCAT('ALTER TABLE resep_detail DROP FOREIGN KEY ', CONSTRAINT_NAME, ';') AS drop_statement
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'baksos_db'
  AND TABLE_NAME = 'resep_detail'
  AND COLUMN_NAME = 'patient_id';

-- Drop foreign keys (adjust constraint names based on output above)
-- Common constraint names:
ALTER TABLE resep_detail DROP FOREIGN KEY IF EXISTS resep_detail_ibfk_1;
ALTER TABLE resep_detail DROP FOREIGN KEY IF EXISTS resep_detail_ibfk_2;

-- Step 2: Check if patient_id column exists
-- If it exists, rename it to pemeriksaan_id
-- Note: This assumes patient_id values correspond to pemeriksaan.id
-- If your data structure is different, you may need to map patient_id to pemeriksaan_id first

-- Option A: If patient_id exists and you want to rename it
-- ALTER TABLE resep_detail CHANGE COLUMN patient_id pemeriksaan_id INT NOT NULL;

-- Option B: If you want to drop and recreate the table (WARNING: This will delete all data!)
-- DROP TABLE IF EXISTS resep_detail;

-- Step 3: Create table with correct schema (if it doesn't exist or was dropped)
CREATE TABLE IF NOT EXISTS resep_detail (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pemeriksaan_id INT NOT NULL,
  obat_id INT NOT NULL,
  jumlah INT NOT NULL,
  aturan_pakai TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pemeriksaan_id) REFERENCES pemeriksaan(id) ON DELETE CASCADE,
  FOREIGN KEY (obat_id) REFERENCES obat(id) ON DELETE CASCADE,
  INDEX idx_pemeriksaan_id (pemeriksaan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Aktifkan kembali foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify the table structure
DESCRIBE resep_detail;

