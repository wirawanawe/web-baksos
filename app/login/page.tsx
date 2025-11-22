'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Image from 'next/image';

type UserRole = 'admin' | 'perawat' | 'dokter' | 'farmasi';

interface Dokter {
  id: number;
  nama_dokter: string;
  lokasi_id: number | null;
}

interface Lokasi {
  id: number;
  nama_lokasi: string;
  aktif: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingDokter, setFetchingDokter] = useState(false);
  const [fetchingLokasi, setFetchingLokasi] = useState(false);
  const [dokterList, setDokterList] = useState<Dokter[]>([]);
  const [lokasiList, setLokasiList] = useState<Lokasi[]>([]);
  const [formData, setFormData] = useState({
    role: '' as UserRole | '',
    nama: '',
    dokter_id: '',
    lokasi_id: '',
    tanggal_praktik: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    // Always fetch lokasi list on mount
    fetchLokasi();
  }, []);

  useEffect(() => {
    // Fetch dokter list when role is 'dokter' and lokasi_id is selected
    if (formData.role === 'dokter' && formData.lokasi_id) {
      fetchDokter();
    } else {
      setDokterList([]);
      setFormData(prev => ({ ...prev, dokter_id: '' }));
    }
  }, [formData.role, formData.lokasi_id]);

  const fetchDokter = async () => {
    if (!formData.lokasi_id) {
      setDokterList([]);
      return;
    }
    
    try {
      setFetchingDokter(true);
      const response = await fetch('/api/dokter?aktif=true');
      const result = await response.json();
      if (result.success) {
        // Filter dokter berdasarkan lokasi_id yang dipilih
        // Dokter tanpa lokasi (lokasi_id = null) akan muncul di semua lokasi
        const filteredDokter = (result.data || []).filter((dokter: Dokter) => 
          !dokter.lokasi_id || dokter.lokasi_id.toString() === formData.lokasi_id
        );
        setDokterList(filteredDokter);
      }
    } catch (error) {
      console.error('Error fetching dokter:', error);
    } finally {
      setFetchingDokter(false);
    }
  };

  const fetchLokasi = async () => {
    try {
      setFetchingLokasi(true);
      const response = await fetch('/api/lokasi?aktif=true');
      const result = await response.json();
      if (result.success) {
        setLokasiList(result.data || []);
      } else if (result.message && result.message.includes('does not exist')) {
        // Auto-create table if it doesn't exist
        try {
          const setupResponse = await fetch('/api/lokasi/setup', {
            method: 'POST',
          });
          const setupResult = await setupResponse.json();
          if (setupResult.success) {
            // Retry fetch
            const retryResponse = await fetch('/api/lokasi?aktif=true');
            const retryResult = await retryResponse.json();
            if (retryResult.success && retryResult.data) {
              setLokasiList(retryResult.data || []);
            }
          }
        } catch (setupError) {
          console.error('Error setting up lokasi table:', setupError);
        }
      }
    } catch (error: any) {
      if (error.message && error.message.includes('does not exist')) {
        // Auto-create table if it doesn't exist
        try {
          const setupResponse = await fetch('/api/lokasi/setup', {
            method: 'POST',
          });
          const setupResult = await setupResponse.json();
          if (setupResult.success) {
            // Retry fetch
            const retryResponse = await fetch('/api/lokasi?aktif=true');
            const retryResult = await retryResponse.json();
            if (retryResult.success && retryResult.data) {
              setLokasiList(retryResult.data || []);
            }
          }
        } catch (setupError) {
          console.error('Error setting up lokasi table:', setupError);
        }
      } else {
        console.error('Error fetching lokasi:', error);
      }
    } finally {
      setFetchingLokasi(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'lokasi_id') {
      // Reset role dan dokter_id ketika lokasi berubah
      setFormData(prev => ({ ...prev, lokasi_id: value, role: '' as UserRole, nama: '', dokter_id: '' }));
      setDokterList([]);
    } else if (name === 'role') {
      setFormData(prev => ({ ...prev, role: value as UserRole, nama: '', dokter_id: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi: Lokasi harus dipilih dulu
    if (!formData.lokasi_id) {
      alert('Pilih Lokasi Baksos terlebih dahulu!');
      return;
    }

    // Validasi: Role harus dipilih
    if (!formData.role) {
      alert('Pilih role terlebih dahulu!');
      return;
    }

    // Simpan lokasi ke localStorage untuk semua role
    localStorage.setItem('lokasi_id', formData.lokasi_id);
    const selectedLokasi = lokasiList.find(l => l.id.toString() === formData.lokasi_id);
    if (selectedLokasi) {
      localStorage.setItem('lokasi_nama', selectedLokasi.nama_lokasi);
    }

    if (formData.role === 'dokter') {
      if (!formData.dokter_id) {
        alert('Pilih dokter terlebih dahulu!');
        return;
      }
      // Get dokter name and lokasi_id from list
      const selectedDokter = dokterList.find(d => d.id.toString() === formData.dokter_id);
      if (selectedDokter) {
        localStorage.setItem('user_name', selectedDokter.nama_dokter);
        localStorage.setItem('dokter_id', formData.dokter_id);
        if (selectedDokter.lokasi_id) {
          localStorage.setItem('dokter_lokasi_id', selectedDokter.lokasi_id.toString());
        } else {
          localStorage.removeItem('dokter_lokasi_id');
        }
      }
    } else {
      if (!formData.nama.trim()) {
        alert('Nama harus diisi!');
        return;
      }
      localStorage.setItem('user_name', formData.nama);
    }

    if (!formData.tanggal_praktik) {
      alert('Tanggal Praktik harus diisi!');
      return;
    }

    // Simpan ke localStorage
    localStorage.setItem('user_role', formData.role);
    localStorage.setItem('tanggal_praktik', formData.tanggal_praktik);

    // Redirect berdasarkan role
    const roleRoutes: Record<UserRole, string> = {
      admin: '/admin',
      perawat: '/perawat',
      dokter: '/dokter',
      farmasi: '/farmasi',
    };

    router.push(roleRoutes[formData.role]);
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logoSection}>
            <Image src="/images/logo-ybm.png" alt="Logo YBM PLN" width={150} height={100} className={styles.logo} />
            
          </div>
          <div className={styles.header}>
            <h1 className={styles.title}>APLIKASI PEMERIKSAAN KESEHATAN DAN PENGOBATAN GRATIS</h1>
            <p className={styles.subtitle}>Aplikasi ini digunakan untuk mempermudah pemeriksaan kesehatan dan pengobatan gratis</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="lokasi_id">
                Lokasi Baksos <span className={styles.required}>*</span>
              </label>
              {fetchingLokasi ? (
                <p>Memuat daftar lokasi...</p>
              ) : lokasiList.length === 0 ? (
                <div>
                  <select
                    id="lokasi_id"
                    name="lokasi_id"
                    value={formData.lokasi_id}
                    onChange={handleChange}
                    className={styles.input}
                    disabled
                    required
                    autoFocus
                  >
                    <option value="">Belum ada lokasi terdaftar</option>
                  </select>
                  <p className={styles.infoText}>
                    Silakan tambahkan data lokasi di halaman Admin {'>'} Data Lokasi terlebih dahulu.
                  </p>
                </div>
              ) : (
                <select
                  id="lokasi_id"
                  name="lokasi_id"
                  value={formData.lokasi_id}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  autoFocus
                >
                  <option value="">Pilih Lokasi Baksos</option>
                  {lokasiList.map((lokasi) => (
                    <option key={lokasi.id} value={lokasi.id}>
                      {lokasi.nama_lokasi}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {formData.lokasi_id && (
              <div className={styles.formGroup}>
                <label htmlFor="role">
                  Pilih Role <span className={styles.required}>*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  disabled={!formData.lokasi_id}
                >
                  <option value="">Pilih Role</option>
                  <option value="admin">Admin Pendaftaran</option>
                  <option value="perawat">Perawat</option>
                  <option value="dokter">Dokter</option>
                  <option value="farmasi">Farmasi</option>
                </select>
              </div>
            )}

            {formData.role === 'dokter' && formData.lokasi_id ? (
              <div className={styles.formGroup}>
                <label htmlFor="dokter_id">
                  Dokter Pemeriksa <span className={styles.required}>*</span>
                </label>
                {fetchingDokter ? (
                  <p>Memuat daftar dokter...</p>
                ) : dokterList.length === 0 ? (
                  <div>
                    <select
                      id="dokter_id"
                      name="dokter_id"
                      value={formData.dokter_id}
                      onChange={handleChange}
                      className={styles.input}
                      disabled
                      required
                    >
                      <option value="">Belum ada dokter di lokasi ini</option>
                    </select>
                    <p className={styles.infoText}>
                      Tidak ada dokter yang terdaftar di lokasi ini. Silakan login sebagai Admin untuk menambahkan dokter di lokasi ini.
                    </p>
                  </div>
                ) : (
                  <select
                    id="dokter_id"
                    name="dokter_id"
                    value={formData.dokter_id}
                    onChange={handleChange}
                    required
                    className={styles.input}
                  >
                    <option value="">Pilih Dokter Pemeriksa</option>
                    {dokterList.map((dokter) => (
                      <option key={dokter.id} value={dokter.id}>
                        {dokter.nama_dokter}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : formData.role && formData.role !== 'dokter' && (
              <div className={styles.formGroup}>
                <label htmlFor="nama">
                  Nama <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="nama"
                  name="nama"
                  value={formData.nama}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  placeholder="Masukkan nama"
                />
              </div>
            )}

            {formData.lokasi_id && formData.role && (
              <div className={styles.formGroup}>
                <label htmlFor="tanggal_praktik">
                  Tanggal Praktik <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  id="tanggal_praktik"
                  name="tanggal_praktik"
                  value={formData.tanggal_praktik}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>
            )}

            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={loading || !formData.lokasi_id || !formData.role || (formData.role === 'dokter' && !formData.dokter_id)}
                className={styles.btnPrimary}
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className={styles.footer}>
        <p>Copyright © 2025 PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </>
  );
}
