import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

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

    const data = await request.json();
    
    const {
      tanggal_pemeriksaan,
      nama,
      jenis_kelamin,
      usia,
      alamat,
      tinggi_badan,
      berat_badan,
      tensi_darah_sistol,
      tensi_darah_diastol,
      kolesterol,
      gds,
      as_urat,
      anamnesa,
      pemeriksaan_fisik,
      hpht,
      hpl,
      tfu,
      djj_anak,
      diagnosa,
      terapi,
      dokter_pemeriksa,
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO patients (
        tanggal_pemeriksaan,
        nama, jenis_kelamin, usia, alamat,
        tinggi_badan, berat_badan,
        tensi_darah_sistol, tensi_darah_diastol,
        kolesterol, gds, as_urat,
        anamnesa, pemeriksaan_fisik,
        hpht, hpl, tfu, djj_anak,
        diagnosa, terapi, dokter_pemeriksa
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tanggal_pemeriksaan || null,
        nama,
        jenis_kelamin,
        usia,
        alamat,
        tinggi_badan || null,
        berat_badan || null,
        tensi_darah_sistol || null,
        tensi_darah_diastol || null,
        kolesterol || null,
        gds || null,
        as_urat || null,
        anamnesa || null,
        pemeriksaan_fisik || null,
        hpht || null,
        hpl || null,
        tfu || null,
        djj_anak || null,
        diagnosa || null,
        terapi || null,
        dokter_pemeriksa || null,
      ]
    );

    return NextResponse.json(
      { success: true, message: 'Data pasien berhasil disimpan', id: (result as any).insertId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error saving patient data:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Gagal menyimpan data pasien';
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

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Error fetching patient data:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Gagal mengambil data pasien';
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

