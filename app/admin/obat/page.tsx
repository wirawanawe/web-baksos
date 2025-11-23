'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import styles from './page.module.css';

interface Obat {
  id: number;
  nama_obat: string;
  satuan: string;
  stok: number;
  keterangan: string | null;
  lokasi_id: number | null;
}

interface Lokasi {
  id: number;
  nama_lokasi: string;
  aktif: string;
}

export default function ObatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchingLokasi, setFetchingLokasi] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [obatList, setObatList] = useState<Obat[]>([]);
  const [lokasiList, setLokasiList] = useState<Lokasi[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [editingObat, setEditingObat] = useState<Obat | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    nama_obat: '',
    satuan: '',
    stok: '',
    keterangan: '',
    lokasi_id: '',
  });

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'admin') {
      router.push('/login');
    } else {
      fetchLokasi();
      fetchObat();
      
      // Auto-set lokasi_id dari localStorage saat pertama kali load
      const lokasiIdFromStorage = localStorage.getItem('lokasi_id');
      if (lokasiIdFromStorage) {
        setFormData(prev => {
          // Only update if not already set
          if (!prev.lokasi_id) {
            return { ...prev, lokasi_id: lokasiIdFromStorage };
          }
          return prev;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // formData.lokasi_id is intentionally excluded - we use functional update pattern
  }, [router]);

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

  const fetchObat = async () => {
    try {
      setFetching(true);
      
      // Ambil lokasi_id dari localStorage
      const lokasiId = localStorage.getItem('lokasi_id');
      
      // Build URL dengan filter lokasi jika ada
      let url = '/api/obat';
      if (lokasiId) {
        url += `?lokasi_id=${lokasiId}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setObatList(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching obat:', error);
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
      // Ambil lokasi_id dari localStorage jika tidak ada di form (untuk auto-set saat create)
      const lokasiIdFromStorage = localStorage.getItem('lokasi_id');
      const lokasiId = formData.lokasi_id || lokasiIdFromStorage;
      
      const url = editingObat ? `/api/obat/${editingObat.id}` : '/api/obat';
      const method = editingObat ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama_obat: formData.nama_obat,
          satuan: formData.satuan,
          stok: parseInt(formData.stok) || 0,
          keterangan: formData.keterangan || null,
          lokasi_id: lokasiId || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: editingObat ? 'Data obat berhasil diupdate!' : 'Data obat berhasil ditambahkan!' 
        });
        // Reset form, tapi keep lokasi_id dari localStorage untuk kemudahan
        const lokasiIdFromStorage = localStorage.getItem('lokasi_id');
        setFormData({
          nama_obat: '',
          satuan: '',
          stok: '',
          keterangan: '',
          lokasi_id: lokasiIdFromStorage || '',
        });
        setEditingObat(null);
        setShowForm(false);
        fetchObat();
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

  const handleEdit = (obat: Obat) => {
    setEditingObat(obat);
    setFormData({
      nama_obat: obat.nama_obat,
      satuan: obat.satuan,
      stok: obat.stok.toString(),
      keterangan: obat.keterangan || '',
      lokasi_id: obat.lokasi_id ? obat.lokasi_id.toString() : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number, namaObat: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus obat "${namaObat}"?`)) {
      return;
    }

    setDeleting(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/obat/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Obat berhasil dihapus' });
        fetchObat();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menghapus obat' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menghapus obat' });
    } finally {
      setDeleting(null);
    }
  };

  const handleSeedData = async () => {
    if (!confirm('Apakah Anda yakin ingin menambahkan 300 data obat? Ini akan menambahkan data ke database.')) {
      return;
    }

    setSeeding(true);
    setMessage(null);

    try {
      const response = await fetch('/api/obat/seed', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || 'Seed data berhasil ditambahkan!' 
        });
        fetchObat();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menambahkan seed data' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menambahkan seed data' });
    } finally {
      setSeeding(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setMessage({ type: 'error', text: 'File harus berformat Excel (.xlsx atau .xls)' });
        return;
      }
      setImportFile(file);
      setMessage(null);
    }
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!importFile) {
      setMessage({ type: 'error', text: 'Pilih file Excel terlebih dahulu' });
      return;
    }

    setImporting(true);
    setMessage(null);

    try {
      // Ambil lokasi_id dari localStorage
      const lokasiId = localStorage.getItem('lokasi_id');
      
      const formData = new FormData();
      formData.append('file', importFile);
      if (lokasiId) {
        formData.append('lokasi_id', lokasiId);
      }

      const response = await fetch('/api/obat/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        let messageText = result.message || 'Data berhasil diimpor';
        
        // Tambahkan detail jika ada
        if (result.duplicateNames && result.duplicateNames.length > 0) {
          messageText += `\n\nData duplikat yang dilewati:\n${result.duplicateNames.slice(0, 10).join(', ')}${result.duplicateNames.length > 10 ? ` dan ${result.duplicateNames.length - 10} lainnya` : ''}`;
        }
        
        if (result.errors && result.errors.length > 0) {
          messageText += `\n\nError:\n${result.errors.slice(0, 5).join('\n')}${result.errors.length > 5 ? `\n... dan ${result.errors.length - 5} error lainnya` : ''}`;
        }

        setMessage({ type: 'success', text: messageText });
        setImportFile(null);
        setShowImportForm(false);
        
        // Reset file input
        const fileInput = document.getElementById('excelFile') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        
        fetchObat();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        let errorText = result.message || 'Gagal mengimpor data';
        
        if (result.errors && result.errors.length > 0) {
          errorText += `\n\nError:\n${result.errors.slice(0, 10).join('\n')}${result.errors.length > 10 ? `\n... dan ${result.errors.length - 10} error lainnya` : ''}`;
        }
        
        setMessage({ type: 'error', text: errorText });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengimpor data' });
    } finally {
      setImporting(false);
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

      <div className={styles.header}>
        <h2 className={styles.title}>Manajemen Data Obat</h2>
        <div className={styles.headerButtons}>
          {/* <button
            onClick={handleSeedData}
            disabled={seeding}
            className={styles.btnSeed}
          >
            {seeding ? 'Menambahkan...' : '+ Seed 300 Data Obat'}
          </button> */}
          <button
            onClick={() => {
              setShowImportForm(!showImportForm);
              setShowForm(false);
              setImportFile(null);
            }}
            className={styles.btnImport}
          >
            {showImportForm ? 'Batal Import' : '📥 Import Excel'}
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingObat(null);
              setShowImportForm(false);
              // Reset form, tapi keep lokasi_id dari localStorage untuk kemudahan
              const lokasiIdFromStorage = localStorage.getItem('lokasi_id');
              setFormData({
                nama_obat: '',
                satuan: '',
                stok: '',
                keterangan: '',
                lokasi_id: lokasiIdFromStorage || '',
              });
            }}
            className={styles.btnAdd}
          >
            {showForm ? 'Batal' : '+ Tambah Obat'}
          </button>
        </div>
      </div>

      {showImportForm && (
        <div className={styles.form}>
          <h3 className={styles.formTitle}>Import Data Obat dari Excel</h3>
          <div className={styles.importInfo}>
            <p className={styles.importInfoTitle}>Format Excel yang diperlukan:</p>
            <ul className={styles.importInfoList}>
              <li>Kolom wajib: <strong>Nama Obat</strong>, <strong>Satuan</strong></li>
              <li>Kolom opsional: <strong>Stok</strong>, <strong>Keterangan</strong></li>
              <li>Baris pertama adalah header</li>
              <li>Data dimulai dari baris kedua</li>
            </ul>
            <p className={styles.importInfoExample}>
              Contoh format: Nama Obat | Satuan | Stok | Keterangan
            </p>
          </div>
          <form onSubmit={handleImportExcel}>
            <div className={styles.formGroup}>
              <label htmlFor="excelFile">Pilih File Excel (.xlsx atau .xls) <span className={styles.required}>*</span></label>
              <input
                type="file"
                id="excelFile"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                required
                className={styles.fileInput}
              />
              {importFile && (
                <p className={styles.fileInfo}>
                  File dipilih: <strong>{importFile.name}</strong> ({(importFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={importing || !importFile}
                className={styles.btnPrimary}
              >
                {importing ? 'Mengimpor...' : 'Import Data'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImportForm(false);
                  setImportFile(null);
                  const fileInput = document.getElementById('excelFile') as HTMLInputElement;
                  if (fileInput) {
                    fileInput.value = '';
                  }
                }}
                className={styles.btnReset}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <h3 className={styles.formTitle}>
            {editingObat ? 'Edit Obat' : 'Tambah Obat Baru'}
          </h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="nama_obat">Nama Obat <span className={styles.required}>*</span></label>
              <input
                type="text"
                id="nama_obat"
                name="nama_obat"
                value={formData.nama_obat}
                onChange={handleChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="satuan">Satuan <span className={styles.required}>*</span></label>
              <input
                type="text"
                id="satuan"
                name="satuan"
                value={formData.satuan}
                onChange={handleChange}
                required
                placeholder="Contoh: tablet, kapsul, botol"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="stok">Stok Awal</label>
              <input
                type="number"
                id="stok"
                name="stok"
                value={formData.stok}
                onChange={handleChange}
                min="0"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroupFull}>
              <label htmlFor="keterangan">Keterangan</label>
              <textarea
                id="keterangan"
                name="keterangan"
                value={formData.keterangan}
                onChange={handleChange}
                rows={3}
                className={styles.textarea}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lokasi_id">Lokasi Baksos</label>
              <select
                id="lokasi_id"
                name="lokasi_id"
                value={formData.lokasi_id}
                onChange={handleChange}
                className={styles.input}
              >
                <option value="">-- Pilih Lokasi --</option>
                {lokasiList.map((lokasi) => (
                  <option key={lokasi.id} value={lokasi.id}>
                    {lokasi.nama_lokasi}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              disabled={loading}
              className={styles.btnPrimary}
            >
              {loading ? 'Menyimpan...' : editingObat ? 'Update Obat' : 'Simpan Obat'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Daftar Obat</h2>
        {fetching ? (
          <p>Memuat data...</p>
        ) : obatList.length === 0 ? (
          <p className={styles.empty}>Belum ada data obat</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Obat</th>
                  <th>Satuan</th>
                  <th>Stok</th>
                  <th>Lokasi</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {obatList.map((obat, index) => {
                  const lokasi = obat.lokasi_id 
                    ? lokasiList.find(l => l.id === obat.lokasi_id) 
                    : null;
                  
                  return (
                  <tr key={obat.id}>
                    <td>{index + 1}</td>
                    <td>{obat.nama_obat}</td>
                    <td>{obat.satuan}</td>
                    <td>
                      <span className={obat.stok > 0 ? styles.stokAvailable : styles.stokEmpty}>
                        {obat.stok}
                      </span>
                    </td>
                      <td>{lokasi ? lokasi.nama_lokasi : '-'}</td>
                    <td>{obat.keterangan || '-'}</td>
                    <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(obat)}
                        className={styles.btnEdit}
                      >
                        Edit
                      </button>
                          <button
                            onClick={() => handleDelete(obat.id, obat.nama_obat)}
                            disabled={deleting === obat.id}
                            className={styles.btnDelete}
                          >
                            {deleting === obat.id ? 'Menghapus...' : 'Hapus'}
                          </button>
                        </div>
                    </td>
                  </tr>
                  );
                })}
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

