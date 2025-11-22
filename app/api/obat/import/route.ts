import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const lokasiIdParam = formData.get('lokasi_id') as string | null;
    const lokasiId = lokasiIdParam ? parseInt(lokasiIdParam) : null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File tidak ditemukan' },
        { status: 400 }
      );
    }

    // Validasi tipe file
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { success: false, message: 'File harus berformat Excel (.xlsx atau .xls)' },
        { status: 400 }
      );
    }

    // Baca file Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (!data || data.length < 2) {
      return NextResponse.json(
        { success: false, message: 'File Excel kosong atau format tidak valid' },
        { status: 400 }
      );
    }

    // Header yang diharapkan (baris pertama)
    const headers = data[0].map((h: any) => String(h).toLowerCase().trim());
    
    // Cari index kolom
    const namaObatIndex = headers.findIndex(h => 
      h.includes('nama') && h.includes('obat')
    );
    const satuanIndex = headers.findIndex(h => 
      h.includes('satuan') || h.includes('unit')
    );
    const stokIndex = headers.findIndex(h => 
      h.includes('stok') || h.includes('stock') || h.includes('jumlah')
    );
    const keteranganIndex = headers.findIndex(h => 
      h.includes('keterangan') || h.includes('catatan') || h.includes('note')
    );

    if (namaObatIndex === -1 || satuanIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Format Excel tidak valid. Kolom wajib: Nama Obat, Satuan. Kolom opsional: Stok, Keterangan' 
        },
        { status: 400 }
      );
    }

    // Check and migrate if lokasi_id column doesn't exist
    let lokasiIdColumnExists = false;
    try {
      const [columns] = await pool.execute(
        "SHOW COLUMNS FROM obat LIKE 'lokasi_id'"
      ) as any[];
      
      lokasiIdColumnExists = columns.length > 0;
      
      if (!lokasiIdColumnExists && lokasiId) {
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

    // Proses data (mulai dari baris kedua)
    const obatData: Array<{
      nama_obat: string;
      satuan: string;
      stok: number;
      keterangan: string | null;
      lokasi_id: number | null;
    }> = [];

    const errors: string[] = [];
    const duplicates: string[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip baris kosong atau null
      if (!row || !Array.isArray(row) || row.length === 0) {
        continue;
      }

      // Pastikan index valid sebelum mengakses (redundant check, tapi untuk safety)
      if (namaObatIndex < 0 || satuanIndex < 0 || namaObatIndex >= row.length || satuanIndex >= row.length) {
        continue;
      }

      // Ambil nilai dari row dengan validasi
      const namaObatValue = row[namaObatIndex];
      const satuanValue = row[satuanIndex];
      const stokValue = stokIndex >= 0 && stokIndex < row.length ? row[stokIndex] : undefined;
      const keteranganValue = keteranganIndex >= 0 && keteranganIndex < row.length ? row[keteranganIndex] : undefined;

      // Convert ke string dan trim dengan validasi yang lebih ketat
      let namaObat = '';
      if (namaObatValue !== undefined && namaObatValue !== null) {
        namaObat = String(namaObatValue).trim();
      }

      let satuan = '';
      if (satuanValue !== undefined && satuanValue !== null) {
        satuan = String(satuanValue).trim();
      }

      let stok = 0;
      if (stokValue !== undefined && stokValue !== null) {
        const parsedStok = parseInt(String(stokValue));
        stok = isNaN(parsedStok) ? 0 : parsedStok;
      }

      let keterangan: string | null = null;
      if (keteranganValue !== undefined && keteranganValue !== null) {
        const trimmed = String(keteranganValue).trim();
        keterangan = trimmed === '' ? null : trimmed;
      }

      // Validasi data
      if (!namaObat) {
        errors.push(`Baris ${i + 1}: Nama Obat tidak boleh kosong`);
        continue;
      }

      if (!satuan) {
        errors.push(`Baris ${i + 1}: Satuan tidak boleh kosong`);
        continue;
      }

      // Cek duplikat dalam file
      const isDuplicateInFile = obatData.some(o => 
        o.nama_obat.toLowerCase() === namaObat.toLowerCase()
      );
      
      if (isDuplicateInFile) {
        duplicates.push(`Baris ${i + 1}: ${namaObat}`);
        continue;
      }

      // Pastikan semua variabel terdefinisi sebelum push
      obatData.push({
        nama_obat: namaObat,
        satuan: satuan,
        stok: stok,
        keterangan: keterangan,
        lokasi_id: lokasiId,
      });
    }

    if (obatData.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Tidak ada data valid yang ditemukan dalam file Excel',
          errors: errors.length > 0 ? errors : undefined,
          duplicates: duplicates.length > 0 ? duplicates : undefined,
        },
        { status: 400 }
      );
    }

    // Cek duplikat di database dan simpan data
    const connection = await pool.getConnection();
    let successCount = 0;
    let duplicateCount = 0;
    const duplicateNames: string[] = [];

    try {
      await connection.beginTransaction();

      for (const obat of obatData) {
        // Cek apakah sudah ada di database dengan nama dan lokasi yang sama
        // Data obat yang sama bisa ada di lokasi yang berbeda
        let duplicateQuery: string;
        let duplicateParams: any[];
        
        if (lokasiIdColumnExists && obat.lokasi_id) {
          // Cek berdasarkan nama_obat DAN lokasi_id
          duplicateQuery = 'SELECT id FROM obat WHERE LOWER(nama_obat) = LOWER(?) AND lokasi_id = ?';
          duplicateParams = [obat.nama_obat, obat.lokasi_id];
        } else if (lokasiIdColumnExists && !obat.lokasi_id) {
          // Jika lokasi_id null, cek hanya berdasarkan nama_obat dengan lokasi_id null
          duplicateQuery = 'SELECT id FROM obat WHERE LOWER(nama_obat) = LOWER(?) AND (lokasi_id IS NULL OR lokasi_id = 0)';
          duplicateParams = [obat.nama_obat];
        } else {
          // Fallback: cek hanya berdasarkan nama_obat (jika kolom lokasi_id belum ada)
          duplicateQuery = 'SELECT id FROM obat WHERE LOWER(nama_obat) = LOWER(?)';
          duplicateParams = [obat.nama_obat];
        }
        
        const [existing] = await connection.execute(duplicateQuery, duplicateParams) as any[];

        if (existing && existing.length > 0) {
          duplicateCount++;
          duplicateNames.push(obat.nama_obat);
          continue;
        }

        // Insert data baru
        let insertQuery: string;
        let insertParams: any[];
        
        if (lokasiIdColumnExists) {
          insertQuery = 'INSERT INTO obat (nama_obat, satuan, stok, keterangan, lokasi_id) VALUES (?, ?, ?, ?, ?)';
          insertParams = [obat.nama_obat, obat.satuan, obat.stok, obat.keterangan, obat.lokasi_id];
        } else {
          insertQuery = 'INSERT INTO obat (nama_obat, satuan, stok, keterangan) VALUES (?, ?, ?, ?)';
          insertParams = [obat.nama_obat, obat.satuan, obat.stok, obat.keterangan];
        }
        
        await connection.execute(insertQuery, insertParams);
        successCount++;
      }

      await connection.commit();

      let message = `Berhasil mengimpor ${successCount} data obat`;
      if (duplicateCount > 0) {
        message += `. ${duplicateCount} data duplikat dilewati`;
      }

      return NextResponse.json({
        success: true,
        message,
        imported: successCount,
        duplicates: duplicateCount,
        duplicateNames: duplicateNames.length > 0 ? duplicateNames : undefined,
        errors: errors.length > 0 ? errors : undefined,
        fileDuplicates: duplicates.length > 0 ? duplicates : undefined,
      });
    } catch (error: any) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error importing obat:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengimpor data obat', error: error.message },
      { status: 500 }
    );
  }
}

