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
    const namaDokterIndex = headers.findIndex(h => 
      h.includes('nama') && (h.includes('dokter') || h.includes('doctor'))
    );
    const spesialisasiIndex = headers.findIndex(h => 
      h.includes('spesialisasi') || h.includes('spesialis') || h.includes('specialist')
    );
    const noSipIndex = headers.findIndex(h => 
      h.includes('sip') || h.includes('no_sip') || h.includes('no sip')
    );
    const noTelpIndex = headers.findIndex(h => 
      h.includes('telp') || h.includes('telepon') || h.includes('phone') || h.includes('no_telp') || h.includes('no telp')
    );
    const emailIndex = headers.findIndex(h => 
      h.includes('email') || h.includes('e-mail')
    );
    const aktifIndex = headers.findIndex(h => 
      h.includes('aktif') || h.includes('active') || h.includes('status')
    );

    if (namaDokterIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Format Excel tidak valid. Kolom wajib: Nama Dokter. Kolom opsional: Spesialisasi, No SIP, No Telepon, Email, Aktif' 
        },
        { status: 400 }
      );
    }

    // Check and migrate if lokasi_id column doesn't exist
    let lokasiIdColumnExists = false;
    try {
      const [columns] = await pool.execute(
        "SHOW COLUMNS FROM dokter LIKE 'lokasi_id'"
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
        
        lokasiIdColumnExists = true;
      }
    } catch (migError: any) {
      console.error('Migration check error (continuing anyway):', migError.message);
    }

    // Proses data (mulai dari baris kedua)
    const dokterData: Array<{
      nama_dokter: string;
      spesialisasi: string | null;
      no_sip: string | null;
      no_telp: string | null;
      email: string | null;
      lokasi_id: number | null;
      aktif: string;
    }> = [];

    const errors: string[] = [];
    const duplicates: string[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip baris kosong atau null
      if (!row || !Array.isArray(row) || row.length === 0) {
        continue;
      }

      // Pastikan index valid sebelum mengakses
      if (namaDokterIndex < 0 || namaDokterIndex >= row.length) {
        continue;
      }

      // Ambil nilai dari row dengan validasi
      const namaDokterValue = row[namaDokterIndex];
      const spesialisasiValue = spesialisasiIndex >= 0 && spesialisasiIndex < row.length ? row[spesialisasiIndex] : undefined;
      const noSipValue = noSipIndex >= 0 && noSipIndex < row.length ? row[noSipIndex] : undefined;
      const noTelpValue = noTelpIndex >= 0 && noTelpIndex < row.length ? row[noTelpIndex] : undefined;
      const emailValue = emailIndex >= 0 && emailIndex < row.length ? row[emailIndex] : undefined;
      const aktifValue = aktifIndex >= 0 && aktifIndex < row.length ? row[aktifIndex] : undefined;

      // Convert ke string dan trim dengan validasi yang lebih ketat
      let namaDokter = '';
      if (namaDokterValue !== undefined && namaDokterValue !== null) {
        namaDokter = String(namaDokterValue).trim();
      }

      let spesialisasi: string | null = null;
      if (spesialisasiValue !== undefined && spesialisasiValue !== null) {
        const trimmed = String(spesialisasiValue).trim();
        spesialisasi = trimmed === '' ? null : trimmed;
      }

      let noSip: string | null = null;
      if (noSipValue !== undefined && noSipValue !== null) {
        const trimmed = String(noSipValue).trim();
        noSip = trimmed === '' ? null : trimmed;
      }

      let noTelp: string | null = null;
      if (noTelpValue !== undefined && noTelpValue !== null) {
        const trimmed = String(noTelpValue).trim();
        noTelp = trimmed === '' ? null : trimmed;
      }

      let email: string | null = null;
      if (emailValue !== undefined && emailValue !== null) {
        const trimmed = String(emailValue).trim();
        email = trimmed === '' ? null : trimmed;
      }

      // Validasi dan set aktif (default 'Y')
      let aktif = 'Y';
      if (aktifValue !== undefined && aktifValue !== null) {
        const aktifStr = String(aktifValue).trim().toUpperCase();
        if (aktifStr === 'Y' || aktifStr === 'N' || aktifStr === 'YES' || aktifStr === 'NO' || aktifStr === 'AKTIF' || aktifStr === 'TIDAK AKTIF') {
          aktif = aktifStr === 'Y' || aktifStr === 'YES' || aktifStr === 'AKTIF' ? 'Y' : 'N';
        }
      }

      // Validasi data
      if (!namaDokter) {
        errors.push(`Baris ${i + 1}: Nama Dokter tidak boleh kosong`);
        continue;
      }

      // Cek duplikat dalam file
      const isDuplicateInFile = dokterData.some(d => 
        d.nama_dokter.toLowerCase() === namaDokter.toLowerCase()
      );
      
      if (isDuplicateInFile) {
        duplicates.push(`Baris ${i + 1}: ${namaDokter}`);
        continue;
      }

      // Pastikan semua variabel terdefinisi sebelum push
      dokterData.push({
        nama_dokter: namaDokter,
        spesialisasi: spesialisasi,
        no_sip: noSip,
        no_telp: noTelp,
        email: email,
        lokasi_id: lokasiId,
        aktif: aktif,
      });
    }

    if (dokterData.length === 0) {
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

      for (const dokter of dokterData) {
        // Cek apakah sudah ada di database dengan nama dan lokasi yang sama
        // Data dokter yang sama bisa ada di lokasi yang berbeda
        let duplicateQuery: string;
        let duplicateParams: any[];
        
        if (lokasiIdColumnExists && dokter.lokasi_id) {
          // Cek berdasarkan nama_dokter DAN lokasi_id
          duplicateQuery = 'SELECT id FROM dokter WHERE LOWER(nama_dokter) = LOWER(?) AND lokasi_id = ?';
          duplicateParams = [dokter.nama_dokter, dokter.lokasi_id];
        } else if (lokasiIdColumnExists && !dokter.lokasi_id) {
          // Jika lokasi_id null, cek hanya berdasarkan nama_dokter dengan lokasi_id null
          duplicateQuery = 'SELECT id FROM dokter WHERE LOWER(nama_dokter) = LOWER(?) AND (lokasi_id IS NULL OR lokasi_id = 0)';
          duplicateParams = [dokter.nama_dokter];
        } else {
          // Fallback: cek hanya berdasarkan nama_dokter (jika kolom lokasi_id belum ada)
          duplicateQuery = 'SELECT id FROM dokter WHERE LOWER(nama_dokter) = LOWER(?)';
          duplicateParams = [dokter.nama_dokter];
        }
        
        const [existing] = await connection.execute(duplicateQuery, duplicateParams) as any[];

        if (existing && existing.length > 0) {
          duplicateCount++;
          duplicateNames.push(dokter.nama_dokter);
          continue;
        }

        // Insert data baru
        let insertQuery: string;
        let insertParams: any[];
        
        if (lokasiIdColumnExists) {
          insertQuery = 'INSERT INTO dokter (nama_dokter, spesialisasi, no_sip, no_telp, email, lokasi_id, aktif) VALUES (?, ?, ?, ?, ?, ?, ?)';
          insertParams = [dokter.nama_dokter, dokter.spesialisasi, dokter.no_sip, dokter.no_telp, dokter.email, dokter.lokasi_id, dokter.aktif];
        } else {
          insertQuery = 'INSERT INTO dokter (nama_dokter, spesialisasi, no_sip, no_telp, email, aktif) VALUES (?, ?, ?, ?, ?, ?)';
          insertParams = [dokter.nama_dokter, dokter.spesialisasi, dokter.no_sip, dokter.no_telp, dokter.email, dokter.aktif];
        }
        
        await connection.execute(insertQuery, insertParams);
        successCount++;
      }

      await connection.commit();

      let message = `Berhasil mengimpor ${successCount} data dokter`;
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
    console.error('Error importing dokter:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengimpor data dokter', error: error.message },
      { status: 500 }
    );
  }
}

