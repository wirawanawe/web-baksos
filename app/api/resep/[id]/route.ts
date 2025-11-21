import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Update resep detail
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const resepId = params.id;
    const data = await request.json();
    const { jumlah, aturan_pakai } = data;

    if (!resepId) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: 'ID resep diperlukan' },
        { status: 400 }
      );
    }

    // Validasi: jumlah harus lebih dari 0
    if (jumlah !== undefined && (!jumlah || jumlah <= 0)) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: 'Jumlah obat harus lebih dari 0' },
        { status: 400 }
      );
    }

    // Ambil data resep lama untuk mendapatkan obat_id dan jumlah lama
    const [resepRows] = await connection.execute(
      'SELECT obat_id, jumlah FROM resep_detail WHERE id = ?',
      [resepId]
    ) as any[];

    if (!resepRows || resepRows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: 'Resep tidak ditemukan' },
        { status: 404 }
      );
    }

    const resepLama = resepRows[0];
    const obatId = resepLama.obat_id;
    const jumlahLama = resepLama.jumlah;
    const jumlahBaru = jumlah !== undefined ? jumlah : jumlahLama;

    // Jika jumlah berubah, perlu update stok
    if (jumlah !== undefined && jumlah !== jumlahLama) {
      // Cek stok obat yang tersedia
      const [obatRows] = await connection.execute(
        'SELECT id, nama_obat, stok FROM obat WHERE id = ?',
        [obatId]
      ) as any[];

      if (!obatRows || obatRows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { success: false, message: 'Obat tidak ditemukan' },
          { status: 404 }
        );
      }

      const obat = obatRows[0];
      const stokSekarang = obat.stok || 0;

      // Kembalikan stok lama terlebih dahulu
      const stokSetelahKembali = stokSekarang + jumlahLama;

      // Validasi: stok harus cukup untuk jumlah baru
      if (stokSetelahKembali < jumlahBaru) {
        await connection.rollback();
        return NextResponse.json(
          { 
            success: false, 
            message: `Stok ${obat.nama_obat} tidak cukup. Stok tersedia setelah dikembalikan: ${stokSetelahKembali}, jumlah yang diminta: ${jumlahBaru}` 
          },
          { status: 400 }
        );
      }

      // Update stok: kembalikan stok lama, kurangi dengan jumlah baru
      const stokBaru = stokSetelahKembali - jumlahBaru;
      await connection.execute(
        'UPDATE obat SET stok = ? WHERE id = ?',
        [stokBaru, obatId]
      );
    }

    // Update resep detail
    const updates: string[] = [];
    const values: any[] = [];

    if (jumlah !== undefined) {
      updates.push('jumlah = ?');
      values.push(jumlahBaru);
    }

    if (aturan_pakai !== undefined) {
      updates.push('aturan_pakai = ?');
      values.push(aturan_pakai || null);
    }

    if (updates.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: 'Tidak ada data yang diupdate' },
        { status: 400 }
      );
    }

    values.push(resepId);
    await connection.execute(
      `UPDATE resep_detail SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'Resep berhasil diupdate',
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error updating resep:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengupdate resep', error: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

