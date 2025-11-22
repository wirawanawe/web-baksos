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

    // Check and migrate if kode column doesn't exist in lokasi table
    let kodeColumnExists = false;
    let noRegistrasiColumnExists = false;
    try {
      const [kodeColumns] = await connection.execute(
        "SHOW COLUMNS FROM lokasi LIKE 'kode'"
      ) as any[];
      
      kodeColumnExists = kodeColumns.length > 0;
      
      if (!kodeColumnExists) {
        console.log('kode column not found in lokasi table, adding it...');
        await connection.execute(`
          ALTER TABLE lokasi 
          ADD COLUMN kode VARCHAR(10) AFTER nama_lokasi
        `);
        kodeColumnExists = true;
        console.log('kode column added successfully to lokasi table');
      }
      
      // Check for no_registrasi column in pemeriksaan table
      const [noRegistrasiColumns] = await connection.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'no_registrasi'"
      ) as any[];
      
      noRegistrasiColumnExists = noRegistrasiColumns.length > 0;
      
      if (!noRegistrasiColumnExists) {
        console.log('no_registrasi column not found in pemeriksaan table, adding it...');
        await connection.execute(`
          ALTER TABLE pemeriksaan 
          ADD COLUMN no_registrasi VARCHAR(20) AFTER id,
          ADD INDEX idx_no_registrasi (no_registrasi)
        `);
        noRegistrasiColumnExists = true;
        console.log('no_registrasi column added successfully to pemeriksaan table');
      }
    } catch (migError: any) {
      console.error('Migration check error (continuing anyway):', migError.message);
      // Continue without kode and no_registrasi columns
      kodeColumnExists = false;
      noRegistrasiColumnExists = false;
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
      alergi,
      terapi,
      resep,
      dokter_pemeriksa,
      lokasi_id,
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

    // Generate nomor registrasi
    let noRegistrasi = null;
    if (lokasi_id && noRegistrasiColumnExists) {
      try {
        // Get kode lokasi
        let kodeLokasi = 'REG';
        if (kodeColumnExists) {
          const [lokasiRows] = await connection.execute(
            'SELECT kode FROM lokasi WHERE id = ?',
            [lokasi_id]
          ) as any[];
          
          if (lokasiRows && lokasiRows.length > 0 && lokasiRows[0].kode) {
            kodeLokasi = lokasiRows[0].kode;
          }
        }
        
        // Get the last registration number for this location
        const [lastRegRows] = await connection.execute(
          `SELECT no_registrasi FROM pemeriksaan 
           WHERE lokasi_id = ? AND no_registrasi IS NOT NULL 
           ORDER BY id DESC LIMIT 1`,
          [lokasi_id]
        ) as any[];
        
        let nextNumber = 1;
        if (lastRegRows && lastRegRows.length > 0 && lastRegRows[0].no_registrasi) {
          const lastReg = lastRegRows[0].no_registrasi;
          // Extract number from format: KODE-XXXX
          const match = lastReg.match(/-(\d+)$/);
          if (match) {
            const lastNumber = parseInt(match[1], 10);
            nextNumber = lastNumber + 1;
            // Reset to 1 if exceeds 9999
            if (nextNumber > 9999) {
              nextNumber = 1;
            }
          }
        }
        
        // Format: KODE-0001, KODE-0002, etc.
        noRegistrasi = `${kodeLokasi}-${String(nextNumber).padStart(4, '0')}`;
      } catch (regError: any) {
        console.error('Error generating registration number:', regError);
        // Continue without registration number if generation fails
      }
    }

    // Insert pemeriksaan
    const insertFields = [
      'pasien_id', 'tanggal_pemeriksaan',
      'tinggi_badan', 'berat_badan',
      'tensi_darah_sistol', 'tensi_darah_diastol',
      'kolesterol', 'gds', 'as_urat',
      'keluhan',
      'anamnesa', 'pemeriksaan_fisik',
      'hpht', 'hpl', 'tfu', 'djj_anak',
      'diagnosa', 'alergi', 'terapi', 'resep',
      'dokter_pemeriksa', 'lokasi_id', 'status'
    ];
    
    const insertValues = [
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
      alergi || null,
      terapi || null,
      resep || null,
      dokter_pemeriksa || null,
      lokasi_id || null,
      status || 'pendaftaran',
    ];
    
    if (noRegistrasiColumnExists && noRegistrasi) {
      insertFields.unshift('no_registrasi');
      insertValues.unshift(noRegistrasi);
    }
    
    const placeholders = insertFields.map(() => '?').join(', ');
    const [pemeriksaanResult] = await connection.execute(
      `INSERT INTO pemeriksaan (${insertFields.join(', ')}) VALUES (${placeholders})`,
      insertValues
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
    // Check and migrate if lokasi_id column doesn't exist
    let lokasiIdColumnExists = false;
    let alergiColumnExists = false;
    let noRegistrasiColumnExists = false;
    let lockedByColumnExists = false;
    try {
      const [columns] = await pool.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'lokasi_id'"
      ) as any[];
      
      lokasiIdColumnExists = columns.length > 0;
      
      // Check for alergi column
      const [alergiColumns] = await pool.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'alergi'"
      ) as any[];
      
      alergiColumnExists = alergiColumns.length > 0;
      
      // Check for no_registrasi column
      const [noRegistrasiColumns] = await pool.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'no_registrasi'"
      ) as any[];
      
      noRegistrasiColumnExists = noRegistrasiColumns.length > 0;
      
      // Check for locked_by column
      const [lockedByColumns] = await pool.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'locked_by'"
      ) as any[];
      
      lockedByColumnExists = lockedByColumns.length > 0;
      
      if (!lockedByColumnExists) {
        try {
          await pool.execute(`
            ALTER TABLE pemeriksaan 
            ADD COLUMN locked_by VARCHAR(255) AFTER status,
            ADD COLUMN locked_at TIMESTAMP NULL AFTER locked_by,
            ADD INDEX idx_locked_by (locked_by)
          `);
          lockedByColumnExists = true;
          console.log('locked_by column added successfully');
        } catch (lockError: any) {
          console.error('Error adding locked_by column:', lockError.message);
        }
      }
      
      if (!alergiColumnExists) {
        try {
          console.log('alergi column not found, adding it...');
          await pool.execute(`
            ALTER TABLE pemeriksaan 
            ADD COLUMN alergi TEXT AFTER diagnosa
          `);
          alergiColumnExists = true;
          console.log('alergi column added successfully');
        } catch (alergiError: any) {
          console.error('Error adding alergi column:', alergiError.message);
          // Column might already exist or there's a constraint issue
          // Check again if column exists
          const [recheckAlergi] = await pool.execute(
            "SHOW COLUMNS FROM pemeriksaan LIKE 'alergi'"
          ) as any[];
          alergiColumnExists = recheckAlergi.length > 0;
          if (!alergiColumnExists) {
            console.warn('Could not add alergi column, continuing without it');
          }
        }
      }
      
      if (!lokasiIdColumnExists) {
        console.log('lokasi_id column not found, adding it...');
        
        // First ensure lokasi table exists
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
        
        // Add lokasi_id column
        await pool.execute(`
          ALTER TABLE pemeriksaan 
          ADD COLUMN lokasi_id INT AFTER dokter_pemeriksa
        `);
        
        // Add index
        try {
          await pool.execute(`
            ALTER TABLE pemeriksaan 
            ADD INDEX idx_lokasi_id (lokasi_id)
          `);
        } catch (idxError: any) {
          // Index might already exist
          console.log('Index note:', idxError.message);
        }
        
        // Add foreign key if lokasi table exists
        try {
          await pool.execute(`
            ALTER TABLE pemeriksaan 
            ADD CONSTRAINT fk_pemeriksaan_lokasi 
            FOREIGN KEY (lokasi_id) REFERENCES lokasi(id) ON DELETE SET NULL
          `);
        } catch (fkError: any) {
          // Foreign key might already exist or constraint name conflict
          console.log('Foreign key constraint note:', fkError.message);
        }
        
        lokasiIdColumnExists = true;
        console.log('lokasi_id column added successfully');
      }
    } catch (migError: any) {
      console.error('Migration check error (continuing anyway):', migError.message);
      // Continue without lokasi_id and alergi columns
      lokasiIdColumnExists = false;
      alergiColumnExists = false;
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const dokter_pemeriksa = searchParams.get('dokter_pemeriksa');
    const dokter_id = searchParams.get('dokter_id');
    const lokasi_id = searchParams.get('lokasi_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;
    
    // Ensure limit and offset are valid integers
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { success: false, message: 'Invalid page parameter' },
        { status: 400 }
      );
    }
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { success: false, message: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    // Query dengan JOIN antara pasien dan pemeriksaan
    // Include lokasi_id only if column exists
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
        pm.id${noRegistrasiColumnExists ? ',\n        pm.no_registrasi' : ''},
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
        pm.status${lockedByColumnExists ? ',\n        pm.locked_by,\n        pm.locked_at' : ''},
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

    // Filter berdasarkan lokasi_id jika dokter_id diberikan
    let dokterLokasiId: number | null = null;
    if (dokter_id) {
      try {
        const [dokterRows] = await pool.execute(
          'SELECT lokasi_id FROM dokter WHERE id = ?',
          [dokter_id]
        ) as any[];
        
        if (dokterRows && dokterRows.length > 0) {
          dokterLokasiId = dokterRows[0].lokasi_id;
        }
      } catch (dokterError: any) {
        console.error('Error fetching dokter lokasi_id:', dokterError);
      }
    }

    // Filter berdasarkan lokasi_id (dari query param atau dari dokter)
    let filterLokasiId: number | null = null;
    if (lokasi_id) {
      const parsedLokasiId = parseInt(lokasi_id, 10);
      if (!isNaN(parsedLokasiId)) {
        filterLokasiId = parsedLokasiId;
      }
    } else if (dokterLokasiId !== null && dokterLokasiId !== undefined) {
      filterLokasiId = dokterLokasiId;
    }
    
    if (filterLokasiId !== null && filterLokasiId !== undefined && !isNaN(filterLokasiId) && lokasiIdColumnExists) {
      conditions.push('pm.lokasi_id = ?');
      params.push(filterLokasiId);
    }

    // Search filter
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
    
    // Add pagination - get total count first
    let countQuery = `
      SELECT COUNT(*) as total
      FROM pemeriksaan pm
      INNER JOIN pasien p ON pm.pasien_id = p.id
    `;
    const countParams: any[] = [];
    const countConditions: string[] = [];
    
    // Apply same conditions for count
    if (startDate && endDate) {
      if (startDate === endDate) {
        countConditions.push('(pm.tanggal_pemeriksaan = ? OR (pm.tanggal_pemeriksaan IS NULL AND DATE(pm.created_at) = ?))');
        countParams.push(startDate, startDate);
      } else {
        countConditions.push('(pm.tanggal_pemeriksaan BETWEEN ? AND ? OR (pm.tanggal_pemeriksaan IS NULL AND DATE(pm.created_at) BETWEEN ? AND ?))');
        countParams.push(startDate, endDate, startDate, endDate);
      }
    }
    if (status) {
      countConditions.push('pm.status = ?');
      countParams.push(status);
    }
    if (dokter_pemeriksa) {
      const searchName = dokter_pemeriksa.trim();
      const cleanName = searchName.replace(/^Dr\.\s*/i, '').replace(/,\s*Sp\.[A-Z]+$/i, '').trim();
      countConditions.push('(TRIM(pm.dokter_pemeriksa) = TRIM(?) OR TRIM(pm.dokter_pemeriksa) LIKE ? OR TRIM(pm.dokter_pemeriksa) LIKE ? OR TRIM(pm.dokter_pemeriksa) LIKE ? OR TRIM(?) LIKE CONCAT("%", TRIM(pm.dokter_pemeriksa), "%"))');
      countParams.push(searchName, `%${cleanName}%`, `%${searchName}%`, `%${cleanName.split(' ')[0]}%`, searchName);
    }
    if (filterLokasiId !== null && filterLokasiId !== undefined && !isNaN(filterLokasiId) && lokasiIdColumnExists) {
      countConditions.push('pm.lokasi_id = ?');
      countParams.push(filterLokasiId);
    }
    if (search) {
      countConditions.push('(p.nama LIKE ? OR p.no_ktp LIKE ? OR p.no_telepon LIKE ?)');
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }
    
    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }
    
    let total = 0;
    let totalPages = 1;
    try {
      const [countResult] = await pool.execute(countQuery, countParams) as any[];
      total = countResult[0]?.total || 0;
      totalPages = Math.ceil(total / limit);
    } catch (countError: any) {
      console.error('Error executing count query:', countError);
      // If count query fails, try to get total from main query without limit
      // For now, just set default values
      total = 0;
      totalPages = 1;
    }
    
    // MySQL doesn't support LIMIT and OFFSET as parameters in prepared statements
    // Use them as literals instead (with validation for security)
    const limitNum = Math.max(1, Math.min(1000, Number(limit))); // Clamp between 1 and 1000
    const offsetNum = Math.max(0, Number(offset)); // Must be >= 0
    query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;

    console.log('SQL Query:', query);
    console.log('SQL Params:', params);
    console.log('SQL Params count:', params.length);
    console.log('Limit:', limitNum, 'Type:', typeof limitNum);
    console.log('Offset:', offsetNum, 'Type:', typeof offsetNum);
    console.log('Count Query:', countQuery);
    console.log('Count Params:', countParams);

    const [rows] = await pool.execute(query, params);
    
    console.log('Query result count:', Array.isArray(rows) ? rows.length : 0);
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('Sample result:', rows[0]);
    }

    return NextResponse.json({ 
      success: true, 
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
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
