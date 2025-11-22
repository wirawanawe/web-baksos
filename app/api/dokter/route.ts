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
        // First check if lokasi table exists, if not create it
        try {
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
        } catch (lokasiError) {
          console.error('Error checking/creating lokasi table:', lokasiError);
        }

        // Create table if not exists
        const createDokterTableQuery = `
          CREATE TABLE IF NOT EXISTS dokter (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama_dokter VARCHAR(255) NOT NULL,
            spesialisasi VARCHAR(255),
            no_sip VARCHAR(50),
            no_telp VARCHAR(20),
            email VARCHAR(255),
            lokasi_id INT,
            aktif ENUM('Y', 'N') DEFAULT 'Y',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_nama_dokter (nama_dokter),
            INDEX idx_aktif (aktif),
            INDEX idx_lokasi_id (lokasi_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.execute(createDokterTableQuery);
      } else {
        throw tableError;
      }
    }

    // Check if lokasi_id column exists, if not add it (migration for existing tables)
    let lokasiIdColumnExists = false;
    try {
      const [columns] = await pool.execute(
        "SHOW COLUMNS FROM dokter LIKE 'lokasi_id'"
      ) as any[];
      
      lokasiIdColumnExists = columns.length > 0;
      
      if (!lokasiIdColumnExists) {
        console.log('lokasi_id column not found in dokter table, adding it...');
        
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
          ALTER TABLE dokter 
          ADD COLUMN lokasi_id INT AFTER email
        `);
        
        // Add index
        try {
          await pool.execute(`
            ALTER TABLE dokter 
            ADD INDEX idx_lokasi_id (lokasi_id)
          `);
        } catch (idxError: any) {
          console.log('Index note:', idxError.message);
        }
        
        // Add foreign key constraint
        try {
          await pool.execute(`
            ALTER TABLE dokter 
            ADD CONSTRAINT fk_dokter_lokasi 
            FOREIGN KEY (lokasi_id) REFERENCES lokasi(id) ON DELETE SET NULL
          `);
        } catch (fkError: any) {
          console.log('Foreign key constraint note:', fkError.message);
        }
        
        lokasiIdColumnExists = true;
        console.log('lokasi_id column added successfully to dokter table');
      }
    } catch (migError: any) {
      console.error('Migration check error (continuing anyway):', migError.message);
      // Continue without lokasi_id column
      lokasiIdColumnExists = false;
    }

    const searchParams = request.nextUrl.searchParams;
    const aktifOnly = searchParams.get('aktif') === 'true';

    // Only include lokasi_id in SELECT if column exists
    let query = `SELECT DISTINCT id, nama_dokter, spesialisasi, no_sip, no_telp, email${lokasiIdColumnExists ? ', lokasi_id' : ''}, aktif FROM dokter`;
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
        // First check if lokasi table exists, if not create it
        try {
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
        } catch (lokasiError) {
          console.error('Error checking/creating lokasi table:', lokasiError);
        }

        // Create table if not exists
        const createDokterTableQuery = `
          CREATE TABLE IF NOT EXISTS dokter (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama_dokter VARCHAR(255) NOT NULL,
            spesialisasi VARCHAR(255),
            no_sip VARCHAR(50),
            no_telp VARCHAR(20),
            email VARCHAR(255),
            lokasi_id INT,
            aktif ENUM('Y', 'N') DEFAULT 'Y',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_nama_dokter (nama_dokter),
            INDEX idx_aktif (aktif),
            INDEX idx_lokasi_id (lokasi_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.execute(createDokterTableQuery);

        // Check if lokasi_id column exists, if not add it
        try {
          const [columns] = await pool.execute(
            "SHOW COLUMNS FROM dokter LIKE 'lokasi_id'"
          ) as any[];
          
          if (columns.length === 0) {
            await pool.execute(`
              ALTER TABLE dokter 
              ADD COLUMN lokasi_id INT AFTER email
            `);
            
            try {
              await pool.execute(`
                ALTER TABLE dokter 
                ADD INDEX idx_lokasi_id (lokasi_id)
              `);
            } catch (idxError: any) {
              console.log('Index note:', idxError.message);
            }
            
            try {
              await pool.execute(`
                ALTER TABLE dokter 
                ADD CONSTRAINT fk_dokter_lokasi 
                FOREIGN KEY (lokasi_id) REFERENCES lokasi(id) ON DELETE SET NULL
              `);
            } catch (fkError: any) {
              console.log('Foreign key constraint note:', fkError.message);
            }
          }
        } catch (migError: any) {
          console.error('Error migrating dokter table:', migError);
        }
      } else {
        throw tableError;
      }
    }

    const data = await request.json();
    const { nama_dokter, spesialisasi, no_sip, no_telp, email, lokasi_id, aktif = 'Y' } = data;

    // Check and migrate if lokasi_id column doesn't exist
    let lokasiIdColumnExists = false;
    try {
      const [columns] = await pool.execute(
        "SHOW COLUMNS FROM dokter LIKE 'lokasi_id'"
      ) as any[];
      
      lokasiIdColumnExists = columns.length > 0;
    } catch (migError: any) {
      console.error('Migration check error (continuing anyway):', migError.message);
    }

    // Cek duplikat berdasarkan nama_dokter DAN lokasi_id (bukan hanya nama_dokter)
    // Data dokter yang sama bisa ada di lokasi yang berbeda
    let duplicateQuery: string;
    let duplicateParams: any[];
    
    if (lokasiIdColumnExists && lokasi_id) {
      duplicateQuery = 'SELECT id FROM dokter WHERE LOWER(nama_dokter) = LOWER(?) AND lokasi_id = ?';
      duplicateParams = [nama_dokter, lokasi_id];
    } else if (lokasiIdColumnExists && !lokasi_id) {
      duplicateQuery = 'SELECT id FROM dokter WHERE LOWER(nama_dokter) = LOWER(?) AND (lokasi_id IS NULL OR lokasi_id = 0)';
      duplicateParams = [nama_dokter];
    } else {
      duplicateQuery = 'SELECT id FROM dokter WHERE LOWER(nama_dokter) = LOWER(?)';
      duplicateParams = [nama_dokter];
    }

    const [existing] = await pool.execute(duplicateQuery, duplicateParams) as any[];

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(
        { success: false, message: `Dokter dengan nama "${nama_dokter}" sudah ada di lokasi ini` },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      'INSERT INTO dokter (nama_dokter, spesialisasi, no_sip, no_telp, email, lokasi_id, aktif) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nama_dokter, spesialisasi || null, no_sip || null, no_telp || null, email || null, lokasi_id || null, aktif || 'Y']
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

