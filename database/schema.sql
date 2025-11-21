CREATE DATABASE IF NOT EXISTS baksos_db;
USE baksos_db;

-- Tabel untuk data personal pasien
CREATE TABLE IF NOT EXISTS pasien (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  no_ktp VARCHAR(20),
  no_telepon VARCHAR(20),
  jenis_kelamin ENUM('L', 'P') NOT NULL,
  tanggal_lahir DATE NOT NULL,
  alamat TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_no_ktp (no_ktp),
  UNIQUE KEY uk_no_telepon (no_telepon),
  INDEX idx_nama (nama),
  INDEX idx_no_ktp (no_ktp),
  INDEX idx_no_telepon (no_telepon)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel untuk hasil pemeriksaan pasien
CREATE TABLE IF NOT EXISTS pemeriksaan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pasien_id INT NOT NULL,
  tanggal_pemeriksaan DATE,
  -- Data dari Perawat
  tinggi_badan DECIMAL(5,2),
  berat_badan DECIMAL(5,2),
  tensi_darah_sistol INT,
  tensi_darah_diastol INT,
  kolesterol DECIMAL(5,2),
  gds DECIMAL(5,2),
  as_urat DECIMAL(5,2),
  keluhan TEXT,
  -- Data dari Dokter
  anamnesa TEXT,
  pemeriksaan_fisik TEXT,
  hpht DATE,
  hpl DATE,
  tfu DECIMAL(5,2),
  djj_anak INT,
  diagnosa TEXT,
  terapi TEXT,
  resep TEXT,
  dokter_pemeriksa VARCHAR(255),
  -- Status alur
  status ENUM('pendaftaran', 'perawat', 'dokter', 'farmasi', 'selesai') DEFAULT 'pendaftaran',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pasien_id) REFERENCES pasien(id) ON DELETE CASCADE,
  INDEX idx_pasien_id (pasien_id),
  INDEX idx_tanggal_pemeriksaan (tanggal_pemeriksaan),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_dokter_pemeriksa (dokter_pemeriksa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel untuk data obat
CREATE TABLE IF NOT EXISTS obat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_obat VARCHAR(255) NOT NULL,
  satuan VARCHAR(50) NOT NULL,
  stok INT DEFAULT 0,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nama_obat (nama_obat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel untuk resep pasien (detail obat yang diberikan)
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

-- Tabel untuk data dokter
CREATE TABLE IF NOT EXISTS dokter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_dokter VARCHAR(255) NOT NULL,
  spesialisasi VARCHAR(255),
  no_sip VARCHAR(50),
  no_telp VARCHAR(20),
  email VARCHAR(255),
  aktif ENUM('Y', 'N') DEFAULT 'Y',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nama_dokter (nama_dokter),
  INDEX idx_aktif (aktif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

