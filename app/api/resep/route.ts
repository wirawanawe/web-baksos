import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Create resep detail
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const data = await request.json();
    const { pemeriksaan_id, obat_id, jumlah, aturan_pakai } = data;

    // Validasi: jumlah harus lebih dari 0
    if (!jumlah || jumlah <= 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, message: 'Jumlah obat harus lebih dari 0' },
        { status: 400 }
      );
    }

    // Cek stok obat yang tersedia
    const [obatRows] = await connection.execute(
      'SELECT id, nama_obat, stok FROM obat WHERE id = ?',
      [obat_id]
    ) as any[];

    if (!obatRows || obatRows.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, message: 'Obat tidak ditemukan' },
        { status: 404 }
      );
    }

    const obat = obatRows[0];
    const stokTersedia = obat.stok || 0;

    // Validasi: stok harus cukup
    if (stokTersedia < jumlah) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { 
          success: false, 
          message: `Stok ${obat.nama_obat} tidak cukup. Stok tersedia: ${stokTersedia}, jumlah yang diminta: ${jumlah}` 
        },
        { status: 400 }
      );
    }

    // Simpan resep detail
    const [result] = await connection.execute(
      'INSERT INTO resep_detail (pemeriksaan_id, obat_id, jumlah, aturan_pakai) VALUES (?, ?, ?, ?)',
      [pemeriksaan_id, obat_id, jumlah, aturan_pakai || null]
    );

    // Kurangi stok obat
    const stokBaru = stokTersedia - jumlah;
    await connection.execute(
      'UPDATE obat SET stok = ? WHERE id = ?',
      [stokBaru, obat_id]
    );

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: 'Resep berhasil ditambahkan dan stok obat telah dikurangi',
      id: (result as any).insertId,
      stok_terbaru: stokBaru,
    });
  } catch (error: any) {
    await connection.rollback();
    connection.release();
    console.error('Error creating resep:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan resep', error: error.message },
      { status: 500 }
    );
  }
}

// Get resep by pemeriksaan_id
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pemeriksaanId = searchParams.get('pemeriksaan_id');
    const patientId = searchParams.get('patient_id'); // Backward compatibility

    // Support both pemeriksaan_id (new) and patient_id (old) for backward compatibility
    const idParam = pemeriksaanId || patientId;

    if (!idParam) {
      return NextResponse.json(
        { success: false, message: 'pemeriksaan_id atau patient_id diperlukan' },
        { status: 400 }
      );
    }

    // If patient_id is used, we need to get pemeriksaan_id first
    let pemeriksaanIdToUse = idParam;
    
    if (patientId && !pemeriksaanId) {
      // Get the latest pemeriksaan for this patient
      const [pemeriksaanRows] = await pool.execute(
        'SELECT id FROM pemeriksaan WHERE pasien_id = ? ORDER BY created_at DESC LIMIT 1',
        [patientId]
      ) as any[];
      
      if (pemeriksaanRows && pemeriksaanRows.length > 0) {
        pemeriksaanIdToUse = pemeriksaanRows[0].id;
      } else {
        return NextResponse.json(
          { success: false, message: 'Pemeriksaan tidak ditemukan untuk pasien ini' },
          { status: 404 }
        );
      }
    }

    const [rows] = await pool.execute(
      `SELECT rd.*, o.nama_obat, o.satuan 
       FROM resep_detail rd 
       JOIN obat o ON rd.obat_id = o.id 
       WHERE rd.pemeriksaan_id = ? 
       ORDER BY rd.created_at DESC`,
      [pemeriksaanIdToUse]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching resep:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data resep', error: error.message },
      { status: 500 }
    );
  }
}

// Delete resep detail dan kembalikan stok obat
export async function DELETE(request: NextRequest) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const searchParams = request.nextUrl.searchParams;
    const resepId = searchParams.get('id');

    if (!resepId) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, message: 'ID resep diperlukan' },
        { status: 400 }
      );
    }

    // Ambil data resep untuk mendapatkan obat_id dan jumlah
    const [resepRows] = await connection.execute(
      'SELECT obat_id, jumlah FROM resep_detail WHERE id = ?',
      [resepId]
    ) as any[];

    if (!resepRows || resepRows.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, message: 'Resep tidak ditemukan' },
        { status: 404 }
      );
    }

    const resep = resepRows[0];
    const obatId = resep.obat_id;
    const jumlah = resep.jumlah;

    // Hapus resep detail
    await connection.execute(
      'DELETE FROM resep_detail WHERE id = ?',
      [resepId]
    );

    // Kembalikan stok obat
    const [obatRows] = await connection.execute(
      'SELECT stok FROM obat WHERE id = ?',
      [obatId]
    ) as any[];

    if (obatRows && obatRows.length > 0) {
      const stokSekarang = obatRows[0].stok || 0;
      const stokBaru = stokSekarang + jumlah;
      
      await connection.execute(
        'UPDATE obat SET stok = ? WHERE id = ?',
        [stokBaru, obatId]
      );
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: 'Resep berhasil dihapus dan stok obat telah dikembalikan',
    });
  } catch (error: any) {
    await connection.rollback();
    connection.release();
    console.error('Error deleting resep:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus resep', error: error.message },
      { status: 500 }
    );
  }
}
