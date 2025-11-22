import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get all obat
export async function GET(request: NextRequest) {
  try {
    // Check and migrate if lokasi_id column doesn't exist
    let lokasiIdColumnExists = false;
    try {
      const [columns] = await pool.execute(
        "SHOW COLUMNS FROM obat LIKE 'lokasi_id'"
      ) as any[];
      
      lokasiIdColumnExists = columns.length > 0;
      
      if (!lokasiIdColumnExists) {
        console.log('lokasi_id column not found in obat table, adding it...');
        
        // First ensure lokasi table exists
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
        
        // Add lokasi_id column
        await pool.execute(`
          ALTER TABLE obat 
          ADD COLUMN lokasi_id INT AFTER keterangan
        `);
        
        // Add index
        try {
          await pool.execute(`
            ALTER TABLE obat 
            ADD INDEX idx_lokasi_id (lokasi_id)
          `);
        } catch (idxError: any) {
          console.log('Index note:', idxError.message);
        }
        
        // Add foreign key constraint
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
        console.log('lokasi_id column added successfully to obat table');
      }
    } catch (migError: any) {
      console.error('Migration check error (continuing anyway):', migError.message);
      // Continue without lokasi_id column
      lokasiIdColumnExists = false;
    }

    const searchParams = request.nextUrl.searchParams;
    const lokasi_id = searchParams.get('lokasi_id');

    // Build query with optional lokasi_id filter
    let query = 'SELECT * FROM obat';
    const params: any[] = [];
    
    if (lokasi_id && lokasiIdColumnExists) {
      query += ' WHERE lokasi_id = ?';
      params.push(parseInt(lokasi_id));
    } else if (lokasi_id && !lokasiIdColumnExists) {
      // If lokasi_id is requested but column doesn't exist, return empty array
      return NextResponse.json({ success: true, data: [] });
    }
    
    query += ' ORDER BY nama_obat ASC';
    
    const [rows] = await pool.execute(query, params);
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
    // Check and migrate if lokasi_id column doesn't exist
    let lokasiIdColumnExists = false;
    try {
      const [columns] = await pool.execute(
        "SHOW COLUMNS FROM obat LIKE 'lokasi_id'"
      ) as any[];
      
      lokasiIdColumnExists = columns.length > 0;
      
      if (!lokasiIdColumnExists) {
        // Ensure lokasi table exists first
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

    const data = await request.json();
    const { nama_obat, satuan, stok, keterangan, lokasi_id } = data;

    // Cek duplikat berdasarkan nama_obat DAN lokasi_id (bukan hanya nama_obat)
    // Data obat yang sama bisa ada di lokasi yang berbeda
    let duplicateQuery: string;
    let duplicateParams: any[];
    
    if (lokasiIdColumnExists && lokasi_id) {
      duplicateQuery = 'SELECT id FROM obat WHERE LOWER(nama_obat) = LOWER(?) AND lokasi_id = ?';
      duplicateParams = [nama_obat, lokasi_id];
    } else if (lokasiIdColumnExists && !lokasi_id) {
      duplicateQuery = 'SELECT id FROM obat WHERE LOWER(nama_obat) = LOWER(?) AND (lokasi_id IS NULL OR lokasi_id = 0)';
      duplicateParams = [nama_obat];
    } else {
      duplicateQuery = 'SELECT id FROM obat WHERE LOWER(nama_obat) = LOWER(?)';
      duplicateParams = [nama_obat];
    }
    
    const [existing] = await pool.execute(duplicateQuery, duplicateParams) as any[];
    
    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(
        { success: false, message: `Obat dengan nama "${nama_obat}" sudah ada di lokasi ini` },
        { status: 400 }
      );
    }

    let query: string;
    let params: any[];
    
    if (lokasiIdColumnExists) {
      query = 'INSERT INTO obat (nama_obat, satuan, stok, keterangan, lokasi_id) VALUES (?, ?, ?, ?, ?)';
      params = [nama_obat, satuan, stok || 0, keterangan || null, lokasi_id || null];
    } else {
      query = 'INSERT INTO obat (nama_obat, satuan, stok, keterangan) VALUES (?, ?, ?, ?)';
      params = [nama_obat, satuan, stok || 0, keterangan || null];
    }

    const [result] = await pool.execute(query, params);

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

