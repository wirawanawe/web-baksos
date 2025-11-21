'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import styles from './page.module.css';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [fetchingDokter, setFetchingDokter] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dokterList, setDokterList] = useState<{ id: number; nama_dokter: string }[]>([]);
  
  const [formData, setFormData] = useState({
    nama: '',
    no_ktp: '',
    no_telepon: '',
    jenis_kelamin: '',
    usia: '',
    alamat: '',
    dokter_pemeriksa: '',
  });

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
          usia: parseInt(formData.usia) || null,
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
          usia: '',
          alamat: '',
          dokter_pemeriksa: '',
        });
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
              <label htmlFor="usia">Usia <span className={styles.required}>*</span></label>
              <input
                type="number"
                id="usia"
                name="usia"
                value={formData.usia}
                onChange={handleChange}
                required
                min="0"
                className={styles.input}
              />
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
                usia: '',
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

      <div className={styles.footer}>
        <p>Copyright © 2025 PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </div>
  );
}

