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
  const [fetchingDokter, setFetchingDokter] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dokterList, setDokterList] = useState<{ id: number; nama_dokter: string }[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editingDokter, setEditingDokter] = useState<{ patientId: number; currentDokter: string | null } | null>(null);
  const [newDokter, setNewDokter] = useState('');
  const [updatingDokter, setUpdatingDokter] = useState(false);
  
  const [formData, setFormData] = useState({
    nama: '',
    no_ktp: '',
    no_telepon: '',
    jenis_kelamin: '',
    tanggal_lahir: '',
    alamat: '',
    dokter_pemeriksa: '',
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
      fetchDokter();
      fetchPatients();
    }
  }, [router]);

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
      setFetchingPatients(true);
      const tanggalPraktik = localStorage.getItem('tanggal_praktik');
      if (!tanggalPraktik) {
        return;
      }
      
      const response = await fetch(`/api/patients?startDate=${tanggalPraktik}&endDate=${tanggalPraktik}`);
      const result = await response.json();
      if (result.success) {
        setPatients(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
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

    try {
      const tanggalPraktik = localStorage.getItem('tanggal_praktik');
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tanggal_pemeriksaan: tanggalPraktik || null,
          status: 'pendaftaran',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Data pasien berhasil didaftarkan!' });
        // Reset form (keep dokter_pemeriksa empty so admin can select for next patient)
        setFormData({
          nama: '',
          no_ktp: '',
          no_telepon: '',
          jenis_kelamin: '',
          tanggal_lahir: '',
          alamat: '',
          dokter_pemeriksa: '',
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

  const handleEditDokter = (patient: Patient) => {
    if (patient.status === 'pendaftaran' || patient.status === 'perawat') {
      setEditingDokter({ patientId: patient.id, currentDokter: patient.dokter_pemeriksa });
      setNewDokter(patient.dokter_pemeriksa || '');
    }
  };

  const handleCancelEditDokter = () => {
    setEditingDokter(null);
    setNewDokter('');
  };

  const handleUpdateDokter = async () => {
    if (!editingDokter) return;

    setUpdatingDokter(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/patients/${editingDokter.patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dokter_pemeriksa: newDokter || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Dokter pemeriksa berhasil diubah!' });
        setEditingDokter(null);
        setNewDokter('');
        fetchPatients();
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal mengubah dokter pemeriksa' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengubah dokter pemeriksa' });
    } finally {
      setUpdatingDokter(false);
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
              <label htmlFor="dokter_pemeriksa">Dokter Praktek <span className={styles.required}>*</span></label>
              {fetchingDokter ? (
                <p>Memuat daftar dokter...</p>
              ) : dokterList.length === 0 ? (
                <div>
                  <select
                    id="dokter_pemeriksa"
                    name="dokter_pemeriksa"
                    value={formData.dokter_pemeriksa}
                    onChange={handleChange}
                    className={styles.input}
                    disabled
                  >
                    <option value="">Belum ada dokter terdaftar</option>
                  </select>
                  <p className={styles.infoText}>
                    Silakan tambahkan data dokter di halaman Admin {'>'} Data Dokter terlebih dahulu.
                  </p>
                </div>
              ) : (
                <select
                  id="dokter_pemeriksa"
                  name="dokter_pemeriksa"
                  value={formData.dokter_pemeriksa}
                onChange={handleChange}
                required
                className={styles.input}
                >
                  <option value="">Pilih Dokter Praktek</option>
                  {dokterList.map((dokter) => (
                    <option key={dokter.id} value={dokter.nama_dokter}>
                      {dokter.nama_dokter}
                    </option>
                  ))}
                </select>
              )}
            </div>

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
                dokter_pemeriksa: '',
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
                  <th>Aksi</th>
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
                    <td>
                      {(patient.status === 'pendaftaran' || patient.status === 'perawat') && (
                        <button
                          type="button"
                          onClick={() => handleEditDokter(patient)}
                          className={styles.btnEditDokter}
                          title="Ubah Dokter Pemeriksa"
                        >
                          ✏️ Ubah Dokter
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Edit Dokter */}
      {editingDokter && (
        <div className={styles.modalOverlay} onClick={handleCancelEditDokter}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Ubah Dokter Pemeriksa</h3>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="newDokter">Dokter Pemeriksa</label>
                {dokterList.length === 0 ? (
                  <p className={styles.infoText}>
                    Belum ada data dokter. Silakan tambahkan di halaman Admin {'>'} Data Dokter.
                  </p>
                ) : (
                  <select
                    id="newDokter"
                    value={newDokter}
                    onChange={(e) => setNewDokter(e.target.value)}
                    className={styles.input}
                  >
                    <option value="">Pilih Dokter</option>
                    {dokterList.map((dokter) => (
                      <option key={dokter.id} value={dokter.nama_dokter}>
                        {dokter.nama_dokter}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={handleCancelEditDokter}
                className={styles.btnCancel}
                disabled={updatingDokter}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpdateDokter}
                className={styles.btnSave}
                disabled={updatingDokter || dokterList.length === 0}
              >
                {updatingDokter ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <p>Copyright © 2025 PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </div>
  );
}

