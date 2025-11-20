CREATE DATABASE IF NOT EXISTS baksos_db;
USE baksos_db;

CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal_pemeriksaan DATE,
  nama VARCHAR(255) NOT NULL,
  jenis_kelamin ENUM('L', 'P') NOT NULL,
  usia INT NOT NULL,
  alamat TEXT NOT NULL,
  tinggi_badan DECIMAL(5,2),
  berat_badan DECIMAL(5,2),
  tensi_darah_sistol INT,
  tensi_darah_diastol INT,
  kolesterol DECIMAL(5,2),
  gds DECIMAL(5,2),
  as_urat DECIMAL(5,2),
  anamnesa TEXT,
  pemeriksaan_fisik TEXT,
  hpht DATE,
  hpl DATE,
  tfu DECIMAL(5,2),
  djj_anak INT,
  diagnosa TEXT,
  terapi TEXT,
  dokter_pemeriksa VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_nama (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

