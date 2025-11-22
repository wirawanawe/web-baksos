import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Create lokasi table if not exists
export async function POST(request: NextRequest) {
  try {
    // Create lokasi table
    const createLokasiTableQuery = `
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
    `;
    
    await pool.execute(createLokasiTableQuery);

    return NextResponse.json({
      success: true,
      message: 'Tabel lokasi berhasil dibuat!',
    });
  } catch (error: any) {
    console.error('Error creating lokasi table:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Gagal membuat tabel lokasi', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

