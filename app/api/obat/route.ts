import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get all obat
export async function GET(request: NextRequest) {
  try {
    const [rows] = await pool.execute('SELECT * FROM obat ORDER BY nama_obat ASC');
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching obat data:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data obat', error: error.message },
      { status: 500 }
    );
  }
}

// Create new obat
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { nama_obat, satuan, stok, keterangan } = data;

    const [result] = await pool.execute(
      'INSERT INTO obat (nama_obat, satuan, stok, keterangan) VALUES (?, ?, ?, ?)',
      [nama_obat, satuan, stok || 0, keterangan || null]
    );

    return NextResponse.json({
      success: true,
      message: 'Data obat berhasil ditambahkan',
      id: (result as any).insertId,
    });
  } catch (error: any) {
    console.error('Error creating obat:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan data obat', error: error.message },
      { status: 500 }
    );
  }
}

