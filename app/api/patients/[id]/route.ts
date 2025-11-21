import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Update patient data
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patientId = params.id;
    const data = await request.json();

    const {
      no_ktp,
      no_telepon,
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

    // Validasi: No. KTP dan No. Telepon tidak boleh sama dengan pasien lain (kecuali pasien yang sedang diupdate)
    if (no_ktp !== undefined && no_ktp) {
      const [existingKTP] = await pool.execute(
        'SELECT id, nama FROM patients WHERE no_ktp = ? AND id != ?',
        [no_ktp, patientId]
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

    if (no_telepon !== undefined && no_telepon) {
      const [existingTelp] = await pool.execute(
        'SELECT id, nama FROM patients WHERE no_telepon = ? AND id != ?',
        [no_telepon, patientId]
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

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (no_ktp !== undefined) {
      updates.push('no_ktp = ?');
      values.push(no_ktp || null);
    }
    if (no_telepon !== undefined) {
      updates.push('no_telepon = ?');
      values.push(no_telepon || null);
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

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada data yang diupdate' },
        { status: 400 }
      );
    }

    values.push(patientId);

    const query = `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);

    return NextResponse.json({
      success: true,
      message: 'Data pasien berhasil diupdate',
    });
  } catch (error: any) {
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
    const patientId = params.id;
    const [rows] = await pool.execute(
      'SELECT * FROM patients WHERE id = ?',
      [patientId]
    );

    const patients = rows as any[];
    if (patients.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Pasien tidak ditemukan' },
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

