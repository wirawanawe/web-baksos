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
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [cancellingPatient, setCancellingPatient] = useState<number | null>(null);
  const itemsPerPage = 10;
  
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // fetchPatients uses currentPage and searchTerm which are managed separately
  }, [router]);

  const fetchPatients = async (page: number = currentPage, search: string = searchTerm) => {
    try {
      setFetchingPatients(true);
      const lokasiId = localStorage.getItem('lokasi_id');
      
      // Fetch patients filtered by lokasi_id with pagination and search
      let url = `/api/patients?page=${page}&limit=${itemsPerPage}`;
      if (lokasiId) {
        url += `&lokasi_id=${lokasiId}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        const patientsData = result.data || [];
        setPatients(patientsData);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalPatients(result.pagination.total);
        }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancelPatient = async (patientId: number, patientName: string) => {
    if (!confirm(`Apakah Anda yakin ingin membatalkan pendaftaran pasien "${patientName}"?`)) {
      return;
    }

    setCancellingPatient(patientId);
    setMessage(null);

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'dibatalkan',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: `Pendaftaran pasien "${patientName}" berhasil dibatalkan` });
        fetchPatients(currentPage, searchTerm);
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal membatalkan pendaftaran pasien' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat membatalkan pendaftaran pasien' });
    } finally {
      setCancellingPatient(null);
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0, borderBottom: 'none' }}>DAFTAR PASIEN</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                minWidth: '250px'
              }}
            />
            <button
              type="button"
              onClick={() => fetchPatients(currentPage, searchTerm)}
              disabled={fetchingPatients}
              className={styles.btnRefresh}
            >
              {fetchingPatients ? 'Memuat...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
        
        {fetchingPatients ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>Memuat data pasien...</p>
        ) : patients.length === 0 ? (
          <p className={styles.empty}>Tidak ada pasien terdaftar{searchTerm ? ` dengan kata kunci "${searchTerm}"` : ''}</p>
        ) : (
          <>
            <div className={styles.patientTable}>
              <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>No. Registrasi</th>
                  <th>Nama</th>
                  <th>Jenis Kelamin</th>
                  <th>Usia</th>
                  <th>No. KTP</th>
                  <th>No. Telepon</th>
                  <th>Dokter</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient, index) => (
                  <tr key={patient.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className={styles.cellName}>{patient.no_registrasi || '-'}</td>
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
                      <td>
                        {patient.status === 'pendaftaran' && (
                          <button
                            onClick={() => handleCancelPatient(patient.id, patient.nama)}
                            disabled={cancellingPatient === patient.id}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: cancellingPatient === patient.id ? 'not-allowed' : 'pointer',
                              opacity: cancellingPatient === patient.id ? 0.6 : 1
                            }}
                          >
                            {cancellingPatient === patient.id ? 'Membatalkan...' : 'Batalkan'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalPatients)} dari {totalPatients} pasien
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || fetchingPatients}
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
                    disabled={currentPage === totalPages || fetchingPatients}
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

      <div className={styles.footer}>
        <p>Copyright © 2025 PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </div>
  );
}

