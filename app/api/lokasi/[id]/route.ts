import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Update lokasi
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const data = await request.json();
    const { nama_lokasi, alamat, keterangan, aktif } = data;

    if (!nama_lokasi || !nama_lokasi.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nama lokasi harus diisi' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      'UPDATE lokasi SET nama_lokasi = ?, alamat = ?, keterangan = ?, aktif = ? WHERE id = ?',
      [nama_lokasi.trim(), alamat || null, keterangan || null, aktif || 'Y', id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Data lokasi tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Data lokasi berhasil diupdate',
    });
  } catch (error: any) {
    console.error('Error updating lokasi:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengupdate data lokasi', error: error.message },
      { status: 500 }
    );
  }
}

// Delete lokasi
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Check if lokasi is being used (you can add this check if needed)
    // For now, just delete it
    const [result] = await pool.execute('DELETE FROM lokasi WHERE id = ?', [id]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Data lokasi tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Data lokasi berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting lokasi:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus data lokasi', error: error.message },
      { status: 500 }
    );
  }
}

