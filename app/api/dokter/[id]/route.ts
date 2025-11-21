import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Delete dokter by id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dokterId = params.id;

    if (!dokterId) {
      return NextResponse.json(
        { success: false, message: 'ID dokter diperlukan' },
        { status: 400 }
      );
    }

    // Ambil nama dokter terlebih dahulu
    const [dokterRows] = await pool.execute(
      'SELECT nama_dokter FROM dokter WHERE id = ?',
      [dokterId]
    ) as any[];

    if (!dokterRows || dokterRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Dokter tidak ditemukan' },
        { status: 404 }
      );
    }

    const namaDokter = dokterRows[0].nama_dokter;

    // Cek apakah dokter digunakan di patients (dokter_pemeriksa)
    const [patientRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM patients WHERE dokter_pemeriksa = ?',
      [namaDokter]
    ) as any[];

    if (patientRows && patientRows.length > 0 && patientRows[0].count > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Dokter tidak dapat dihapus karena masih digunakan dalam data pasien' 
        },
        { status: 400 }
      );
    }

    // Hapus dokter
    const [result] = await pool.execute(
      'DELETE FROM dokter WHERE id = ?',
      [dokterId]
    ) as any[];

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Dokter tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Dokter berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting dokter:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus dokter', error: error.message },
      { status: 500 }
    );
  }
}

