import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

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

    // Create table if not exists
    const createTableQuery = `
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
    `;

    await pool.execute(createTableQuery);

    // Verify table exists
    const [tables] = await pool.execute(
      "SHOW TABLES LIKE 'patients'"
    ) as any[];

    if (tables.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Gagal membuat tabel patients' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Database setup berhasil! Tabel patients telah dibuat.' 
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

