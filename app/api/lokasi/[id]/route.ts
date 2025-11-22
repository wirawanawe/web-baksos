import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Update lokasi
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const id = params.id;
    const data = await request.json();
    const { nama_lokasi, kode, alamat, keterangan, aktif } = data;

    console.log('PUT /api/lokasi/[id] - Received data:', { id, data });
    console.log('kodeColumnExists:', kodeColumnExists);

    if (!nama_lokasi || !nama_lokasi.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nama lokasi harus diisi' },
        { status: 400 }
      );
    }

    if (kodeColumnExists) {
      const updateParams = [nama_lokasi.trim(), kode?.trim() || null, alamat || null, keterangan || null, aktif || 'Y', id];
      console.log('UPDATE query params:', updateParams);
      
      const [result] = await pool.execute(
        'UPDATE lokasi SET nama_lokasi = ?, kode = ?, alamat = ?, keterangan = ?, aktif = ? WHERE id = ?',
        updateParams
      );
      
      console.log('UPDATE result:', { affectedRows: (result as any).affectedRows });
      
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
    } else {
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
    }
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

