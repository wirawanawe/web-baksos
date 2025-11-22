USE baksos_db;

-- Add lokasi_id column to pemeriksaan table
ALTER TABLE pemeriksaan 
ADD COLUMN lokasi_id INT AFTER dokter_pemeriksa;

-- Add foreign key constraint
ALTER TABLE pemeriksaan 
ADD CONSTRAINT fk_pemeriksaan_lokasi 
FOREIGN KEY (lokasi_id) REFERENCES lokasi(id) ON DELETE SET NULL;

-- Add index for lokasi_id
ALTER TABLE pemeriksaan 
ADD INDEX idx_lokasi_id (lokasi_id);

