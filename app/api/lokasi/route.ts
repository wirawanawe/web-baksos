import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get all lokasi
export async function GET(request: NextRequest) {
  try {
    // Check if kode column exists and add it if not
    let kodeColumnExists = false;
    try {
      const [kodeColumns] = await pool.execute(
        "SHOW COLUMNS FROM lokasi LIKE 'kode'"
      ) as any[];
      kodeColumnExists = kodeColumns.length > 0;
      
      if (!kodeColumnExists) {
        await pool.execute(`
          ALTER TABLE lokasi 
          ADD COLUMN kode VARCHAR(10) AFTER nama_lokasi
        `);
        kodeColumnExists = true;
      }
    } catch (migError: any) {
      console.error('Migration check error (continuing anyway):', migError.message);
    }
    
    const { searchParams } = new URL(request.url);
    const aktif = searchParams.get('aktif');

    // SELECT * will include kode if column exists
    let query = 'SELECT * FROM lokasi';
    const params: any[] = [];

    if (aktif === 'true') {
      query += ' WHERE aktif = ?';
      params.push('Y');
    }

    query += ' ORDER BY nama_lokasi ASC';

    const [rows] = await pool.execute(query, params);

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching lokasi:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data lokasi', error: error.message },
      { status: 500 }
    );
  }
}

// Create new lokasi
export async function POST(request: NextRequest) {
  try {
    // Check if kode column exists
    let kodeColumnExists = false;
    try {
      const [kodeColumns] = await pool.execute(
        "SHOW COLUMNS FROM lokasi LIKE 'kode'"
      ) as any[];
      kodeColumnExists = kodeColumns.length > 0;
      
      if (!kodeColumnExists) {
        await pool.execute(`
          ALTER TABLE lokasi 
          ADD COLUMN kode VARCHAR(10) AFTER nama_lokasi
        `);
        kodeColumnExists = true;
      }
    } catch (migError: any) {
      console.error('Migration check error (continuing anyway):', migError.message);
    }
    
    const data = await request.json();
    const { nama_lokasi, kode, alamat, keterangan, aktif = 'Y' } = data;

    if (!nama_lokasi || !nama_lokasi.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nama lokasi harus diisi' },
        { status: 400 }
      );
    }

    if (kodeColumnExists) {
      const [result] = await pool.execute(
        'INSERT INTO lokasi (nama_lokasi, kode, alamat, keterangan, aktif) VALUES (?, ?, ?, ?, ?)',
        [nama_lokasi.trim(), kode?.trim() || null, alamat || null, keterangan || null, aktif]
      );
      
      return NextResponse.json({
        success: true,
        message: 'Data lokasi berhasil ditambahkan',
        id: (result as any).insertId,
      });
    } else {
      const [result] = await pool.execute(
        'INSERT INTO lokasi (nama_lokasi, alamat, keterangan, aktif) VALUES (?, ?, ?, ?)',
        [nama_lokasi.trim(), alamat || null, keterangan || null, aktif]
      );
      
      return NextResponse.json({
        success: true,
        message: 'Data lokasi berhasil ditambahkan',
        id: (result as any).insertId,
      });
    }
  } catch (error: any) {
    console.error('Error creating lokasi:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan data lokasi', error: error.message },
      { status: 500 }
    );
  }
}

