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

    // Proses data (mulai dari baris kedua)
    const obatData: Array<{
      nama_obat: string;
      satuan: string;
      stok: number;
      keterangan: string | null;
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
        // Cek apakah sudah ada di database
        const [existing] = await connection.execute(
          'SELECT id FROM obat WHERE LOWER(nama_obat) = LOWER(?)',
          [obat.nama_obat]
        ) as any[];

        if (existing && existing.length > 0) {
          duplicateCount++;
          duplicateNames.push(obat.nama_obat);
          continue;
        }

        // Insert data baru
        await connection.execute(
          'INSERT INTO obat (nama_obat, satuan, stok, keterangan) VALUES (?, ?, ?, ?)',
          [obat.nama_obat, obat.satuan, obat.stok, obat.keterangan]
        );
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

