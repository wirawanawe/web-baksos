import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Update dokter by id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dokterId = params.id;
    const data = await request.json();
    const { nama_dokter, spesialisasi, no_sip, no_telp, email, lokasi_id, aktif = 'Y' } = data;

    if (!dokterId) {
      return NextResponse.json(
        { success: false, message: 'ID dokter diperlukan' },
        { status: 400 }
      );
    }

    // Check if dokter exists
    const [existingRows] = await pool.execute(
      'SELECT id FROM dokter WHERE id = ?',
      [dokterId]
    ) as any[];

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Dokter tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check for duplicate nama_dokter (excluding current dokter)
    const [duplicateRows] = await pool.execute(
      'SELECT id FROM dokter WHERE nama_dokter = ? AND id != ?',
      [nama_dokter, dokterId]
    ) as any[];

    if (duplicateRows && duplicateRows.length > 0) {
      return NextResponse.json(
        { success: false, message: `Dokter dengan nama "${nama_dokter}" sudah ada di database` },
        { status: 400 }
      );
    }

    // Update dokter
    const [result] = await pool.execute(
      'UPDATE dokter SET nama_dokter = ?, spesialisasi = ?, no_sip = ?, no_telp = ?, email = ?, lokasi_id = ?, aktif = ? WHERE id = ?',
      [nama_dokter, spesialisasi || null, no_sip || null, no_telp || null, email || null, lokasi_id || null, aktif || 'Y', dokterId]
    ) as any[];

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada perubahan data' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Data dokter berhasil diupdate',
    });
  } catch (error: any) {
    console.error('Error updating dokter:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengupdate data dokter', error: error.message },
      { status: 500 }
    );
  }
}

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

    // Cek apakah dokter digunakan di pemeriksaan (dokter_pemeriksa)
    const [patientRows] = await pool.execute(
      'SELECT COUNT(*) as count FROM pemeriksaan WHERE dokter_pemeriksa = ?',
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
