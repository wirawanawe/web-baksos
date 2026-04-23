CREATE DATABASE IF NOT EXISTS baksos_db_phc;
USE baksos_db_phc;

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

-- Tabel untuk data personal pasien
CREATE TABLE IF NOT EXISTS pasien (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  no_ktp VARCHAR(20),
  no_telepon VARCHAR(20),
  jenis_kelamin ENUM('L', 'P') NOT NULL,
  tanggal_lahir DATE NOT NULL,
  tempat_lahir VARCHAR(255),
  jabatan VARCHAR(255),
  unit VARCHAR(255),
  alamat TEXT NOT NULL,
  email VARCHAR(255),
  lokasi_penugasan VARCHAR(255),
  tanggal_mulai_tugas DATE,
  durasi_penugasan VARCHAR(100),
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
  imt DECIMAL(5,2),
  tensi_darah_sistol INT,
  tensi_darah_diastol INT,
  denyut_nadi INT,
  suhu_tubuh DECIMAL(4,2),
  laju_pernapasan INT,
  kolesterol DECIMAL(5,2),
  gds DECIMAL(5,2),
  as_urat DECIMAL(5,2),
  keluhan TEXT,
  
  -- Riwayat Penyakit Dahulu (Doctor)
  riwayat_malaria ENUM('Ya', 'Tidak') DEFAULT 'Tidak',
  riwayat_malaria_ket TEXT,
  riwayat_kronis ENUM('Ya', 'Tidak') DEFAULT 'Tidak',
  riwayat_kronis_ket TEXT,
  riwayat_rawat_inap ENUM('Ya', 'Tidak') DEFAULT 'Tidak',
  riwayat_rawat_inap_ket TEXT,
  riwayat_alergi_obat ENUM('Ya', 'Tidak') DEFAULT 'Tidak',
  riwayat_alergi_obat_ket TEXT,
  riwayat_merokok ENUM('Ya', 'Tidak') DEFAULT 'Tidak',
  riwayat_merokok_ket TEXT,
  riwayat_alkohol ENUM('Ya', 'Tidak') DEFAULT 'Tidak',
  riwayat_alkohol_ket TEXT,
  riwayat_obat_rutin ENUM('Ya', 'Tidak') DEFAULT 'Tidak',
  riwayat_obat_rutin_ket TEXT,
  catatan_khusus TEXT,

  -- Pemeriksaan Fisik (Relevan) (Doctor)
  fisik_keadaan_umum ENUM('Baik', 'Kurang Baik') DEFAULT 'Baik',
  fisik_keadaan_umum_ket TEXT,
  fisik_kepala_leher TEXT,
  fisik_jantung TEXT,
  fisik_paru TEXT,
  fisik_abdomen TEXT,
  fisik_ekstremitas TEXT,
  fisik_kulit TEXT,
  fisik_lain_lain TEXT,

  -- Data dari Dokter
  anamnesa TEXT,
  pemeriksaan_fisik TEXT,
  hpht DATE,
  hpl DATE,
  tfu DECIMAL(5,2),
  djj_anak INT,
  diagnosa TEXT,
  alergi TEXT,
  terapi TEXT,
  resep TEXT,
  kesimpulan_kelayakan ENUM('FIT', 'FIT WITH NOTE', 'UNFIT'),
  saran_medis TEXT,
  dokter_pemeriksa VARCHAR(255),
  lokasi_id INT,
  -- Status alur
  status ENUM('pendaftaran', 'perawat', 'dokter', 'farmasi', 'selesai', 'dibatalkan') DEFAULT 'pendaftaran',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pasien_id) REFERENCES pasien(id) ON DELETE CASCADE,
  FOREIGN KEY (lokasi_id) REFERENCES lokasi(id) ON DELETE SET NULL,
  INDEX idx_pasien_id (pasien_id),
  INDEX idx_tanggal_pemeriksaan (tanggal_pemeriksaan),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_dokter_pemeriksa (dokter_pemeriksa),
  INDEX idx_lokasi_id (lokasi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel untuk data obat
CREATE TABLE IF NOT EXISTS obat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_obat VARCHAR(255) NOT NULL,
  satuan VARCHAR(50) NOT NULL,
  stok INT DEFAULT 0,
  keterangan TEXT,
  lokasi_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lokasi_id) REFERENCES lokasi(id) ON DELETE SET NULL,
  INDEX idx_nama_obat (nama_obat),
  INDEX idx_lokasi_id (lokasi_id)
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
  lokasi_id INT,
  aktif ENUM('Y', 'N') DEFAULT 'Y',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lokasi_id) REFERENCES lokasi(id) ON DELETE SET NULL,
  INDEX idx_nama_dokter (nama_dokter),
  INDEX idx_aktif (aktif),
  INDEX idx_lokasi_id (lokasi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


