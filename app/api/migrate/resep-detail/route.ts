import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Migration endpoint to fix resep_detail table schema
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Check if table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'resep_detail'"
    ) as any[];
    
    if (tables.length === 0) {
      // Table doesn't exist, create it
      await connection.execute(`
        CREATE TABLE resep_detail (
          id INT AUTO_INCREMENT PRIMARY KEY,
          pemeriksaan_id INT NOT NULL,
          obat_id INT NOT NULL,
          jumlah INT NOT NULL,
          aturan_pakai TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pemeriksaan_id) REFERENCES pemeriksaan(id) ON DELETE CASCADE,
          FOREIGN KEY (obat_id) REFERENCES obat(id) ON DELETE CASCADE,
          INDEX idx_pemeriksaan_id (pemeriksaan_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      await connection.commit();
      connection.release();
      
      return NextResponse.json({
        success: true,
        message: 'Tabel resep_detail berhasil dibuat dengan schema yang benar'
      });
    }
    
    // Check if table has patient_id column (old schema)
    const [patientIdColumns] = await connection.execute(
      "SHOW COLUMNS FROM resep_detail LIKE 'patient_id'"
    ) as any[];
    
    // Check if table has pemeriksaan_id column (new schema)
    const [pemeriksaanIdColumns] = await connection.execute(
      "SHOW COLUMNS FROM resep_detail LIKE 'pemeriksaan_id'"
    ) as any[];
    
    if (patientIdColumns.length > 0 && pemeriksaanIdColumns.length === 0) {
      // Need to migrate from patient_id to pemeriksaan_id
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      
      // Get and drop foreign key constraints
      const [fkConstraints] = await connection.execute(
        `SELECT CONSTRAINT_NAME 
         FROM information_schema.KEY_COLUMN_USAGE 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'resep_detail' 
           AND COLUMN_NAME = 'patient_id'`
      ) as any[];
      
      for (const fk of fkConstraints) {
        try {
          await connection.execute(
            `ALTER TABLE resep_detail DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`
          );
        } catch (e: any) {
          console.log(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, e.message);
        }
      }
      
      // Rename column
      await connection.execute(
        'ALTER TABLE resep_detail CHANGE COLUMN patient_id pemeriksaan_id INT NOT NULL'
      );
      
      // Add foreign key constraint
      await connection.execute(
        'ALTER TABLE resep_detail ADD CONSTRAINT fk_resep_detail_pemeriksaan FOREIGN KEY (pemeriksaan_id) REFERENCES pemeriksaan(id) ON DELETE CASCADE'
      );
      
      // Add index
      try {
        await connection.execute(
          'ALTER TABLE resep_detail ADD INDEX idx_pemeriksaan_id (pemeriksaan_id)'
        );
      } catch (e: any) {
        // Index might already exist
        console.log('Index might already exist');
      }
      
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      
      await connection.commit();
      connection.release();
      
      return NextResponse.json({
        success: true,
        message: 'Tabel resep_detail berhasil dimigrasi dari patient_id ke pemeriksaan_id'
      });
    } else if (pemeriksaanIdColumns.length > 0) {
      // Table already has correct schema
      await connection.commit();
      connection.release();
      
      return NextResponse.json({
        success: true,
        message: 'Tabel resep_detail sudah memiliki schema yang benar (pemeriksaan_id)'
      });
    } else {
      // Table exists but doesn't have either column - recreate it
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      
      // Backup data if exists
      const [existingData] = await connection.execute(
        'SELECT * FROM resep_detail'
      ) as any[];
      
      await connection.execute('DROP TABLE IF EXISTS resep_detail');
      
      await connection.execute(`
        CREATE TABLE resep_detail (
          id INT AUTO_INCREMENT PRIMARY KEY,
          pemeriksaan_id INT NOT NULL,
          obat_id INT NOT NULL,
          jumlah INT NOT NULL,
          aturan_pakai TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pemeriksaan_id) REFERENCES pemeriksaan(id) ON DELETE CASCADE,
          FOREIGN KEY (obat_id) REFERENCES obat(id) ON DELETE CASCADE,
          INDEX idx_pemeriksaan_id (pemeriksaan_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      // Note: We can't restore data because we don't know how to map old IDs to pemeriksaan_id
      if (existingData.length > 0) {
        console.warn(`Warning: ${existingData.length} rows were dropped during migration. Data needs to be re-entered.`);
      }
      
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      
      await connection.commit();
      connection.release();
      
      return NextResponse.json({
        success: true,
        message: 'Tabel resep_detail berhasil dibuat ulang dengan schema yang benar. Data lama tidak dapat dimigrasi otomatis.',
        warning: existingData.length > 0 ? `${existingData.length} rows were dropped` : undefined
      });
    }
  } catch (error: any) {
    await connection.rollback();
    connection.release();
    console.error('Error migrating resep_detail table:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Gagal memigrasi tabel resep_detail', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

