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

    const data = await request.json();
    
    const {
      tanggal_pemeriksaan,
      nama,
      no_ktp,
      no_telepon,
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
      keluhan,
      anamnesa,
      pemeriksaan_fisik,
      hpht,
      hpl,
      tfu,
      djj_anak,
      diagnosa,
      terapi,
      resep,
      dokter_pemeriksa,
      status,
    } = data;

    // Validasi: No. KTP dan No. Telepon tidak boleh sama dengan pasien lain
    if (no_ktp) {
      const [existingKTP] = await pool.execute(
        'SELECT id, nama FROM patients WHERE no_ktp = ?',
        [no_ktp]
      ) as any[];
      
      if (existingKTP && existingKTP.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: `No. KTP "${no_ktp}" sudah terdaftar untuk pasien "${existingKTP[0].nama}"` 
          },
          { status: 400 }
        );
      }
    }

    if (no_telepon) {
      const [existingTelp] = await pool.execute(
        'SELECT id, nama FROM patients WHERE no_telepon = ?',
        [no_telepon]
      ) as any[];
      
      if (existingTelp && existingTelp.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: `No. Telepon "${no_telepon}" sudah terdaftar untuk pasien "${existingTelp[0].nama}"` 
          },
          { status: 400 }
        );
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO patients (
        tanggal_pemeriksaan,
        nama, no_ktp, no_telepon,
        jenis_kelamin, usia, alamat,
        tinggi_badan, berat_badan,
        tensi_darah_sistol, tensi_darah_diastol,
        kolesterol, gds, as_urat,
        keluhan,
        anamnesa, pemeriksaan_fisik,
        hpht, hpl, tfu, djj_anak,
        diagnosa, terapi, resep,
        dokter_pemeriksa, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tanggal_pemeriksaan || null,
        nama,
        no_ktp || null,
        no_telepon || null,
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
        keluhan || null,
        anamnesa || null,
        pemeriksaan_fisik || null,
        hpht || null,
        hpl || null,
        tfu || null,
        djj_anak || null,
        diagnosa || null,
        terapi || null,
        resep || null,
        dokter_pemeriksa || null,
        status || 'pendaftaran',
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
    const status = searchParams.get('status');
    const dokter_pemeriksa = searchParams.get('dokter_pemeriksa');

    let query = 'SELECT * FROM patients';
    const params: any[] = [];
    const conditions: string[] = [];

    if (startDate && endDate) {
      // Filter berdasarkan tanggal_pemeriksaan jika ada, jika tidak gunakan created_at
      // Gunakan BETWEEN untuk rentang tanggal jika startDate dan endDate berbeda, atau = jika sama
      if (startDate === endDate) {
        conditions.push('(tanggal_pemeriksaan = ? OR (tanggal_pemeriksaan IS NULL AND DATE(created_at) = ?))');
        params.push(startDate, startDate);
      } else {
        conditions.push('(tanggal_pemeriksaan BETWEEN ? AND ? OR (tanggal_pemeriksaan IS NULL AND DATE(created_at) BETWEEN ? AND ?))');
        params.push(startDate, endDate, startDate, endDate);
      }
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (dokter_pemeriksa) {
      // Gunakan LIKE untuk matching yang lebih fleksibel
      // Match jika nama dokter di database mengandung nama yang dicari atau sebaliknya
      const searchName = dokter_pemeriksa.trim();
      // Hapus prefix "Dr." dan suffix ", Sp.XXX" untuk mendapatkan nama inti
      const cleanName = searchName.replace(/^Dr\.\s*/i, '').replace(/,\s*Sp\.[A-Z]+$/i, '').trim();
      
      // Log untuk debugging
      console.log('Filtering by dokter_pemeriksa:', { searchName, cleanName });
      
      // Match dengan beberapa kondisi untuk fleksibilitas maksimal:
      // 1. Exact match (dengan trim) - untuk kasus nama persis sama
      // 2. Database mengandung nama inti yang dicari (tanpa Dr. dan Sp.)
      // 3. Database mengandung nama lengkap yang dicari
      // 4. Nama inti yang dicari mengandung nama di database (untuk kasus seperti "Dr. Agus Setiawan" vs "Agus Setiawan")
      // 5. Nama di database mengandung nama inti (untuk kasus seperti "Agus Setiawan" vs "Dr. Agus Setiawan, Sp.B")
      conditions.push('(TRIM(dokter_pemeriksa) = TRIM(?) OR TRIM(dokter_pemeriksa) LIKE ? OR TRIM(dokter_pemeriksa) LIKE ? OR TRIM(dokter_pemeriksa) LIKE ? OR TRIM(?) LIKE CONCAT("%", TRIM(dokter_pemeriksa), "%"))');
      params.push(searchName, `%${cleanName}%`, `%${searchName}%`, `%${cleanName.split(' ')[0]}%`, searchName);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    // Log query untuk debugging
    console.log('SQL Query:', query);
    console.log('SQL Params:', params);

    const [rows] = await pool.execute(query, params);
    
    // Log hasil untuk debugging
    console.log('Query result count:', Array.isArray(rows) ? rows.length : 0);
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('Sample result:', rows[0]);
    } else if (dokter_pemeriksa) {
      // Jika tidak ada hasil tapi ada filter dokter, coba cari tanpa filter dokter untuk debugging
      const debugQuery = 'SELECT id, nama, dokter_pemeriksa, status, tanggal_pemeriksaan, DATE(created_at) as created_date FROM patients WHERE status = ? AND (tanggal_pemeriksaan = ? OR (tanggal_pemeriksaan IS NULL AND DATE(created_at) = ?)) LIMIT 10';
      const debugParams = [searchParams.get('status') || '', searchParams.get('startDate') || '', searchParams.get('startDate') || ''];
      const [debugRows] = await pool.execute(debugQuery, debugParams);
      console.log('Debug - All patients with same status and date:', debugRows);
    }

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

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'truncate') {
      // Truncate tabel patients (menghapus semua data)
      // Gunakan connection yang sama untuk memastikan foreign key checks dinonaktifkan dengan benar
      const connection = await pool.getConnection();
      
      try {
        // Disable foreign key checks pada connection ini
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // Delete semua data dari resep_detail terlebih dahulu
        await connection.query('DELETE FROM resep_detail');
        
        // Truncate tabel patients
        await connection.query('TRUNCATE TABLE patients');
        
        // Enable kembali foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        
        return NextResponse.json({
          success: true,
          message: 'Semua data pasien berhasil dihapus (truncate)',
        });
      } catch (error: any) {
        // Pastikan foreign key checks diaktifkan kembali meskipun ada error
        try {
          await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (e) {
          // Ignore error jika sudah diaktifkan
        }
        throw error;
      } finally {
        // Release connection
        connection.release();
      }
    }

    return NextResponse.json(
      { success: false, message: 'Action tidak valid. Gunakan ?action=truncate' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error truncating patients:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Gagal menghapus data pasien';
    if (error.code === 1701) {
      errorMessage = 'Tidak dapat menghapus data karena ada foreign key constraint. Silakan hapus data di tabel resep_detail terlebih dahulu.';
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage, error: error.message },
      { status: 500 }
    );
  }
}

