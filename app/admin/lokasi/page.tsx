'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import styles from './page.module.css';

interface Lokasi {
  id: number;
  nama_lokasi: string;
  alamat: string | null;
  keterangan: string | null;
  aktif: string;
}

export default function LokasiPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lokasiList, setLokasiList] = useState<Lokasi[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLokasi, setEditingLokasi] = useState<Lokasi | null>(null);
  
  const [formData, setFormData] = useState({
    nama_lokasi: '',
    alamat: '',
    keterangan: '',
    aktif: 'Y',
  });

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'admin') {
      router.push('/login');
    } else {
      fetchLokasi();
    }
  }, [router]);

  const fetchLokasi = async () => {
    try {
      setFetching(true);
      const response = await fetch('/api/lokasi');
      const result = await response.json();
      
      if (result.success) {
        setLokasiList(result.data || []);
      } else {
        // Check if error is because table doesn't exist
        if (result.error && result.error.includes("doesn't exist")) {
          // Try to create table
          const setupResponse = await fetch('/api/lokasi/setup', {
            method: 'POST',
          });
          const setupResult = await setupResponse.json();
          
          if (setupResult.success) {
            setMessage({ type: 'success', text: 'Tabel lokasi berhasil dibuat! Memuat ulang data...' });
            // Retry fetching
            const retryResponse = await fetch('/api/lokasi');
            const retryResult = await retryResponse.json();
            if (retryResult.success) {
              setLokasiList(retryResult.data || []);
            }
          } else {
            setMessage({ type: 'error', text: 'Tabel lokasi belum dibuat. Silakan jalankan Setup Database di halaman Admin.' });
          }
        } else {
          setMessage({ type: 'error', text: result.message || 'Gagal mengambil data lokasi' });
        }
      }
    } catch (error) {
      console.error('Error fetching lokasi:', error);
      setMessage({ type: 'error', text: 'Gagal memuat data lokasi. Pastikan tabel lokasi sudah dibuat.' });
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const url = editingLokasi ? `/api/lokasi/${editingLokasi.id}` : '/api/lokasi';
      const method = editingLokasi ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama_lokasi: formData.nama_lokasi,
          alamat: formData.alamat || null,
          keterangan: formData.keterangan || null,
          aktif: formData.aktif,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: editingLokasi ? 'Data lokasi berhasil diupdate!' : 'Data lokasi berhasil ditambahkan!' 
        });
        setFormData({
          nama_lokasi: '',
          alamat: '',
          keterangan: '',
          aktif: 'Y',
        });
        setShowForm(false);
        setEditingLokasi(null);
        fetchLokasi();
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menyimpan data lokasi' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan data lokasi' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lokasi: Lokasi) => {
    setEditingLokasi(lokasi);
    setFormData({
      nama_lokasi: lokasi.nama_lokasi,
      alamat: lokasi.alamat || '',
      keterangan: lokasi.keterangan || '',
      aktif: lokasi.aktif,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data lokasi ini?')) {
      return;
    }

    setDeleting(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/lokasi/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Data lokasi berhasil dihapus!' });
        fetchLokasi();
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menghapus data lokasi' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menghapus data lokasi' });
    } finally {
      setDeleting(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingLokasi(null);
    setFormData({
      nama_lokasi: '',
      alamat: '',
      keterangan: '',
      aktif: 'Y',
    });
  };

  return (
    <div className={styles.container}>
      <Header />

      {message && (
        <div className={`${styles.alert} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.title}>Data Lokasi Baksos</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) {
              setEditingLokasi(null);
              setFormData({
                nama_lokasi: '',
                alamat: '',
                keterangan: '',
                aktif: 'Y',
              });
            }
          }}
          className={styles.btnAdd}
        >
          {showForm ? 'Tutup Form' : '+ Tambah Lokasi'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.formTitle}>
            {editingLokasi ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
          </h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="nama_lokasi">
                Nama Lokasi <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="nama_lokasi"
                name="nama_lokasi"
                value={formData.nama_lokasi}
                onChange={handleChange}
                required
                className={styles.input}
                placeholder="Masukkan nama lokasi"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="alamat">Alamat</label>
              <textarea
                id="alamat"
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Masukkan alamat lokasi"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="keterangan">Keterangan</label>
              <textarea
                id="keterangan"
                name="keterangan"
                value={formData.keterangan}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Masukkan keterangan (opsional)"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="aktif">Status</label>
              <select
                id="aktif"
                name="aktif"
                value={formData.aktif}
                onChange={handleChange}
                className={styles.input}
              >
                <option value="Y">Aktif</option>
                <option value="N">Tidak Aktif</option>
              </select>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.btnCancel}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : editingLokasi ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Daftar Lokasi</h2>
        <div className={styles.tableWrapper}>
          {fetching ? (
            <p className={styles.loading}>Memuat data lokasi...</p>
          ) : lokasiList.length === 0 ? (
            <p className={styles.empty}>Tidak ada data lokasi</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Lokasi</th>
                  <th>Alamat</th>
                  <th>Keterangan</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {lokasiList.map((lokasi, index) => (
                  <tr key={lokasi.id}>
                    <td>{index + 1}</td>
                    <td className={styles.cellName}>{lokasi.nama_lokasi}</td>
                    <td>{lokasi.alamat || '-'}</td>
                    <td>{lokasi.keterangan || '-'}</td>
                    <td className={lokasi.aktif === 'Y' ? styles.statusActive : styles.statusInactive}>
                      {lokasi.aktif === 'Y' ? 'Aktif' : 'Tidak Aktif'}
                    </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleEdit(lokasi)}
                      className={styles.btnEdit}
                      title="Edit"
                    >
                      Edit
                    </button>
                    {' '}
                    <button
                      type="button"
                      onClick={() => handleDelete(lokasi.id)}
                      className={styles.btnDelete}
                      disabled={deleting === lokasi.id}
                      title="Hapus"
                    >
                      {deleting === lokasi.id ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

