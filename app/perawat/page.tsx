'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { formatAge } from '@/lib/formatAge';
import styles from './page.module.css';

interface Patient {
  id: number;
  no_registrasi?: string | null;
  nama: string;
  no_ktp: string;
  no_telepon: string;
  jenis_kelamin: string;
  usia: number;
  tanggal_lahir?: string;
  alamat: string;
  dokter_pemeriksa: string | null;
  status: string;
  locked_by?: string | null;
  locked_at?: string | null;
}

export default function PerawatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const itemsPerPage = 10;
  
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

  const fetchPatients = async (page: number = currentPage, search: string = searchTerm) => {
    try {
      setFetching(true);
      const tanggalPraktik = localStorage.getItem('tanggal_praktik');
      const lokasiId = localStorage.getItem('lokasi_id');
      
      if (!tanggalPraktik) {
        setMessage({ type: 'error', text: 'Tanggal Praktik tidak ditemukan. Silakan login ulang.' });
        return;
      }
      
      // Build URL dengan filter dokter, lokasi, pagination, dan search
      let url = `/api/patients?status=pendaftaran&startDate=${tanggalPraktik}&endDate=${tanggalPraktik}&page=${page}&limit=${itemsPerPage}`;
      if (lokasiId) {
        url += `&lokasi_id=${lokasiId}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setPatients(result.data || []);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalPatients(result.pagination.total);
        }
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setMessage({ type: 'error', text: 'Gagal memuat data pasien' });
    } finally {
      setFetching(false);
    }
  };
  
  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchPatients(1, searchTerm);
      } else {
        setCurrentPage(1);
      }
    }, 500);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);
  
  useEffect(() => {
    fetchPatients(currentPage, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'perawat') {
      router.push('/login');
    } else {
      fetchPatients();
      
      // Auto-refresh every 30 seconds
      const refreshInterval = setInterval(() => {
        // Only refresh if no patient is selected
        if (!selectedPatient) {
          fetchPatients(currentPage, searchTerm);
        }
      }, 30000); // 30 seconds
      
      return () => clearInterval(refreshInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, selectedPatient, currentPage, searchTerm]);

  const handleSelectPatient = (patient: Patient) => {
    // No lock mechanism for perawat - can select any patient
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
        fetchPatients(currentPage, searchTerm);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 className={styles.sectionTitle}>Daftar Pasien Menunggu Pemeriksaan</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Cari pasien (nama, KTP, telepon)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '14px',
                minWidth: '200px'
              }}
            />
          </div>
        </div>
        {fetching ? (
          <p>Memuat data...</p>
        ) : patients.length === 0 ? (
          <p className={styles.empty}>Tidak ada pasien yang menunggu pemeriksaan{searchTerm ? ` dengan kata kunci "${searchTerm}"` : ''}</p>
        ) : (
          <>
          <div className={styles.patientList}>
            {patients.map((patient) => (
              <div
                key={patient.id}
                className={`${styles.patientCard} ${selectedPatient?.id === patient.id ? styles.selected : ''}`}
                onClick={() => handleSelectPatient(patient)}
              >
                <div className={styles.patientInfo}>
                    {patient.no_registrasi && (
                      <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.9em', marginBottom: '4px', display: 'block' }}>
                        No. Registrasi: {patient.no_registrasi}
                      </span>
                    )}
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
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalPatients)} dari {totalPatients} pasien
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || fetching}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Sebelumnya
                  </button>
                  <span style={{ padding: '6px 12px', fontSize: '14px' }}>
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || fetching}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </>
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

