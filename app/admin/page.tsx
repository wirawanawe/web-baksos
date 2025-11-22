'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { formatAge } from '@/lib/formatAge';
import styles from './page.module.css';

interface Patient {
  id: number;
  nama: string;
  no_ktp: string | null;
  no_telepon: string | null;
  jenis_kelamin: string;
  usia: number;
  tanggal_lahir?: string;
  alamat: string;
  dokter_pemeriksa: string | null;
  status: string;
  tanggal_pemeriksaan: string | null;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  
  const [formData, setFormData] = useState({
    nama: '',
    no_ktp: '',
    no_telepon: '',
    jenis_kelamin: '',
    tanggal_lahir: '',
    alamat: '',
  });

  // Fungsi untuk menghitung usia dari tanggal lahir
  const calculateAge = (tanggalLahir: string): number | null => {
    if (!tanggalLahir) return null;
    const today = new Date();
    const birthDate = new Date(tanggalLahir);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const usia = calculateAge(formData.tanggal_lahir);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const tanggalPraktik = localStorage.getItem('tanggal_praktik');

    if (role !== 'admin') {
      router.push('/login');
    } else {
      if (!tanggalPraktik) {
        router.push('/login');
        return;
      }
      fetchPatients();
    }
  }, [router]);

  const fetchPatients = async () => {
    try {
      setFetchingPatients(true);
      const lokasiId = localStorage.getItem('lokasi_id');
      
      // Fetch patients filtered by lokasi_id
      let url = '/api/patients';
      if (lokasiId) {
        url += `?lokasi_id=${lokasiId}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        const patientsData = result.data || [];
        // If tanggalPraktik exists, optionally filter by date on client side
        // But for admin, we show all patients
        setPatients(patientsData);
      } else {
        console.error('Failed to fetch patients:', result.message);
        setMessage({ type: 'error', text: result.message || 'Gagal memuat data pasien' });
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setMessage({ type: 'error', text: 'Gagal memuat data pasien' });
    } finally {
      setFetchingPatients(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSetupDatabase = async () => {
    setSetupLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Database setup berhasil!' });
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal setup database' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat setup database' });
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validasi: No. KTP dan No. Telepon tidak boleh sama
    if (formData.no_ktp && formData.no_telepon && formData.no_ktp === formData.no_telepon) {
      setMessage({ type: 'error', text: 'No. KTP dan No. Telepon tidak boleh sama' });
      setLoading(false);
      return;
    }

    // Ambil lokasi_id dari localStorage (dipilih saat login)
    const lokasiId = localStorage.getItem('lokasi_id');
    if (!lokasiId) {
      setMessage({ type: 'error', text: 'Lokasi Baksos belum dipilih. Silakan login ulang dan pilih lokasi.' });
      setLoading(false);
      return;
    }

    try {
      const tanggalPraktik = localStorage.getItem('tanggal_praktik');
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          lokasi_id: lokasiId, // Ambil dari localStorage (dipilih saat login)
          tanggal_pemeriksaan: tanggalPraktik || null,
          status: 'pendaftaran',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Data pasien berhasil didaftarkan!' });
        // Reset form
        setFormData({
          nama: '',
          no_ktp: '',
          no_telepon: '',
          jenis_kelamin: '',
          tanggal_lahir: '',
          alamat: '',
        });
        // Refresh daftar pasien
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

      <form onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>PENDAFTARAN PASIEN</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="nama">Nama <span className={styles.required}>*</span></label>
              <input
                type="text"
                id="nama"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="no_ktp">No. KTP</label>
              <input
                type="text"
                id="no_ktp"
                name="no_ktp"
                value={formData.no_ktp}
                onChange={handleChange}
                className={styles.input}
                placeholder="Masukkan No. KTP"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="no_telepon">No. Telepon</label>
              <input
                type="text"
                id="no_telepon"
                name="no_telepon"
                value={formData.no_telepon}
                onChange={handleChange}
                className={styles.input}
                placeholder="Masukkan No. Telepon"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="jenis_kelamin">Jenis Kelamin <span className={styles.required}>*</span></label>
              <select
                id="jenis_kelamin"
                name="jenis_kelamin"
                value={formData.jenis_kelamin}
                onChange={handleChange}
                required
                className={styles.input}
              >
                <option value="">Pilih</option>
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tanggal_lahir">Tanggal Lahir <span className={styles.required}>*</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="date"
                  id="tanggal_lahir"
                  name="tanggal_lahir"
                  value={formData.tanggal_lahir}
                  onChange={handleChange}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className={styles.input}
                  style={{ flex: 1 }}
                />
                {usia !== null && (
                  <span style={{ 
                    fontSize: '14px', 
                    color: '#666', 
                    fontWeight: '500',
                    whiteSpace: 'nowrap'
                  }}>
                    Usia: {formatAge(usia, formData.tanggal_lahir)}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.formGroupFull}>
              <label htmlFor="alamat">Alamat <span className={styles.required}>*</span></label>
              <textarea
                id="alamat"
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                required
                rows={3}
                className={styles.textarea}
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
            {loading ? 'Menyimpan...' : 'Simpan Data Pendaftaran'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                nama: '',
                no_ktp: '',
                no_telepon: '',
                jenis_kelamin: '',
                tanggal_lahir: '',
                alamat: '',
              });
              setMessage(null);
            }}
            className={styles.btnReset}
          >
            Reset Form
          </button>
        </div>
      </form>

      {/* Daftar Pasien */}
      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0, borderBottom: 'none' }}>DAFTAR PASIEN</h2>
          <button
            type="button"
            onClick={fetchPatients}
            disabled={fetchingPatients}
            className={styles.btnRefresh}
          >
            {fetchingPatients ? 'Memuat...' : '🔄 Refresh'}
          </button>
        </div>
        
        {fetchingPatients ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>Memuat data pasien...</p>
        ) : patients.length === 0 ? (
          <p className={styles.empty}>Tidak ada pasien terdaftar</p>
        ) : (
          <div className={styles.patientTable}>
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>Jenis Kelamin</th>
                  <th>Usia</th>
                  <th>No. KTP</th>
                  <th>No. Telepon</th>
                  <th>Dokter</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient, index) => (
                  <tr key={patient.id}>
                    <td>{index + 1}</td>
                    <td className={styles.cellName}>{patient.nama}</td>
                    <td>{patient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                    <td>{formatAge(patient.usia, patient.tanggal_lahir)}</td>
                    <td>{patient.no_ktp || '-'}</td>
                    <td>{patient.no_telepon || '-'}</td>
                    <td>{patient.dokter_pemeriksa || '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status${patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}`]}`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className={styles.cellDate}>
                      {patient.tanggal_pemeriksaan 
                        ? new Date(patient.tanggal_pemeriksaan).toLocaleDateString('id-ID')
                        : new Date(patient.created_at).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <p>Copyright © 2025 PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </div>
  );
}

