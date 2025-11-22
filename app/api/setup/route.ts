import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Test database connection first
    try {
      await pool.execute('SELECT 1');
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Gagal terhubung ke database. Pastikan file .env.local sudah dikonfigurasi dengan benar.',
          error: dbError.message 
        },
        { status: 500 }
      );
    }

    // Drop old patients table if exists (migration to pasien and pemeriksaan)
    try {
      // Check if patients table exists
      const [oldPatientsTables] = await pool.execute(
        "SHOW TABLES LIKE 'patients'"
      ) as any[];
      
      if (oldPatientsTables.length > 0) {
        // Drop foreign key constraints from resep_detail if it references patients
        try {
          await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
          await pool.execute('DROP TABLE IF EXISTS patients');
          await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
          console.log('Tabel patients lama berhasil dihapus');
        } catch (dropError: any) {
          console.error('Error dropping patients table:', dropError);
          // Continue even if drop fails
        }
      }
    } catch (checkError: any) {
      console.error('Error checking for old patients table:', checkError);
      // Continue with setup
    }

    // Create pasien table
    const createPasienTableQuery = `
      CREATE TABLE IF NOT EXISTS pasien (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        no_ktp VARCHAR(20),
        no_telepon VARCHAR(20),
        jenis_kelamin ENUM('L', 'P') NOT NULL,
        tanggal_lahir DATE NOT NULL,
        alamat TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_no_ktp (no_ktp),
        UNIQUE KEY uk_no_telepon (no_telepon),
        INDEX idx_nama (nama),
        INDEX idx_no_ktp (no_ktp),
        INDEX idx_no_telepon (no_telepon)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.execute(createPasienTableQuery);

    // Create pemeriksaan table
    const createPemeriksaanTableQuery = `
      CREATE TABLE IF NOT EXISTS pemeriksaan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pasien_id INT NOT NULL,
        tanggal_pemeriksaan DATE,
        tinggi_badan DECIMAL(5,2),
        berat_badan DECIMAL(5,2),
        tensi_darah_sistol INT,
        tensi_darah_diastol INT,
        kolesterol DECIMAL(5,2),
        gds DECIMAL(5,2),
        as_urat DECIMAL(5,2),
        keluhan TEXT,
        anamnesa TEXT,
        pemeriksaan_fisik TEXT,
        hpht DATE,
        hpl DATE,
        tfu DECIMAL(5,2),
        djj_anak INT,
        diagnosa TEXT,
        terapi TEXT,
        resep TEXT,
        dokter_pemeriksa VARCHAR(255),
        lokasi_id INT,
        status ENUM('pendaftaran', 'perawat', 'dokter', 'farmasi', 'selesai') DEFAULT 'pendaftaran',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (pasien_id) REFERENCES pasien(id) ON DELETE CASCADE,
        FOREIGN KEY (lokasi_id) REFERENCES lokasi(id) ON DELETE SET NULL,
        INDEX idx_pasien_id (pasien_id),
        INDEX idx_tanggal_pemeriksaan (tanggal_pemeriksaan),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_dokter_pemeriksa (dokter_pemeriksa),
        INDEX idx_lokasi_id (lokasi_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.execute(createPemeriksaanTableQuery);

    // Check if lokasi table exists, if not create it first
    try {
      const [lokasiTables] = await pool.execute(
        "SHOW TABLES LIKE 'lokasi'"
      ) as any[];
      
      if (lokasiTables.length === 0) {
        // Create lokasi table first
        const createLokasiTableQuery = `
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
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.execute(createLokasiTableQuery);
      }
    } catch (error) {
      console.error('Error checking/creating lokasi table:', error);
      // Continue with other table creation
    }

    // Check if pemeriksaan table needs migration (add lokasi_id column)
    try {
      const [columns] = await pool.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'lokasi_id'"
      ) as any[];
      
      if (columns.length === 0) {
        // Add lokasi_id column to existing pemeriksaan table
        console.log('Adding lokasi_id column to pemeriksaan table...');
        
        // First create lokasi table if it doesn't exist
        const [lokasiTables] = await pool.execute(
          "SHOW TABLES LIKE 'lokasi'"
        ) as any[];
        
        if (lokasiTables.length === 0) {
          const createLokasiTableQuery = `
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
          `;
          await pool.execute(createLokasiTableQuery);
        }
        
        // Add lokasi_id column
        await pool.execute(`
          ALTER TABLE pemeriksaan 
          ADD COLUMN lokasi_id INT AFTER dokter_pemeriksa,
          ADD INDEX idx_lokasi_id (lokasi_id)
        `);
        
        // Add foreign key constraint
        await pool.execute(`
          ALTER TABLE pemeriksaan 
          ADD CONSTRAINT fk_pemeriksaan_lokasi 
          FOREIGN KEY (lokasi_id) REFERENCES lokasi(id) ON DELETE SET NULL
        `);
        
        console.log('Migration completed: lokasi_id column added to pemeriksaan table');
      }
    } catch (error: any) {
      console.error('Error migrating pemeriksaan table:', error);
      // Continue even if migration fails
    }

    // Create obat table
    const createObatTableQuery = `
      CREATE TABLE IF NOT EXISTS obat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_obat VARCHAR(255) NOT NULL,
        satuan VARCHAR(50) NOT NULL,
        stok INT DEFAULT 0,
        keterangan TEXT,
        lokasi_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nama_obat (nama_obat),
        INDEX idx_lokasi_id (lokasi_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.execute(createObatTableQuery);

    // Check if obat table needs migration (add lokasi_id column)
    try {
      const [obatColumns] = await pool.execute(
        "SHOW COLUMNS FROM obat LIKE 'lokasi_id'"
      ) as any[];
      
      if (obatColumns.length === 0) {
        console.log('Adding lokasi_id column to obat table...');
        
        // First create lokasi table if it doesn't exist
        const [lokasiTables] = await pool.execute(
          "SHOW TABLES LIKE 'lokasi'"
        ) as any[];
        
        if (lokasiTables.length === 0) {
          const createLokasiTableQuery = `
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
          `;
          await pool.execute(createLokasiTableQuery);
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
        
        console.log('Migration completed: lokasi_id column added to obat table');
      }
    } catch (migError: any) {
      console.error('Error migrating obat table:', migError);
    }

    // Check and migrate resep_detail table if needed
    try {
      const [resepDetailTables] = await pool.execute(
        "SHOW TABLES LIKE 'resep_detail'"
      ) as any[];
      
      if (resepDetailTables.length > 0) {
        // Check if table has old column name (patient_id)
        const [columns] = await pool.execute(
          "SHOW COLUMNS FROM resep_detail LIKE 'patient_id'"
        ) as any[];
        
        if (columns.length > 0) {
          // Table exists with old schema, need to migrate
          console.log('Migrating resep_detail table from patient_id to pemeriksaan_id...');
          
          // Drop foreign key constraints first
          try {
            await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
            
            // Get foreign key constraint names
            const [fkConstraints] = await pool.execute(
              `SELECT CONSTRAINT_NAME 
               FROM information_schema.KEY_COLUMN_USAGE 
               WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'resep_detail' 
                 AND COLUMN_NAME = 'patient_id'`
            ) as any[];
            
            // Drop foreign key constraints
            for (const fk of fkConstraints) {
              try {
                await pool.execute(
                  `ALTER TABLE resep_detail DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`
                );
              } catch (e: any) {
                console.log(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, e.message);
              }
            }
            
            // Rename column from patient_id to pemeriksaan_id
            await pool.execute(
              'ALTER TABLE resep_detail CHANGE COLUMN patient_id pemeriksaan_id INT NOT NULL'
            );
            
            // Add foreign key constraint for pemeriksaan_id
            await pool.execute(
              'ALTER TABLE resep_detail ADD CONSTRAINT fk_resep_detail_pemeriksaan FOREIGN KEY (pemeriksaan_id) REFERENCES pemeriksaan(id) ON DELETE CASCADE'
            );
            
            // Add index if it doesn't exist
            try {
              await pool.execute(
                'ALTER TABLE resep_detail ADD INDEX idx_pemeriksaan_id (pemeriksaan_id)'
              );
            } catch (e: any) {
              // Index might already exist, ignore error
              console.log('Index might already exist:', e.message);
            }
            
            await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
            console.log('Migration completed successfully');
          } catch (migError: any) {
            console.error('Error during migration:', migError);
            await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
            // Continue with table creation attempt
          }
        } else {
          // Check if pemeriksaan_id column exists
          const [pemeriksaanColumns] = await pool.execute(
            "SHOW COLUMNS FROM resep_detail LIKE 'pemeriksaan_id'"
          ) as any[];
          
          if (pemeriksaanColumns.length === 0) {
            // Table exists but doesn't have pemeriksaan_id, recreate it
            console.log('Recreating resep_detail table with correct schema...');
            await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
            await pool.execute('DROP TABLE IF EXISTS resep_detail');
            await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
          }
        }
      }
    } catch (checkError: any) {
      console.error('Error checking resep_detail table:', checkError);
      // Continue with table creation
    }

    // Create resep_detail table
    const createResepDetailTableQuery = `
      CREATE TABLE IF NOT EXISTS resep_detail (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pemeriksaan_id INT NOT NULL,
        obat_id INT NOT NULL,
        jumlah INT NOT NULL,
        aturan_pakai TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pemeriksaan_id) REFERENCES pemeriksaan(id) ON DELETE CASCADE,
        FOREIGN KEY (obat_id) REFERENCES obat(id) ON DELETE CASCADE,
        INDEX idx_pemeriksaan_id (pemeriksaan_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.execute(createResepDetailTableQuery);

    // Create dokter table
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

    // Check if dokter table needs migration (add lokasi_id column)
    try {
      const [columns] = await pool.execute(
        "SHOW COLUMNS FROM dokter LIKE 'lokasi_id'"
      ) as any[];
      
      if (columns.length === 0) {
        console.log('Adding lokasi_id column to dokter table...');
        
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
        
        console.log('Migration completed: lokasi_id column added to dokter table');
      }
    } catch (migError: any) {
      console.error('Error migrating dokter table:', migError);
    }

    // Create lokasi table
    const createLokasiTableQuery = `
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.execute(createLokasiTableQuery);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Database setup berhasil! Semua tabel telah dibuat.' 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error setting up database:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Gagal setup database', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if tables exist
    const [pasienTables] = await pool.execute(
      "SHOW TABLES LIKE 'pasien'"
    ) as any[];

    const [pemeriksaanTables] = await pool.execute(
      "SHOW TABLES LIKE 'pemeriksaan'"
    ) as any[];

    if (pasienTables.length > 0 && pemeriksaanTables.length > 0) {
      // Get table structures
      const [pasienColumns] = await pool.execute(
        "DESCRIBE pasien"
      ) as any[];

      const [pemeriksaanColumns] = await pool.execute(
        "DESCRIBE pemeriksaan"
      ) as any[];

      return NextResponse.json({
        success: true,
        tablesExist: true,
        pasienColumns: pasienColumns,
        pemeriksaanColumns: pemeriksaanColumns,
        message: 'Tabel pasien dan pemeriksaan sudah ada'
      });
    } else {
      return NextResponse.json({
        success: true,
        tablesExist: false,
        message: 'Tabel pasien atau pemeriksaan belum dibuat. Gunakan POST /api/setup untuk membuat tabel.'
      });
    }
  } catch (error: any) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Gagal memeriksa database', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
