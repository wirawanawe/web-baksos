import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get all lokasi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const aktif = searchParams.get('aktif');

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
    const data = await request.json();
    const { nama_lokasi, alamat, keterangan, aktif = 'Y' } = data;

    if (!nama_lokasi || !nama_lokasi.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nama lokasi harus diisi' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      'INSERT INTO lokasi (nama_lokasi, alamat, keterangan, aktif) VALUES (?, ?, ?, ?)',
      [nama_lokasi.trim(), alamat || null, keterangan || null, aktif]
    );

    return NextResponse.json({
      success: true,
      message: 'Data lokasi berhasil ditambahkan',
      id: (result as any).insertId,
    });
  } catch (error: any) {
    console.error('Error creating lokasi:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan data lokasi', error: error.message },
      { status: 500 }
    );
  }
}

