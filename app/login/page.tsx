'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Image from 'next/image';

type UserRole = 'admin' | 'perawat' | 'dokter' | 'farmasi';

interface Dokter {
  id: number;
  nama_dokter: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingDokter, setFetchingDokter] = useState(false);
  const [dokterList, setDokterList] = useState<Dokter[]>([]);
  const [formData, setFormData] = useState({
    role: '' as UserRole | '',
    nama: '',
    dokter_id: '',
    tanggal_praktik: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    // Fetch dokter list when role is 'dokter'
    if (formData.role === 'dokter') {
      fetchDokter();
    }
  }, [formData.role]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'role') {
      setFormData(prev => ({ ...prev, role: value as UserRole, nama: '', dokter_id: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.role) {
      alert('Pilih role terlebih dahulu!');
      return;
    }

    if (formData.role === 'dokter') {
      if (!formData.dokter_id) {
        alert('Pilih dokter terlebih dahulu!');
        return;
      }
      // Get dokter name from list
      const selectedDokter = dokterList.find(d => d.id.toString() === formData.dokter_id);
      if (selectedDokter) {
        localStorage.setItem('user_name', selectedDokter.nama_dokter);
        localStorage.setItem('dokter_id', formData.dokter_id);
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
                autoFocus
              >
                <option value="">Pilih Role</option>
                <option value="admin">Admin Pendaftaran</option>
                <option value="perawat">Perawat</option>
                <option value="dokter">Dokter</option>
                <option value="farmasi">Farmasi</option>
              </select>
            </div>

            {formData.role === 'dokter' ? (
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
                    >
                      <option value="">Belum ada dokter terdaftar</option>
                    </select>
                    <p className={styles.infoText}>
                      Silakan login sebagai Admin untuk menambahkan data dokter terlebih dahulu.
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
            ) : (
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

            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={loading}
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

