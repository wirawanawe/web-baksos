import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Test database connection first
    try {
      await pool.execute('SELECT 1');
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Gagal terhubung ke database. Pastikan file .env.local sudah dikonfigurasi dengan benar.',
          error: dbError.message 
        },
        { status: 500 }
      );
    }

    // Check if patients table exists
    const [tables] = await pool.execute(
      "SHOW TABLES LIKE 'patients'"
    ) as any[];

    if (tables.length === 0) {
      // Create patients table if not exists
      const createPatientsTableQuery = `
        CREATE TABLE IF NOT EXISTS patients (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tanggal_pemeriksaan DATE,
          nama VARCHAR(255) NOT NULL,
          no_ktp VARCHAR(20),
          no_telepon VARCHAR(20),
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
          keluhan TEXT,
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
          status ENUM('pendaftaran', 'perawat', 'dokter', 'farmasi', 'selesai') DEFAULT 'pendaftaran',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_created_at (created_at),
          INDEX idx_nama (nama),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;
      await pool.execute(createPatientsTableQuery);
    } else {
      // Table exists, check and add missing columns
      const [columns] = await pool.execute(
        "SHOW COLUMNS FROM patients"
      ) as any[];

      const columnNames = columns.map((col: any) => col.Field);

      // Add missing columns
      const migrations: string[] = [];

      if (!columnNames.includes('no_ktp')) {
        migrations.push('ALTER TABLE patients ADD COLUMN no_ktp VARCHAR(20) AFTER nama');
      }

      if (!columnNames.includes('no_telepon')) {
        migrations.push('ALTER TABLE patients ADD COLUMN no_telepon VARCHAR(20) AFTER no_ktp');
      }

      if (!columnNames.includes('keluhan')) {
        migrations.push('ALTER TABLE patients ADD COLUMN keluhan TEXT AFTER as_urat');
      }

      if (!columnNames.includes('resep')) {
        migrations.push('ALTER TABLE patients ADD COLUMN resep TEXT AFTER terapi');
      }

      if (!columnNames.includes('status')) {
        migrations.push("ALTER TABLE patients ADD COLUMN status ENUM('pendaftaran', 'perawat', 'dokter', 'farmasi', 'selesai') DEFAULT 'pendaftaran' AFTER dokter_pemeriksa");
      }

      // Execute migrations
      for (const migration of migrations) {
        try {
          await pool.execute(migration);
          console.log('Migration executed:', migration);
        } catch (migrationError: any) {
          console.error('Migration error:', migrationError);
          // Continue with other migrations even if one fails
        }
      }

      // Check if status index exists (after adding status column)
      if (columnNames.includes('status') || migrations.some(m => m.includes('status'))) {
        try {
          const [indexes] = await pool.execute(
            "SHOW INDEXES FROM patients WHERE Key_name = 'idx_status'"
          ) as any[];

          if (indexes.length === 0) {
            await pool.execute('ALTER TABLE patients ADD INDEX idx_status (status)');
          }
        } catch (indexError: any) {
          console.error('Index creation error:', indexError);
        }
      }
    }

    // Create obat table
    const createObatTableQuery = `
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
    `;

    await pool.execute(createObatTableQuery);

    // Create resep_detail table
    const createResepDetailTableQuery = `
      CREATE TABLE IF NOT EXISTS resep_detail (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        obat_id INT NOT NULL,
        jumlah INT NOT NULL,
        aturan_pakai TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (obat_id) REFERENCES obat(id) ON DELETE CASCADE,
        INDEX idx_patient_id (patient_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.execute(createResepDetailTableQuery);

    // Create dokter table
    const createDokterTableQuery = `
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
    `;

    await pool.execute(createDokterTableQuery);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Database setup berhasil! Semua tabel telah dibuat dan kolom yang diperlukan telah ditambahkan.' 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error setting up database:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Gagal setup database', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if table exists
    const [tables] = await pool.execute(
      "SHOW TABLES LIKE 'patients'"
    ) as any[];

    if (tables.length > 0) {
      // Get table structure
      const [columns] = await pool.execute(
        "DESCRIBE patients"
      ) as any[];

      return NextResponse.json({
        success: true,
        tableExists: true,
        columns: columns,
        message: 'Tabel patients sudah ada'
      });
    } else {
      return NextResponse.json({
        success: true,
        tableExists: false,
        message: 'Tabel patients belum dibuat. Gunakan POST /api/setup untuk membuat tabel.'
      });
    }
  } catch (error: any) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Gagal memeriksa database', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

