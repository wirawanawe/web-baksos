import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Update obat by id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check and migrate if lokasi_id column doesn't exist
    let lokasiIdColumnExists = false;
    try {
      const [columns] = await pool.execute(
        "SHOW COLUMNS FROM obat LIKE 'lokasi_id'"
      ) as any[];
      
      lokasiIdColumnExists = columns.length > 0;
      
      if (!lokasiIdColumnExists) {
        const [lokasiTables] = await pool.execute(
          "SHOW TABLES LIKE 'lokasi'"
        ) as any[];
        
        if (lokasiTables.length === 0) {
          await pool.execute(`
            CREATE TABLE IF NOT EXISTS lokasi (
              id INT AUTO_INCREMENT PRIMARY KEY,
              nama_lokasi VARCHAR(255) NOT NULL,
              alamat TEXT,
              keterangan TEXT,
              aktif ENUM('Y', 'N') DEFAULT 'Y',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_nama_lokasi (nama_lokasi),
              INDEX idx_aktif (aktif)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `);
        }
        
        await pool.execute(`
          ALTER TABLE obat 
          ADD COLUMN lokasi_id INT AFTER keterangan
        `);
        
        try {
          await pool.execute(`
            ALTER TABLE obat 
            ADD INDEX idx_lokasi_id (lokasi_id)
          `);
        } catch (idxError: any) {
          console.log('Index note:', idxError.message);
        }
        
        try {
          await pool.execute(`
            ALTER TABLE obat 
            ADD CONSTRAINT fk_obat_lokasi 
            FOREIGN KEY (lokasi_id) REFERENCES lokasi(id) ON DELETE SET NULL
          `);
        } catch (fkError: any) {
          console.log('Foreign key constraint note:', fkError.message);
        }
        
        lokasiIdColumnExists = true;
      }
    } catch (migError: any) {
      console.error('Migration check error (continuing anyway):', migError.message);
    }

    const obatId = params.id;
    const data = await request.json();
    const { nama_obat, satuan, stok, keterangan, lokasi_id } = data;

    if (!obatId) {
      return NextResponse.json(
        { success: false, message: 'ID obat diperlukan' },
        { status: 400 }
      );
    }

    // Cek apakah obat ada
    const [existingRows] = await pool.execute(
      'SELECT id FROM obat WHERE id = ?',
      [obatId]
    ) as any[];

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Obat tidak ditemukan' },
        { status: 404 }
      );
    }

    // Update obat
    let query: string;
    let queryParams: any[];
    
    if (lokasiIdColumnExists) {
      query = 'UPDATE obat SET nama_obat = ?, satuan = ?, stok = ?, keterangan = ?, lokasi_id = ? WHERE id = ?';
      queryParams = [nama_obat, satuan, stok || 0, keterangan || null, lokasi_id || null, obatId];
    } else {
      query = 'UPDATE obat SET nama_obat = ?, satuan = ?, stok = ?, keterangan = ? WHERE id = ?';
      queryParams = [nama_obat, satuan, stok || 0, keterangan || null, obatId];
    }
    
    await pool.execute(query, queryParams);

    return NextResponse.json({
      success: true,
      message: 'Data obat berhasil diupdate',
    });
  } catch (error: any) {
    console.error('Error updating obat:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengupdate obat', error: error.message },
      { status: 500 }
    );
  }
}

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

