import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

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

    // Proses data (mulai dari baris kedua)
    const dokterData: Array<{
      nama_dokter: string;
      spesialisasi: string | null;
      no_sip: string | null;
      no_telp: string | null;
      email: string | null;
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
        // Cek apakah sudah ada di database
        const [existing] = await connection.execute(
          'SELECT id FROM dokter WHERE LOWER(nama_dokter) = LOWER(?)',
          [dokter.nama_dokter]
        ) as any[];

        if (existing && existing.length > 0) {
          duplicateCount++;
          duplicateNames.push(dokter.nama_dokter);
          continue;
        }

        // Insert data baru
        await connection.execute(
          'INSERT INTO dokter (nama_dokter, spesialisasi, no_sip, no_telp, email, aktif) VALUES (?, ?, ?, ?, ?, ?)',
          [dokter.nama_dokter, dokter.spesialisasi, dokter.no_sip, dokter.no_telp, dokter.email, dokter.aktif]
        );
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

