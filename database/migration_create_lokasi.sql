USE baksos_db;

-- Tabel untuk lokasi Baksos
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

