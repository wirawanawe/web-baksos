import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const jenis_kelamin = searchParams.get('jenis_kelamin');
    const dokter_pemeriksa = searchParams.get('dokter_pemeriksa');
    const lokasi_id = searchParams.get('lokasi_id');
    const search = searchParams.get('search');

    // Check if alergi column exists
    let alergiColumnExists = false;
    let lokasiIdColumnExists = false;
    let noRegistrasiColumnExists = false;
    try {
      const [alergiColumns] = await pool.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'alergi'"
      ) as any[];
      alergiColumnExists = alergiColumns.length > 0;
      
      const [lokasiColumns] = await pool.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'lokasi_id'"
      ) as any[];
      lokasiIdColumnExists = lokasiColumns.length > 0;
      
      const [noRegistrasiColumns] = await pool.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'no_registrasi'"
      ) as any[];
      noRegistrasiColumnExists = noRegistrasiColumns.length > 0;
    } catch (e) {
      // Columns might not exist
    }

    // Query dengan JOIN antara pasien dan pemeriksaan
    let query = `
      SELECT 
        p.id as pasien_id,
        p.nama,
        p.no_ktp,
        p.no_telepon,
        p.jenis_kelamin,
        p.tanggal_lahir,
        TIMESTAMPDIFF(YEAR, p.tanggal_lahir, CURDATE()) as usia,
        p.alamat,
        pm.id as pemeriksaan_id${noRegistrasiColumnExists ? ',\n        pm.no_registrasi' : ''},
        pm.tanggal_pemeriksaan,
        pm.tinggi_badan,
        pm.berat_badan,
        pm.tensi_darah_sistol,
        pm.tensi_darah_diastol,
        pm.kolesterol,
        pm.gds,
        pm.as_urat,
        pm.keluhan,
        pm.anamnesa,
        pm.pemeriksaan_fisik,
        pm.hpht,
        pm.hpl,
        pm.tfu,
        pm.djj_anak,
        pm.diagnosa${alergiColumnExists ? ',\n        pm.alergi' : ''},
        pm.terapi,
        pm.resep,
        pm.dokter_pemeriksa${lokasiIdColumnExists ? ',\n        pm.lokasi_id' : ''},
        pm.status,
        pm.created_at
      FROM pemeriksaan pm
      INNER JOIN pasien p ON pm.pasien_id = p.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (startDate && endDate) {
      if (startDate === endDate) {
        conditions.push('(pm.tanggal_pemeriksaan = ? OR (pm.tanggal_pemeriksaan IS NULL AND DATE(pm.created_at) = ?))');
        params.push(startDate, startDate);
      } else {
        conditions.push('(pm.tanggal_pemeriksaan BETWEEN ? AND ? OR (pm.tanggal_pemeriksaan IS NULL AND DATE(pm.created_at) BETWEEN ? AND ?))');
        params.push(startDate, endDate, startDate, endDate);
      }
    }

    if (status) {
      conditions.push('pm.status = ?');
      params.push(status);
    }

    if (jenis_kelamin) {
      conditions.push('p.jenis_kelamin = ?');
      params.push(jenis_kelamin);
    }

    if (dokter_pemeriksa) {
      const searchName = dokter_pemeriksa.trim();
      const cleanName = searchName.replace(/^Dr\.\s*/i, '').replace(/,\s*Sp\.[A-Z]+$/i, '').trim();
      conditions.push('(TRIM(pm.dokter_pemeriksa) = TRIM(?) OR TRIM(pm.dokter_pemeriksa) LIKE ? OR TRIM(pm.dokter_pemeriksa) LIKE ? OR TRIM(pm.dokter_pemeriksa) LIKE ? OR TRIM(?) LIKE CONCAT("%", TRIM(pm.dokter_pemeriksa), "%"))');
      params.push(searchName, `%${cleanName}%`, `%${searchName}%`, `%${cleanName.split(' ')[0]}%`, searchName);
    }

    if (lokasi_id && lokasiIdColumnExists) {
      const parsedLokasiId = parseInt(lokasi_id, 10);
      if (!isNaN(parsedLokasiId)) {
        conditions.push('pm.lokasi_id = ?');
        params.push(parsedLokasiId);
      }
    }

    if (search) {
      const searchPattern = `%${search}%`;
      if (noRegistrasiColumnExists) {
        conditions.push('(p.nama LIKE ? OR p.no_ktp LIKE ? OR p.no_telepon LIKE ? OR pm.no_registrasi LIKE ?)');
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      } else {
        conditions.push('(p.nama LIKE ? OR p.no_ktp LIKE ? OR p.no_telepon LIKE ?)');
        params.push(searchPattern, searchPattern, searchPattern);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY pm.created_at DESC';

    const [rows] = await pool.execute(query, params);
    const patients = rows as any[];

    // Fetch resep details for all patients
    const resepDataMap = new Map<number, any[]>();
    for (const patient of patients) {
      try {
        const [resepRows] = await pool.execute(
          `SELECT rd.*, o.nama_obat, o.satuan 
           FROM resep_detail rd 
           JOIN obat o ON rd.obat_id = o.id 
           WHERE rd.pemeriksaan_id = ? 
           ORDER BY rd.created_at DESC`,
          [patient.pemeriksaan_id]
        ) as any[];
        if (resepRows && resepRows.length > 0) {
          resepDataMap.set(patient.pemeriksaan_id, resepRows);
        }
      } catch (error) {
        console.error(`Error fetching resep for pemeriksaan_id ${patient.pemeriksaan_id}:`, error);
      }
    }

    // Prepare data for Excel
    const excelData = patients.map((patient) => {
      const resepDetails = resepDataMap.get(patient.pemeriksaan_id) || [];
      const resepText = resepDetails.length > 0
        ? resepDetails.map((r: any, idx: number) => 
            `${idx + 1}. ${r.nama_obat} - ${r.jumlah} ${r.satuan}${r.aturan_pakai ? ` (${r.aturan_pakai})` : ''}`
          ).join('; ')
        : '';

      return {
        'No': patient.pemeriksaan_id,
        'No. Registrasi': noRegistrasiColumnExists ? (patient.no_registrasi || '') : '',
        'Tanggal Pemeriksaan': patient.tanggal_pemeriksaan 
          ? new Date(patient.tanggal_pemeriksaan).toLocaleDateString('id-ID')
          : '',
        'Nama': patient.nama,
        'No. KTP': patient.no_ktp || '',
        'No. Telepon': patient.no_telepon || '',
        'Jenis Kelamin': patient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
        'Usia': patient.usia,
        'Alamat': patient.alamat,
        'Tinggi Badan (cm)': patient.tinggi_badan || '',
        'Berat Badan (kg)': patient.berat_badan || '',
        'Tensi Darah (mmHg)': patient.tensi_darah_sistol && patient.tensi_darah_diastol
          ? `${patient.tensi_darah_sistol}/${patient.tensi_darah_diastol}`
          : '',
        'Kolesterol (mg/dL)': patient.kolesterol || '',
        'GDS - Gula Darah Sesaat (mg/dL)': patient.gds || '',
        'As Urat - Asam Urat (mg/dL)': patient.as_urat || '',
        'Keluhan': patient.keluhan || '',
        'Anamnesa': patient.anamnesa || '',
        'Pemeriksaan Fisik': patient.pemeriksaan_fisik || '',
        'HPHT': patient.hpht ? new Date(patient.hpht).toLocaleDateString('id-ID') : '',
        'HPL': patient.hpl ? new Date(patient.hpl).toLocaleDateString('id-ID') : '',
        'TFU': patient.tfu || '',
        'DJJ Anak': patient.djj_anak || '',
        'Diagnosa': patient.diagnosa || '',
        'Alergi': alergiColumnExists ? (patient.alergi || '') : '',
        'Terapi': patient.terapi || '',
        'Resep Obat': resepText,
        'Dokter Pemeriksa': patient.dokter_pemeriksa || '',
        'Status': patient.status || '',
        'Tanggal Input': new Date(patient.created_at).toLocaleString('id-ID'),
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pasien');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename with date range
    const dateStr = startDate && endDate
      ? `${startDate}_${endDate}`
      : new Date().toISOString().split('T')[0];
    const filename = `Data_Pasien_Baksos_${dateStr}.xlsx`;

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting patient data:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Gagal mengekspor data';
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      errorMessage = 'Akses database ditolak. Periksa konfigurasi username dan password di file .env.local';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Tidak dapat terhubung ke database. Pastikan MySQL server sedang berjalan.';
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      errorMessage = 'Database tidak ditemukan. Pastikan database sudah dibuat atau periksa nama database di .env.local';
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Tabel pasien atau pemeriksaan belum dibuat. Silakan jalankan setup database terlebih dahulu melalui /api/setup atau import file database/schema.sql ke MySQL.';
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage, error: error.message },
      { status: 500 }
    );
  }
}
