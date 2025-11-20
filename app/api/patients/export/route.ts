import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import * as XLSX from 'xlsx';

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

    let query = 'SELECT * FROM patients';
    const params: any[] = [];

    if (startDate && endDate) {
      query += ' WHERE DATE(created_at) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, params);
    const patients = rows as any[];

    // Prepare data for Excel
    const excelData = patients.map((patient) => ({
      'No': patient.id,
      'Tanggal Pemeriksaan': patient.tanggal_pemeriksaan 
        ? new Date(patient.tanggal_pemeriksaan).toLocaleDateString('id-ID')
        : '',
      'Nama': patient.nama,
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
      'Anamnesa': patient.anamnesa || '',
      'Pemeriksaan Fisik': patient.pemeriksaan_fisik || '',
      'HPHT': patient.hpht ? new Date(patient.hpht).toLocaleDateString('id-ID') : '',
      'HPL': patient.hpl ? new Date(patient.hpl).toLocaleDateString('id-ID') : '',
      'TFU': patient.tfu || '',
      'DJJ Anak': patient.djj_anak || '',
      'Diagnosa': patient.diagnosa || '',
      'Terapi': patient.terapi || '',
      'Dokter Pemeriksa': patient.dokter_pemeriksa || '',
      'Tanggal Input': new Date(patient.created_at).toLocaleString('id-ID'),
    }));

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
      errorMessage = 'Tabel patients belum dibuat. Silakan jalankan setup database terlebih dahulu melalui /api/setup atau import file database/schema.sql ke MySQL.';
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage, error: error.message },
      { status: 500 }
    );
  }
}

