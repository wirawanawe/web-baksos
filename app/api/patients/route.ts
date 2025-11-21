import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Test database connection first
    try {
      await connection.execute('SELECT 1');
    } catch (dbError: any) {
      await connection.rollback();
      connection.release();
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
      tanggal_lahir,
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
      const [existingKTP] = await connection.execute(
        'SELECT id, nama FROM pasien WHERE no_ktp = ?',
        [no_ktp]
      ) as any[];
      
      if (existingKTP && existingKTP.length > 0) {
        await connection.rollback();
        connection.release();
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
      const [existingTelp] = await connection.execute(
        'SELECT id, nama FROM pasien WHERE no_telepon = ?',
        [no_telepon]
      ) as any[];
      
      if (existingTelp && existingTelp.length > 0) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { 
            success: false, 
            message: `No. Telepon "${no_telepon}" sudah terdaftar untuk pasien "${existingTelp[0].nama}"` 
          },
          { status: 400 }
        );
      }
    }

    // Insert atau ambil pasien_id
    let pasienId: number;
    
    // Cek apakah pasien sudah ada berdasarkan no_ktp atau no_telepon
    if (no_ktp || no_telepon) {
      let checkQuery = 'SELECT id FROM pasien WHERE ';
      const checkParams: any[] = [];
      
      if (no_ktp && no_telepon) {
        checkQuery += '(no_ktp = ? OR no_telepon = ?)';
        checkParams.push(no_ktp, no_telepon);
      } else if (no_ktp) {
        checkQuery += 'no_ktp = ?';
        checkParams.push(no_ktp);
      } else {
        checkQuery += 'no_telepon = ?';
        checkParams.push(no_telepon);
      }
      
      const [existingPasien] = await connection.execute(checkQuery, checkParams) as any[];
      
      if (existingPasien && existingPasien.length > 0) {
        pasienId = existingPasien[0].id;
        // Update data pasien jika ada perubahan
        await connection.execute(
          'UPDATE pasien SET nama = ?, jenis_kelamin = ?, tanggal_lahir = ?, alamat = ? WHERE id = ?',
          [nama, jenis_kelamin, tanggal_lahir || null, alamat, pasienId]
        );
      } else {
        // Insert pasien baru
        const [pasienResult] = await connection.execute(
          'INSERT INTO pasien (nama, no_ktp, no_telepon, jenis_kelamin, tanggal_lahir, alamat) VALUES (?, ?, ?, ?, ?, ?)',
          [nama, no_ktp || null, no_telepon || null, jenis_kelamin, tanggal_lahir || null, alamat]
        );
        pasienId = (pasienResult as any).insertId;
      }
    } else {
      // Jika tidak ada no_ktp dan no_telepon, insert pasien baru
      const [pasienResult] = await connection.execute(
        'INSERT INTO pasien (nama, no_ktp, no_telepon, jenis_kelamin, tanggal_lahir, alamat) VALUES (?, ?, ?, ?, ?, ?)',
        [nama, null, null, jenis_kelamin, tanggal_lahir || null, alamat]
      );
      pasienId = (pasienResult as any).insertId;
    }

    // Insert pemeriksaan
    const [pemeriksaanResult] = await connection.execute(
      `INSERT INTO pemeriksaan (
        pasien_id, tanggal_pemeriksaan,
        tinggi_badan, berat_badan,
        tensi_darah_sistol, tensi_darah_diastol,
        kolesterol, gds, as_urat,
        keluhan,
        anamnesa, pemeriksaan_fisik,
        hpht, hpl, tfu, djj_anak,
        diagnosa, terapi, resep,
        dokter_pemeriksa, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pasienId,
        tanggal_pemeriksaan || null,
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

    await connection.commit();
    connection.release();

    return NextResponse.json(
      { success: true, message: 'Data pasien berhasil disimpan', id: (pemeriksaanResult as any).insertId, pasien_id: pasienId },
      { status: 201 }
    );
  } catch (error: any) {
    await connection.rollback();
    connection.release();
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
      errorMessage = 'Tabel pasien atau pemeriksaan belum dibuat. Silakan jalankan setup database terlebih dahulu melalui /api/setup atau import file database/schema.sql ke MySQL.';
    } else if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = 'No. KTP atau No. Telepon sudah terdaftar untuk pasien lain.';
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
        p.created_at as pasien_created_at,
        p.updated_at as pasien_updated_at,
        pm.id,
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
        pm.diagnosa,
        pm.terapi,
        pm.resep,
        pm.dokter_pemeriksa,
        pm.status,
        pm.created_at,
        pm.updated_at
      FROM pemeriksaan pm
      INNER JOIN pasien p ON pm.pasien_id = p.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (startDate && endDate) {
      // Filter berdasarkan tanggal_pemeriksaan jika ada, jika tidak gunakan created_at
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

    if (dokter_pemeriksa) {
      // Gunakan LIKE untuk matching yang lebih fleksibel
      const searchName = dokter_pemeriksa.trim();
      const cleanName = searchName.replace(/^Dr\.\s*/i, '').replace(/,\s*Sp\.[A-Z]+$/i, '').trim();
      
      console.log('Filtering by dokter_pemeriksa:', { searchName, cleanName });
      
      conditions.push('(TRIM(pm.dokter_pemeriksa) = TRIM(?) OR TRIM(pm.dokter_pemeriksa) LIKE ? OR TRIM(pm.dokter_pemeriksa) LIKE ? OR TRIM(pm.dokter_pemeriksa) LIKE ? OR TRIM(?) LIKE CONCAT("%", TRIM(pm.dokter_pemeriksa), "%"))');
      params.push(searchName, `%${cleanName}%`, `%${searchName}%`, `%${cleanName.split(' ')[0]}%`, searchName);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY pm.created_at DESC';

    console.log('SQL Query:', query);
    console.log('SQL Params:', params);

    const [rows] = await pool.execute(query, params);
    
    console.log('Query result count:', Array.isArray(rows) ? rows.length : 0);
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('Sample result:', rows[0]);
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
      errorMessage = 'Tabel pasien atau pemeriksaan belum dibuat. Silakan jalankan setup database terlebih dahulu melalui /api/setup atau import file database/schema.sql ke MySQL.';
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
      // Truncate tabel pemeriksaan dan pasien (menghapus semua data)
      const connection = await pool.getConnection();
      
      try {
        // Disable foreign key checks pada connection ini
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // Delete semua data dari resep_detail terlebih dahulu
        await connection.query('DELETE FROM resep_detail');
        
        // Truncate tabel pemeriksaan
        await connection.query('TRUNCATE TABLE pemeriksaan');
        
        // Truncate tabel pasien
        await connection.query('TRUNCATE TABLE pasien');
        
        // Enable kembali foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        
        connection.release();
        
        return NextResponse.json({
          success: true,
          message: 'Semua data pasien dan pemeriksaan berhasil dihapus (truncate)',
        });
      } catch (error: any) {
        // Pastikan foreign key checks diaktifkan kembali meskipun ada error
        try {
          await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (e) {
          // Ignore error jika sudah diaktifkan
        }
        connection.release();
        throw error;
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
