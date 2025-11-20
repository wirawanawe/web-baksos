'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    tanggal_pemeriksaan: '',
    nama: '',
    jenis_kelamin: '',
    usia: '',
    alamat: '',
    tinggi_badan: '',
    berat_badan: '',
    tensi_darah_sistol: '',
    tensi_darah_diastol: '',
    kolesterol: '',
    gds: '',
    as_urat: '',
    anamnesa: '',
    pemeriksaan_fisik: '',
    hpht: '',
    hpl: '',
    tfu: '',
    djj_anak: '',
    diagnosa: '',
    terapi: '',
    dokter_pemeriksa: '',
  });

  useEffect(() => {
    // Cek apakah sudah ada data dokter dan tanggal di localStorage
    const dokter = localStorage.getItem('dokter_pemeriksa');
    const tanggal = localStorage.getItem('tanggal_pemeriksaan');

    if (!dokter || !tanggal) {
      // Jika belum ada, redirect ke halaman login
      router.push('/login');
      return;
    }

    // Isi form dengan data dari localStorage
    setFormData(prev => ({
      ...prev,
      dokter_pemeriksa: dokter,
      tanggal_pemeriksaan: tanggal,
    }));
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          usia: parseInt(formData.usia) || null,
          tinggi_badan: parseFloat(formData.tinggi_badan) || null,
          berat_badan: parseFloat(formData.berat_badan) || null,
          tensi_darah_sistol: parseInt(formData.tensi_darah_sistol) || null,
          tensi_darah_diastol: parseInt(formData.tensi_darah_diastol) || null,
          kolesterol: parseFloat(formData.kolesterol) || null,
          gds: parseFloat(formData.gds) || null,
          as_urat: parseFloat(formData.as_urat) || null,
          tfu: parseFloat(formData.tfu) || null,
          djj_anak: parseInt(formData.djj_anak) || null,
          tanggal_pemeriksaan: formData.tanggal_pemeriksaan || null,
          hpht: formData.hpht || null,
          hpl: formData.hpl || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Data pasien berhasil disimpan!' });
        // Reset form (kecuali dokter dan tanggal pemeriksaan)
        const dokter = localStorage.getItem('dokter_pemeriksa') || '';
        const tanggal = localStorage.getItem('tanggal_pemeriksaan') || new Date().toISOString().split('T')[0];
        setFormData({
          tanggal_pemeriksaan: tanggal,
          nama: '',
          jenis_kelamin: '',
          usia: '',
          alamat: '',
          tinggi_badan: '',
          berat_badan: '',
          tensi_darah_sistol: '',
          tensi_darah_diastol: '',
          kolesterol: '',
          gds: '',
          as_urat: '',
          anamnesa: '',
          pemeriksaan_fisik: '',
          hpht: '',
          hpl: '',
          tfu: '',
          djj_anak: '',
          diagnosa: '',
          terapi: '',
          dokter_pemeriksa: dokter,
        });
        // Scroll to top
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

  return (
    <div className={styles.container}>
      <Header />

      {message && (
        <div className={`${styles.alert} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* IDENTITAS */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>IDENTITAS</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="nama">NAMA <span className={styles.required}>*</span></label>
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
              <label htmlFor="jenis_kelamin">JENIS KELAMIN <span className={styles.required}>*</span></label>
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
              <label htmlFor="usia">USIA <span className={styles.required}>*</span></label>
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
              <label htmlFor="alamat">ALAMAT <span className={styles.required}>*</span></label>
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

        {/* PEMERIKSAAN */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>PEMERIKSAAN</h2>
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
                placeholder="Sistol (mmHg)"
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
                placeholder="Diastol (mmHg)"
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
                placeholder="mg/dL"
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
                placeholder="mg/dL"
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
                placeholder="mg/dL"
              />
            </div>

            <div className={styles.formGroupFull}>
              <label htmlFor="anamnesa">Anamnesa</label>
              <textarea
                id="anamnesa"
                name="anamnesa"
                value={formData.anamnesa}
                onChange={handleChange}
                rows={4}
                className={styles.textarea}
              />
            </div>
          </div>
        </section>

        {/* PEMERIKSAAN FISIK */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Pemeriksaan Fisik</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroupFull}>
              <label htmlFor="pemeriksaan_fisik">Pemeriksaan Fisik</label>
              <textarea
                id="pemeriksaan_fisik"
                name="pemeriksaan_fisik"
                value={formData.pemeriksaan_fisik}
                onChange={handleChange}
                rows={4}
                className={styles.textarea}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="hpht">HPHT</label>
              <input
                type="date"
                id="hpht"
                name="hpht"
                value={formData.hpht}
                onChange={handleChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="hpl">HPL</label>
              <input
                type="date"
                id="hpl"
                name="hpl"
                value={formData.hpl}
                onChange={handleChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tfu">TFU (cm)</label>
              <input
                type="number"
                id="tfu"
                name="tfu"
                value={formData.tfu}
                onChange={handleChange}
                step="0.1"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="djj_anak">DJJ Anak (detak/menit)</label>
              <input
                type="number"
                id="djj_anak"
                name="djj_anak"
                value={formData.djj_anak}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
          </div>
        </section>

        {/* DIAGNOSA */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Diagnosa</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroupFull}>
              <label htmlFor="diagnosa">Diagnosa</label>
              <textarea
                id="diagnosa"
                name="diagnosa"
                value={formData.diagnosa}
                onChange={handleChange}
                rows={4}
                className={styles.textarea}
              />
            </div>
          </div>
        </section>

        {/* TERAPI */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Terapi</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroupFull}>
              <label htmlFor="terapi">Terapi</label>
              <textarea
                id="terapi"
                name="terapi"
                value={formData.terapi}
                onChange={handleChange}
                rows={4}
                className={styles.textarea}
              />
            </div>
          </div>
        </section>

        {/* DOKTER PEMERIKSA */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dokter Pemeriksa</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroupFull}>
              <label htmlFor="dokter_pemeriksa">Dokter Pemeriksa</label>
              <input
                type="text"
                id="dokter_pemeriksa"
                name="dokter_pemeriksa"
                value={formData.dokter_pemeriksa}
                onChange={handleChange}
                className={styles.input}
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
            {loading ? 'Menyimpan...' : 'Simpan Data'}
          </button>
          <button
            type="button"
            onClick={() => {
              const dokter = localStorage.getItem('dokter_pemeriksa') || '';
              const tanggal = localStorage.getItem('tanggal_pemeriksaan') || new Date().toISOString().split('T')[0];
              setFormData({
                tanggal_pemeriksaan: tanggal,
                nama: '',
                jenis_kelamin: '',
                usia: '',
                alamat: '',
                tinggi_badan: '',
                berat_badan: '',
                tensi_darah_sistol: '',
                tensi_darah_diastol: '',
                kolesterol: '',
                gds: '',
                as_urat: '',
                anamnesa: '',
                pemeriksaan_fisik: '',
                hpht: '',
                hpl: '',
                tfu: '',
                djj_anak: '',
                diagnosa: '',
                terapi: '',
                dokter_pemeriksa: dokter,
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

