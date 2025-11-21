import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Delete obat by id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const obatId = params.id;

    if (!obatId) {
      return NextResponse.json(
        { success: false, message: 'ID obat diperlukan' },
        { status: 400 }
      );
    }

    // Cek apakah obat digunakan di resep_detail
    const [resepRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM resep_detail WHERE obat_id = ?',
      [obatId]
    ) as any[];

    if (resepRows && resepRows.length > 0 && resepRows[0].count > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Obat tidak dapat dihapus karena masih digunakan dalam resep pasien' 
        },
        { status: 400 }
      );
    }

    // Hapus obat
    const [result] = await pool.execute(
      'DELETE FROM obat WHERE id = ?',
      [obatId]
    ) as any[];

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Obat tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Obat berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting obat:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus obat', error: error.message },
      { status: 500 }
    );
  }
}

