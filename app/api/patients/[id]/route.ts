import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Update patient data
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Parse request data first
  const pemeriksaanId = params.id;
  const data = await request.json();
  
  // Check and update status ENUM to include 'dibatalkan' if needed (before transaction)
  // This is especially important if status is 'dibatalkan'
  try {
    const [statusColumns] = await pool.execute(
      "SHOW COLUMNS FROM pemeriksaan WHERE Field = 'status'"
    ) as any[];
    
    if (statusColumns && statusColumns.length > 0) {
      const columnType = statusColumns[0].Type;
      const enumString = columnType.toString().toLowerCase();
      
      // Check if 'dibatalkan' is not in the ENUM values
      if (enumString.includes("enum") && !enumString.includes("dibatalkan")) {
        console.log('Adding dibatalkan to status ENUM...');
        // Modify ENUM to include 'dibatalkan' (must be outside transaction)
        await pool.execute(`
          ALTER TABLE pemeriksaan 
          MODIFY COLUMN status ENUM('pendaftaran', 'perawat', 'dokter', 'farmasi', 'selesai', 'dibatalkan') DEFAULT 'pendaftaran'
        `);
        console.log('Status ENUM successfully updated to include dibatalkan');
      }
    }
  } catch (migError: any) {
    console.error('Error checking/updating status ENUM:', migError.message);
    // If status is 'dibatalkan' and migration failed, return error
    if (data.status === 'dibatalkan') {
      return NextResponse.json(
        { success: false, message: 'Gagal memperbarui status. Silakan coba lagi atau hubungi administrator.' },
        { status: 500 }
      );
    }
  }
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Ambil pemeriksaan untuk mendapatkan pasien_id
    const [pemeriksaanRows] = await connection.execute(
      'SELECT pasien_id FROM pemeriksaan WHERE id = ?',
      [pemeriksaanId]
    ) as any[];

    if (!pemeriksaanRows || pemeriksaanRows.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, message: 'Pemeriksaan tidak ditemukan' },
        { status: 404 }
      );
    }

    const pasienId = pemeriksaanRows[0].pasien_id;

    // Handle update data personal pasien
    const {
      nama,
      no_ktp,
      no_telepon,
      jenis_kelamin,
      tanggal_lahir,
      tempat_lahir,
      jabatan,
      unit,
      alamat,
      email,
      lokasi_penugasan,
      tanggal_mulai_tugas,
      durasi_penugasan,
    } = data;

    // Validasi: No. KTP dan No. Telepon tidak boleh sama dengan pasien lain (kecuali pasien yang sedang diupdate)
    if (no_ktp !== undefined && no_ktp) {
      const [existingKTP] = await connection.execute(
        'SELECT id, nama FROM pasien WHERE no_ktp = ? AND id != ?',
        [no_ktp, pasienId]
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

    if (no_telepon !== undefined && no_telepon) {
      const [existingTelp] = await connection.execute(
        'SELECT id, nama FROM pasien WHERE no_telepon = ? AND id != ?',
        [no_telepon, pasienId]
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

    // Update data pasien jika ada perubahan
    const pasienUpdates: string[] = [];
    const pasienValues: any[] = [];

    if (nama !== undefined) {
      pasienUpdates.push('nama = ?');
      pasienValues.push(nama);
    }
    if (no_ktp !== undefined) {
      pasienUpdates.push('no_ktp = ?');
      pasienValues.push(no_ktp || null);
    }
    if (no_telepon !== undefined) {
      pasienUpdates.push('no_telepon = ?');
      pasienValues.push(no_telepon || null);
    }
    if (jenis_kelamin !== undefined) {
      pasienUpdates.push('jenis_kelamin = ?');
      pasienValues.push(jenis_kelamin);
    }
    if (tanggal_lahir !== undefined) {
      pasienUpdates.push('tanggal_lahir = ?');
      pasienValues.push(tanggal_lahir || null);
    }
    if (tempat_lahir !== undefined) {
      pasienUpdates.push('tempat_lahir = ?');
      pasienValues.push(tempat_lahir || null);
    }
    if (jabatan !== undefined) {
      pasienUpdates.push('jabatan = ?');
      pasienValues.push(jabatan || null);
    }
    if (unit !== undefined) {
      pasienUpdates.push('unit = ?');
      pasienValues.push(unit || null);
    }
    if (alamat !== undefined) {
      pasienUpdates.push('alamat = ?');
      pasienValues.push(alamat);
    }
    if (email !== undefined) {
      pasienUpdates.push('email = ?');
      pasienValues.push(email || null);
    }
    if (lokasi_penugasan !== undefined) {
      pasienUpdates.push('lokasi_penugasan = ?');
      pasienValues.push(lokasi_penugasan || null);
    }
    if (tanggal_mulai_tugas !== undefined) {
      pasienUpdates.push('tanggal_mulai_tugas = ?');
      pasienValues.push(tanggal_mulai_tugas || null);
    }
    if (durasi_penugasan !== undefined) {
      pasienUpdates.push('durasi_penugasan = ?');
      pasienValues.push(durasi_penugasan || null);
    }

    if (pasienUpdates.length > 0) {
      pasienValues.push(pasienId);
      await connection.execute(
        `UPDATE pasien SET ${pasienUpdates.join(', ')} WHERE id = ?`,
        pasienValues
      );
    }

    // Handle update data pemeriksaan
    const {
      tanggal_pemeriksaan,
      tinggi_badan,
      berat_badan,
      imt,
      tensi_darah_sistol,
      tensi_darah_diastol,
      denyut_nadi,
      suhu_tubuh,
      laju_pernapasan,
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
      alergi,
      resep,
      dokter_pemeriksa,
      lokasi_id,
      status,
      riwayat_malaria,
      riwayat_malaria_ket,
      riwayat_kronis,
      riwayat_kronis_ket,
      riwayat_rawat_inap,
      riwayat_rawat_inap_ket,
      riwayat_alergi_obat,
      riwayat_alergi_obat_ket,
      riwayat_merokok,
      riwayat_merokok_ket,
      riwayat_alkohol,
      riwayat_alkohol_ket,
      riwayat_obat_rutin,
      riwayat_obat_rutin_ket,
      catatan_khusus,
      fisik_keadaan_umum,
      fisik_keadaan_umum_ket,
      fisik_kepala_leher,
      fisik_jantung,
      fisik_paru,
      fisik_abdomen,
      fisik_ekstremitas,
      fisik_kulit,
      fisik_lain_lain,
      kesimpulan_kelayakan,
      saran_medis,
    } = data;

    // Build dynamic update query untuk pemeriksaan
    const updates: string[] = [];
    const values: any[] = [];

    if (tanggal_pemeriksaan !== undefined) {
      updates.push('tanggal_pemeriksaan = ?');
      values.push(tanggal_pemeriksaan || null);
    }
    if (tinggi_badan !== undefined) {
      updates.push('tinggi_badan = ?');
      values.push(tinggi_badan || null);
    }
    if (berat_badan !== undefined) {
      updates.push('berat_badan = ?');
      values.push(berat_badan || null);
    }
    if (imt !== undefined) {
      updates.push('imt = ?');
      values.push(imt || null);
    }
    if (tensi_darah_sistol !== undefined) {
      updates.push('tensi_darah_sistol = ?');
      values.push(tensi_darah_sistol || null);
    }
    if (tensi_darah_diastol !== undefined) {
      updates.push('tensi_darah_diastol = ?');
      values.push(tensi_darah_diastol || null);
    }
    if (denyut_nadi !== undefined) {
      updates.push('denyut_nadi = ?');
      values.push(denyut_nadi || null);
    }
    if (suhu_tubuh !== undefined) {
      updates.push('suhu_tubuh = ?');
      values.push(suhu_tubuh || null);
    }
    if (laju_pernapasan !== undefined) {
      updates.push('laju_pernapasan = ?');
      values.push(laju_pernapasan || null);
    }
    if (kolesterol !== undefined) {
      updates.push('kolesterol = ?');
      values.push(kolesterol || null);
    }
    if (gds !== undefined) {
      updates.push('gds = ?');
      values.push(gds || null);
    }
    if (as_urat !== undefined) {
      updates.push('as_urat = ?');
      values.push(as_urat || null);
    }
    if (keluhan !== undefined) {
      updates.push('keluhan = ?');
      values.push(keluhan || null);
    }
    if (anamnesa !== undefined) {
      updates.push('anamnesa = ?');
      values.push(anamnesa || null);
    }
    if (pemeriksaan_fisik !== undefined) {
      updates.push('pemeriksaan_fisik = ?');
      values.push(pemeriksaan_fisik || null);
    }
    if (hpht !== undefined) {
      updates.push('hpht = ?');
      values.push(hpht || null);
    }
    if (hpl !== undefined) {
      updates.push('hpl = ?');
      values.push(hpl || null);
    }
    if (tfu !== undefined) {
      updates.push('tfu = ?');
      values.push(tfu || null);
    }
    if (djj_anak !== undefined) {
      updates.push('djj_anak = ?');
      values.push(djj_anak || null);
    }
    if (riwayat_malaria !== undefined) {
      updates.push('riwayat_malaria = ?');
      values.push(riwayat_malaria || 'Tidak');
    }
    if (riwayat_malaria_ket !== undefined) {
      updates.push('riwayat_malaria_ket = ?');
      values.push(riwayat_malaria_ket || null);
    }
    if (riwayat_kronis !== undefined) {
      updates.push('riwayat_kronis = ?');
      values.push(riwayat_kronis || 'Tidak');
    }
    if (riwayat_kronis_ket !== undefined) {
      updates.push('riwayat_kronis_ket = ?');
      values.push(riwayat_kronis_ket || null);
    }
    if (riwayat_rawat_inap !== undefined) {
      updates.push('riwayat_rawat_inap = ?');
      values.push(riwayat_rawat_inap || 'Tidak');
    }
    if (riwayat_rawat_inap_ket !== undefined) {
      updates.push('riwayat_rawat_inap_ket = ?');
      values.push(riwayat_rawat_inap_ket || null);
    }
    if (riwayat_alergi_obat !== undefined) {
      updates.push('riwayat_alergi_obat = ?');
      values.push(riwayat_alergi_obat || 'Tidak');
    }
    if (riwayat_alergi_obat_ket !== undefined) {
      updates.push('riwayat_alergi_obat_ket = ?');
      values.push(riwayat_alergi_obat_ket || null);
    }
    if (riwayat_merokok !== undefined) {
      updates.push('riwayat_merokok = ?');
      values.push(riwayat_merokok || 'Tidak');
    }
    if (riwayat_merokok_ket !== undefined) {
      updates.push('riwayat_merokok_ket = ?');
      values.push(riwayat_merokok_ket || null);
    }
    if (riwayat_alkohol !== undefined) {
      updates.push('riwayat_alkohol = ?');
      values.push(riwayat_alkohol || 'Tidak');
    }
    if (riwayat_alkohol_ket !== undefined) {
      updates.push('riwayat_alkohol_ket = ?');
      values.push(riwayat_alkohol_ket || null);
    }
    if (riwayat_obat_rutin !== undefined) {
      updates.push('riwayat_obat_rutin = ?');
      values.push(riwayat_obat_rutin || 'Tidak');
    }
    if (riwayat_obat_rutin_ket !== undefined) {
      updates.push('riwayat_obat_rutin_ket = ?');
      values.push(riwayat_obat_rutin_ket || null);
    }
    if (catatan_khusus !== undefined) {
      updates.push('catatan_khusus = ?');
      values.push(catatan_khusus || null);
    }
    if (fisik_keadaan_umum !== undefined) {
      updates.push('fisik_keadaan_umum = ?');
      values.push(fisik_keadaan_umum || 'Baik');
    }
    if (fisik_keadaan_umum_ket !== undefined) {
      updates.push('fisik_keadaan_umum_ket = ?');
      values.push(fisik_keadaan_umum_ket || null);
    }
    if (fisik_kepala_leher !== undefined) {
      updates.push('fisik_kepala_leher = ?');
      values.push(fisik_kepala_leher || null);
    }
    if (fisik_jantung !== undefined) {
      updates.push('fisik_jantung = ?');
      values.push(fisik_jantung || null);
    }
    if (fisik_paru !== undefined) {
      updates.push('fisik_paru = ?');
      values.push(fisik_paru || null);
    }
    if (fisik_abdomen !== undefined) {
      updates.push('fisik_abdomen = ?');
      values.push(fisik_abdomen || null);
    }
    if (fisik_ekstremitas !== undefined) {
      updates.push('fisik_ekstremitas = ?');
      values.push(fisik_ekstremitas || null);
    }
    if (fisik_kulit !== undefined) {
      updates.push('fisik_kulit = ?');
      values.push(fisik_kulit || null);
    }
    if (fisik_lain_lain !== undefined) {
      updates.push('fisik_lain_lain = ?');
      values.push(fisik_lain_lain || null);
    }
    if (kesimpulan_kelayakan !== undefined) {
      updates.push('kesimpulan_kelayakan = ?');
      values.push(kesimpulan_kelayakan || null);
    }
    if (saran_medis !== undefined) {
      updates.push('saran_medis = ?');
      values.push(saran_medis || null);
    }
    if (alergi !== undefined) {
      updates.push('alergi = ?');
      values.push(alergi || null);
    }
    if (resep !== undefined) {
      updates.push('resep = ?');
      values.push(resep || null);
    }
    if (dokter_pemeriksa !== undefined) {
      updates.push('dokter_pemeriksa = ?');
      values.push(dokter_pemeriksa || null);
    }
    if (lokasi_id !== undefined) {
      updates.push('lokasi_id = ?');
      values.push(lokasi_id || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    // Auto-unlock when status changes or data is saved
    // Check if locked_by column exists
    let lockedByColumnExists = false;
    try {
      const [lockedByColumns] = await connection.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'locked_by'"
      ) as any[];
      lockedByColumnExists = lockedByColumns.length > 0;
      
      if (lockedByColumnExists) {
        // Unlock when saving data
        updates.push('locked_by = NULL, locked_at = NULL');
      }
    } catch (e) {
      // Column doesn't exist, continue
    }

    if (updates.length === 0 && pasienUpdates.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, message: 'Tidak ada data yang diupdate' },
        { status: 400 }
      );
    }

    if (updates.length > 0) {
      values.push(pemeriksaanId);
      await connection.execute(
        `UPDATE pemeriksaan SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: 'Data pasien berhasil diupdate',
    });
  } catch (error: any) {
    await connection.rollback();
    connection.release();
    console.error('Error updating patient data:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengupdate data pasien', error: error.message },
      { status: 500 }
    );
  }
}

// Get single patient
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pemeriksaanId = params.id;
    
    // Check if no_registrasi column exists
    let noRegistrasiColumnExists = false;
    try {
      const [noRegistrasiColumns] = await pool.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'no_registrasi'"
      ) as any[];
      noRegistrasiColumnExists = noRegistrasiColumns.length > 0;
    } catch (e) {
      // Column doesn't exist, continue without it
    }
    
    const [rows] = await pool.execute(
      `SELECT 
        p.id as pasien_id,
        p.nama,
        p.no_ktp,
        p.no_telepon,
        p.jenis_kelamin,
        p.tanggal_lahir,
        p.tempat_lahir,
        p.jabatan,
        p.unit,
        TIMESTAMPDIFF(YEAR, p.tanggal_lahir, CURDATE()) as usia,
        p.alamat,
        p.email,
        p.lokasi_penugasan,
        p.tanggal_mulai_tugas,
        p.durasi_penugasan,
        p.created_at as pasien_created_at,
        p.updated_at as pasien_updated_at,
        pm.id${noRegistrasiColumnExists ? ',\n        pm.no_registrasi' : ''},
        pm.tanggal_pemeriksaan,
        pm.tinggi_badan,
        pm.berat_badan,
        pm.imt,
        pm.tensi_darah_sistol,
        pm.tensi_darah_diastol,
        pm.denyut_nadi,
        pm.suhu_tubuh,
        pm.laju_pernapasan,
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
        pm.alergi,
        pm.resep,
        pm.riwayat_malaria,
        pm.riwayat_malaria_ket,
        pm.riwayat_kronis,
        pm.riwayat_kronis_ket,
        pm.riwayat_rawat_inap,
        pm.riwayat_rawat_inap_ket,
        pm.riwayat_alergi_obat,
        pm.riwayat_alergi_obat_ket,
        pm.riwayat_merokok,
        pm.riwayat_merokok_ket,
        pm.riwayat_alkohol,
        pm.riwayat_alkohol_ket,
        pm.riwayat_obat_rutin,
        pm.riwayat_obat_rutin_ket,
        pm.catatan_khusus,
        pm.fisik_keadaan_umum,
        pm.fisik_keadaan_umum_ket,
        pm.fisik_kepala_leher,
        pm.fisik_jantung,
        pm.fisik_paru,
        pm.fisik_abdomen,
        pm.fisik_ekstremitas,
        pm.fisik_kulit,
        pm.fisik_lain_lain,
        pm.kesimpulan_kelayakan,
        pm.saran_medis,
        pm.dokter_pemeriksa,
        pm.lokasi_id,
        pm.status,
        pm.created_at,
        pm.updated_at
      FROM pemeriksaan pm
      INNER JOIN pasien p ON pm.pasien_id = p.id
      WHERE pm.id = ?`,
      [pemeriksaanId]
    );

    const patients = rows as any[];
    if (patients.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Pemeriksaan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: patients[0] });
  } catch (error: any) {
    console.error('Error fetching patient data:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data pasien', error: error.message },
      { status: 500 }
    );
  }
}
