import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Update patient data
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const pemeriksaanId = params.id;
    const data = await request.json();

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
      alamat,
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
    if (alamat !== undefined) {
      pasienUpdates.push('alamat = ?');
      pasienValues.push(alamat);
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
    if (tensi_darah_sistol !== undefined) {
      updates.push('tensi_darah_sistol = ?');
      values.push(tensi_darah_sistol || null);
    }
    if (tensi_darah_diastol !== undefined) {
      updates.push('tensi_darah_diastol = ?');
      values.push(tensi_darah_diastol || null);
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
    if (diagnosa !== undefined) {
      updates.push('diagnosa = ?');
      values.push(diagnosa || null);
    }
    if (terapi !== undefined) {
      updates.push('terapi = ?');
      values.push(terapi || null);
    }
    if (resep !== undefined) {
      updates.push('resep = ?');
      values.push(resep || null);
    }
    if (dokter_pemeriksa !== undefined) {
      updates.push('dokter_pemeriksa = ?');
      values.push(dokter_pemeriksa || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
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
    const [rows] = await pool.execute(
      `SELECT 
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
