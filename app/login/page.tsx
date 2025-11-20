'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dokter_pemeriksa: '',
    tanggal_pemeriksaan: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dokter_pemeriksa.trim()) {
      alert('Nama Dokter harus diisi!');
      return;
    }

    if (!formData.tanggal_pemeriksaan) {
      alert('Tanggal Pemeriksaan harus diisi!');
      return;
    }

    // Simpan ke localStorage
    localStorage.setItem('dokter_pemeriksa', formData.dokter_pemeriksa);
    localStorage.setItem('tanggal_pemeriksaan', formData.tanggal_pemeriksaan);

    // Redirect ke halaman utama
    router.push('/');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoSection}>
          <Image src="/images/logo-ybm.png" alt="Logo YBM PLN" width={120} height={120} className={styles.logo} />
          
        </div>
        <div className={styles.header}>
          <h1 className={styles.title}>APLIKASI PEMERIKSAAN KESEHATAN DAN PENGOBATAN GRATIS</h1>
          <p className={styles.subtitle}>Aplikasi ini digunakan untuk mempermudah pemeriksaan kesehatan dan pengobatan gratis</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="dokter_pemeriksa">
              Nama Dokter <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="dokter_pemeriksa"
              name="dokter_pemeriksa"
              value={formData.dokter_pemeriksa}
              onChange={handleChange}
              required
              className={styles.input}
              placeholder="Masukkan nama dokter"
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="tanggal_pemeriksaan">
              Tanggal Pemeriksaan <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              id="tanggal_pemeriksaan"
              name="tanggal_pemeriksaan"
              value={formData.tanggal_pemeriksaan}
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
              {loading ? 'Memproses...' : 'Mulai Input Data Pasien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

