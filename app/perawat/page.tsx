'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { formatAge } from '@/lib/formatAge';
import styles from './page.module.css';

interface Patient {
  id: number;
  nama: string;
  no_ktp: string;
  no_telepon: string;
  jenis_kelamin: string;
  usia: number;
  tanggal_lahir?: string;
  alamat: string;
  dokter_pemeriksa: string | null;
  status: string;
}

interface Dokter {
  id: number;
  nama_dokter: string;
}

export default function PerawatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchingDokter, setFetchingDokter] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [dokterList, setDokterList] = useState<Dokter[]>([]);
  const [filterDokter, setFilterDokter] = useState<string>('');
  
  const [formData, setFormData] = useState({
    tinggi_badan: '',
    berat_badan: '',
    tensi_darah_sistol: '',
    tensi_darah_diastol: '',
    kolesterol: '',
    gds: '',
    as_urat: '',
    keluhan: '',
  });

  const fetchDokter = async () => {
    try {
      setFetchingDokter(true);
      const response = await fetch('/api/dokter?aktif=true');
      const result = await response.json();
      if (result.success) {
        setDokterList(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching dokter:', error);
    } finally {
      setFetchingDokter(false);
    }
  };

  const fetchPatients = async () => {
    try {
      setFetching(true);
      const tanggalPraktik = localStorage.getItem('tanggal_praktik');
      const lokasiId = localStorage.getItem('lokasi_id');
      
      if (!tanggalPraktik) {
        setMessage({ type: 'error', text: 'Tanggal Praktik tidak ditemukan. Silakan login ulang.' });
        return;
      }
      
      // Build URL dengan filter dokter dan lokasi
      let url = `/api/patients?status=pendaftaran&startDate=${tanggalPraktik}&endDate=${tanggalPraktik}`;
      if (lokasiId) {
        url += `&lokasi_id=${lokasiId}`;
      }
      if (filterDokter) {
        url += `&dokter_pemeriksa=${encodeURIComponent(filterDokter)}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setPatients(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setMessage({ type: 'error', text: 'Gagal memuat data pasien' });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'perawat') {
      router.push('/login');
    } else {
      fetchDokter();
      fetchPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    // Refetch patients ketika filter dokter berubah
    const role = localStorage.getItem('user_role');
    if (role === 'perawat') {
      fetchPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDokter]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      tinggi_badan: '',
      berat_badan: '',
      tensi_darah_sistol: '',
      tensi_darah_diastol: '',
      kolesterol: '',
      gds: '',
      as_urat: '',
      keluhan: '',
    });
    setMessage(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('Pilih pasien terlebih dahulu!');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tinggi_badan: parseFloat(formData.tinggi_badan) || null,
          berat_badan: parseFloat(formData.berat_badan) || null,
          tensi_darah_sistol: parseInt(formData.tensi_darah_sistol) || null,
          tensi_darah_diastol: parseInt(formData.tensi_darah_diastol) || null,
          kolesterol: parseFloat(formData.kolesterol) || null,
          gds: parseFloat(formData.gds) || null,
          as_urat: parseFloat(formData.as_urat) || null,
          status: 'perawat',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Data pemeriksaan perawat berhasil disimpan!' });
        setFormData({
          tinggi_badan: '',
          berat_badan: '',
          tensi_darah_sistol: '',
          tensi_darah_diastol: '',
          kolesterol: '',
          gds: '',
          as_urat: '',
          keluhan: '',
        });
        setSelectedPatient(null);
        fetchPatients();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menyimpan data' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan data' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Header />

      {message && (
        <div className={`${styles.alert} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className={styles.sectionTitle}>Daftar Pasien Menunggu Pemeriksaan</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="filterDokter" style={{ fontWeight: 'bold' }}>Filter Dokter Pemeriksa:</label>
            <select
              id="filterDokter"
              value={filterDokter}
              onChange={(e) => setFilterDokter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px',
                minWidth: '200px'
              }}
            >
              <option value="">Semua Dokter</option>
              {fetchingDokter ? (
                <option disabled>Memuat...</option>
              ) : (
                dokterList.map((dokter) => (
                  <option key={dokter.id} value={dokter.nama_dokter}>
                    {dokter.nama_dokter}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
        {fetching ? (
          <p>Memuat data...</p>
        ) : patients.length === 0 ? (
          <p className={styles.empty}>Tidak ada pasien yang menunggu pemeriksaan{filterDokter ? ` untuk dokter ${filterDokter}` : ''}</p>
        ) : (
          <div className={styles.patientList}>
            {patients.map((patient) => (
              <div
                key={patient.id}
                className={`${styles.patientCard} ${selectedPatient?.id === patient.id ? styles.selected : ''}`}
                onClick={() => handleSelectPatient(patient)}
              >
                <div className={styles.patientInfo}>
                  <strong>{patient.nama}</strong>
                  <span>Usia: {formatAge(patient.usia, patient.tanggal_lahir)} | {patient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                  {patient.dokter_pemeriksa && (
                    <span style={{ color: '#666', fontSize: '0.9em' }}>Dokter: {patient.dokter_pemeriksa}</span>
                  )}
                  <span className={styles.address}>{patient.alamat}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPatient && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.selectedPatientInfo}>
            <h3>Pemeriksaan untuk: <strong>{selectedPatient.nama}</strong></h3>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>PEMERIKSAAN VITAL</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="tinggi_badan">TB (cm)</label>
                <input
                  type="number"
                  id="tinggi_badan"
                  name="tinggi_badan"
                  value={formData.tinggi_badan}
                  onChange={handleChange}
                  step="0.1"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="berat_badan">BB (kg)</label>
                <input
                  type="number"
                  id="berat_badan"
                  name="berat_badan"
                  value={formData.berat_badan}
                  onChange={handleChange}
                  step="0.1"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="tensi_darah_sistol">Tensi Darah Sistol (mmHg)</label>
                <input
                  type="number"
                  id="tensi_darah_sistol"
                  name="tensi_darah_sistol"
                  value={formData.tensi_darah_sistol}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="tensi_darah_diastol">Tensi Darah Diastol (mmHg)</label>
                <input
                  type="number"
                  id="tensi_darah_diastol"
                  name="tensi_darah_diastol"
                  value={formData.tensi_darah_diastol}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="kolesterol">Chol (mg/dL)</label>
                <input
                  type="number"
                  id="kolesterol"
                  name="kolesterol"
                  value={formData.kolesterol}
                  onChange={handleChange}
                  step="0.1"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="gds">GDS (mg/dL)</label>
                <input
                  type="number"
                  id="gds"
                  name="gds"
                  value={formData.gds}
                  onChange={handleChange}
                  step="0.1"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="as_urat">As Urat (mg/dL)</label>
                <input
                  type="number"
                  id="as_urat"
                  name="as_urat"
                  value={formData.as_urat}
                  onChange={handleChange}
                  step="0.1"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroupFull}>
                <label htmlFor="keluhan">Keluhan yang Dirasakan Pasien</label>
                <textarea
                  id="keluhan"
                  name="keluhan"
                  value={formData.keluhan}
                  onChange={handleChange}
                  rows={4}
                  className={styles.textarea}
                  placeholder="Masukkan keluhan yang dirasakan pasien"
                />
              </div>
            </div>
          </section>

          <div className={styles.formActions}>
            <button
              type="submit"
              disabled={loading}
              className={styles.btnPrimary}
            >
              {loading ? 'Menyimpan...' : 'Simpan Data Pemeriksaan'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPatient(null);
                setFormData({
                  tinggi_badan: '',
                  berat_badan: '',
                  tensi_darah_sistol: '',
                  tensi_darah_diastol: '',
                  kolesterol: '',
                  gds: '',
                  as_urat: '',
                  keluhan: '',
                });
              }}
              className={styles.btnReset}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      <div className={styles.footer}>
        <p>Copyright © 2025 PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </div>
  );
}

