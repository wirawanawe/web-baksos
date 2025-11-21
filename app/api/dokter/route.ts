import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get all dokter
export async function GET(request: NextRequest) {
  try {
    // Check if table exists, if not create it
    try {
      await pool.execute('SELECT 1 FROM dokter LIMIT 1');
    } catch (tableError: any) {
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        // Create table if not exists
        const createDokterTableQuery = `
          CREATE TABLE IF NOT EXISTS dokter (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama_dokter VARCHAR(255) NOT NULL,
            spesialisasi VARCHAR(255),
            no_sip VARCHAR(50),
            no_telp VARCHAR(20),
            email VARCHAR(255),
            aktif ENUM('Y', 'N') DEFAULT 'Y',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_nama_dokter (nama_dokter),
            INDEX idx_aktif (aktif)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.execute(createDokterTableQuery);
      } else {
        throw tableError;
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const aktifOnly = searchParams.get('aktif') === 'true';

    let query = 'SELECT DISTINCT id, nama_dokter, spesialisasi, no_sip, no_telp, email, aktif FROM dokter';
    if (aktifOnly) {
      query += " WHERE aktif = 'Y'";
    }
    query += ' ORDER BY nama_dokter ASC';

    const [rows] = await pool.execute(query);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching dokter data:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data dokter', error: error.message },
      { status: 500 }
    );
  }
}

// Create new dokter
export async function POST(request: NextRequest) {
  try {
    // Check if table exists, if not create it
    try {
      await pool.execute('SELECT 1 FROM dokter LIMIT 1');
    } catch (tableError: any) {
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        // Create table if not exists
        const createDokterTableQuery = `
          CREATE TABLE IF NOT EXISTS dokter (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama_dokter VARCHAR(255) NOT NULL,
            spesialisasi VARCHAR(255),
            no_sip VARCHAR(50),
            no_telp VARCHAR(20),
            email VARCHAR(255),
            aktif ENUM('Y', 'N') DEFAULT 'Y',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_nama_dokter (nama_dokter),
            INDEX idx_aktif (aktif)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.execute(createDokterTableQuery);
      } else {
        throw tableError;
      }
    }

    const data = await request.json();
    const { nama_dokter, spesialisasi, no_sip, no_telp, email, aktif } = data;

    // Check for duplicate nama_dokter
    const [existing] = await pool.execute(
      'SELECT id FROM dokter WHERE nama_dokter = ?',
      [nama_dokter]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(
        { success: false, message: `Dokter dengan nama "${nama_dokter}" sudah ada di database` },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      'INSERT INTO dokter (nama_dokter, spesialisasi, no_sip, no_telp, email, aktif) VALUES (?, ?, ?, ?, ?, ?)',
      [nama_dokter, spesialisasi || null, no_sip || null, no_telp || null, email || null, aktif || 'Y']
    );

    return NextResponse.json({
      success: true,
      message: 'Data dokter berhasil ditambahkan',
      id: (result as any).insertId,
    });
  } catch (error: any) {
    console.error('Error creating dokter:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan data dokter', error: error.message },
      { status: 500 }
    );
  }
}

// Delete duplicate dokter (keep the oldest one based on id)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'remove-duplicates') {
      // Find and delete duplicates, keeping the one with the smallest id
      const deleteDuplicatesQuery = `
        DELETE d1 FROM dokter d1
        INNER JOIN dokter d2 
        WHERE d1.id > d2.id 
        AND d1.nama_dokter = d2.nama_dokter
      `;

      const [result] = await pool.execute(deleteDuplicatesQuery);
      const deletedCount = (result as any).affectedRows || 0;

      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus ${deletedCount} data duplikat`,
        deletedCount,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Action tidak valid' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error deleting duplicates:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus duplikat', error: error.message },
      { status: 500 }
    );
  }
}

