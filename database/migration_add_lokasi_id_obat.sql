USE baksos_db;

-- Ensure lokasi table exists
CREATE TABLE IF NOT EXISTS lokasi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_lokasi VARCHAR(255) NOT NULL,
  alamat TEXT,
  keterangan TEXT,
  aktif ENUM('Y', 'N') DEFAULT 'Y',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nama_lokasi (nama_lokasi),
  INDEX idx_aktif (aktif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add lokasi_id column to obat table
ALTER TABLE obat 
ADD COLUMN lokasi_id INT AFTER keterangan;

-- Add index for lokasi_id
ALTER TABLE obat 
ADD INDEX idx_lokasi_id (lokasi_id);

-- Add foreign key constraint
ALTER TABLE obat 
ADD CONSTRAINT fk_obat_lokasi 
FOREIGN KEY (lokasi_id) REFERENCES lokasi(id) ON DELETE SET NULL;

