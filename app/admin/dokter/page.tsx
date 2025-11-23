'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import styles from './page.module.css';

interface Dokter {
  id: number;
  nama_dokter: string;
  spesialisasi: string | null;
  no_sip: string | null;
  no_telp: string | null;
  email: string | null;
  lokasi_id: number | null;
  aktif: string;
}

interface Lokasi {
  id: number;
  nama_lokasi: string;
  alamat: string | null;
  keterangan: string | null;
  aktif: string;
}

export default function DokterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [removingDuplicates, setRemovingDuplicates] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dokterList, setDokterList] = useState<Dokter[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [editingDokter, setEditingDokter] = useState<Dokter | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fetchingRef = useRef(false);
  
  const [formData, setFormData] = useState({
    nama_dokter: '',
    spesialisasi: '',
    no_sip: '',
    no_telp: '',
    email: '',
    lokasi_id: '',
    aktif: 'Y',
  });
  
  const [lokasiList, setLokasiList] = useState<Lokasi[]>([]);
  const [fetchingLokasi, setFetchingLokasi] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'admin') {
      router.push('/login');
    } else {
      fetchDokter();
      fetchLokasi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDokter = async () => {
    if (fetchingRef.current) return; // Prevent duplicate fetch
    try {
      fetchingRef.current = true;
      setFetching(true);
      
      // Ambil lokasi_id dari localStorage
      const lokasiId = localStorage.getItem('lokasi_id');
      
      const response = await fetch('/api/dokter');
      const result = await response.json();
      if (result.success && result.data) {
        // Remove duplicates based on id
        let uniqueDokter = result.data.filter((dokter: Dokter, index: number, self: Dokter[]) => 
          index === self.findIndex((d: Dokter) => d.id === dokter.id)
        );
        
        // Filter berdasarkan lokasi jika lokasi_id ada di localStorage
        // Dokter tanpa lokasi (lokasi_id = null) akan muncul di semua lokasi
        if (lokasiId) {
          uniqueDokter = uniqueDokter.filter((dokter: Dokter) => 
            !dokter.lokasi_id || dokter.lokasi_id.toString() === lokasiId
          );
        }
        
        setDokterList(uniqueDokter);
      }
    } catch (error) {
      console.error('Error fetching dokter:', error);
    } finally {
      setFetching(false);
      fetchingRef.current = false;
    }
  };

  const fetchLokasi = async () => {
    try {
      setFetchingLokasi(true);
      const response = await fetch('/api/lokasi?aktif=true');
      const result = await response.json();
      if (result.success && result.data) {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const url = editingDokter ? `/api/dokter/${editingDokter.id}` : '/api/dokter';
      const method = editingDokter ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama_dokter: formData.nama_dokter,
          spesialisasi: formData.spesialisasi || null,
          no_sip: formData.no_sip || null,
          no_telp: formData.no_telp || null,
          email: formData.email || null,
          lokasi_id: formData.lokasi_id || null,
          aktif: formData.aktif,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: editingDokter ? 'Data dokter berhasil diupdate!' : 'Data dokter berhasil ditambahkan!' });
        setFormData({
          nama_dokter: '',
          spesialisasi: '',
          no_sip: '',
          no_telp: '',
          email: '',
          lokasi_id: '',
          aktif: 'Y',
        });
        setShowForm(false);
        setEditingDokter(null);
        fetchDokter();
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

  const handleEdit = (dokter: Dokter) => {
    setEditingDokter(dokter);
    setFormData({
      nama_dokter: dokter.nama_dokter,
      spesialisasi: dokter.spesialisasi || '',
      no_sip: dokter.no_sip || '',
      no_telp: dokter.no_telp || '',
      email: dokter.email || '',
      lokasi_id: dokter.lokasi_id ? dokter.lokasi_id.toString() : '',
      aktif: dokter.aktif,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number, namaDokter: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus dokter "${namaDokter}"?`)) {
      return;
    }

    setDeleting(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/dokter/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Dokter berhasil dihapus' });
        fetchDokter();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menghapus dokter' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menghapus dokter' });
    } finally {
      setDeleting(null);
    }
  };

  const handleSeedData = async () => {
    if (!confirm('Apakah Anda yakin ingin menambahkan 10 data dokter? Ini akan menambahkan data ke database.')) {
      return;
    }

    setSeeding(true);
    setMessage(null);

    try {
      const response = await fetch('/api/dokter/seed', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || 'Seed data dokter berhasil ditambahkan!' 
        });
        fetchDokter();
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

      const response = await fetch('/api/dokter/import', {
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
        const fileInput = document.getElementById('excelFileDokter') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        
        fetchDokter();
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

  const handleRemoveDuplicates = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus data dokter yang duplikat? Data duplikat akan dihapus dan hanya menyisakan data yang paling lama.')) {
      return;
    }

    setRemovingDuplicates(true);
    setMessage(null);

    try {
      const response = await fetch('/api/dokter?action=remove-duplicates', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || 'Data duplikat berhasil dihapus!' 
        });
        fetchDokter();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menghapus duplikat' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menghapus duplikat' });
    } finally {
      setRemovingDuplicates(false);
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
        <h2 className={styles.title}>Manajemen Data Dokter</h2>
        <div className={styles.headerButtons}>
          {/* <button
            onClick={handleSeedData}
            disabled={seeding}
            className={styles.btnSeed}
          >
            {seeding ? 'Menambahkan...' : '+ Seed 10 Data Dokter'}
          </button> */}
          <button
            onClick={handleRemoveDuplicates}
            disabled={removingDuplicates}
            className={styles.btnRemoveDuplicates}
          >
            {removingDuplicates ? 'Menghapus...' : '🗑️ Hapus Duplikat'}
          </button>
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
              setEditingDokter(null);
              setShowImportForm(false);
              setFormData({
                nama_dokter: '',
                spesialisasi: '',
                no_sip: '',
                no_telp: '',
                email: '',
                lokasi_id: '',
                aktif: 'Y',
              });
            }}
            className={styles.btnAdd}
          >
            {showForm ? 'Batal' : '+ Tambah Dokter'}
          </button>
        </div>
      </div>

      {showImportForm && (
        <div className={styles.form}>
          <h3 className={styles.formTitle}>Import Data Dokter dari Excel</h3>
          <div className={styles.importInfo}>
            <p className={styles.importInfoTitle}>Format Excel yang diperlukan:</p>
            <ul className={styles.importInfoList}>
              <li>Kolom wajib: <strong>Nama Dokter</strong></li>
              <li>Kolom opsional: <strong>Spesialisasi</strong>, <strong>No SIP</strong>, <strong>No Telepon</strong>, <strong>Email</strong>, <strong>Aktif</strong></li>
              <li>Baris pertama adalah header</li>
              <li>Data dimulai dari baris kedua</li>
              <li>Kolom Aktif: Y/Yes/Aktif untuk aktif, N/No/Tidak Aktif untuk tidak aktif (default: Y)</li>
            </ul>
            <p className={styles.importInfoExample}>
              Contoh format: Nama Dokter | Spesialisasi | No SIP | No Telepon | Email | Aktif
            </p>
          </div>
          <form onSubmit={handleImportExcel}>
            <div className={styles.formGroup}>
              <label htmlFor="excelFileDokter">Pilih File Excel (.xlsx atau .xls) <span className={styles.required}>*</span></label>
              <input
                type="file"
                id="excelFileDokter"
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
                  const fileInput = document.getElementById('excelFileDokter') as HTMLInputElement;
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
            {editingDokter ? 'Edit Dokter' : 'Tambah Dokter Baru'}
          </h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="nama_dokter">Nama Dokter <span className={styles.required}>*</span></label>
              <input
                type="text"
                id="nama_dokter"
                name="nama_dokter"
                value={formData.nama_dokter}
                onChange={handleChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="spesialisasi">Spesialisasi</label>
              <input
                type="text"
                id="spesialisasi"
                name="spesialisasi"
                value={formData.spesialisasi}
                onChange={handleChange}
                className={styles.input}
                placeholder="Contoh: Dokter Umum, Spesialis Anak"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="no_sip">No. SIP</label>
              <input
                type="text"
                id="no_sip"
                name="no_sip"
                value={formData.no_sip}
                onChange={handleChange}
                className={styles.input}
                placeholder="Nomor Surat Izin Praktik"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="no_telp">No. Telepon</label>
              <input
                type="text"
                id="no_telp"
                name="no_telp"
                value={formData.no_telp}
                onChange={handleChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
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
              type="submit"
              disabled={loading}
              className={styles.btnPrimary}
            >
              {loading ? 'Menyimpan...' : editingDokter ? 'Update Dokter' : 'Simpan Dokter'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Daftar Dokter</h2>
        {fetching ? (
          <p>Memuat data...</p>
        ) : dokterList.length === 0 ? (
          <p className={styles.empty}>Belum ada data dokter</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Dokter</th>
                  <th>Spesialisasi</th>
                  <th>No. SIP</th>
                  <th>No. Telepon</th>
                  <th>Email</th>
                  <th>Lokasi</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {dokterList.map((dokter, index) => {
                  const lokasi = dokter.lokasi_id 
                    ? lokasiList.find(l => l.id === dokter.lokasi_id) 
                    : null;
                  
                  return (
                  <tr key={dokter.id}>
                    <td>{index + 1}</td>
                    <td>{dokter.nama_dokter}</td>
                    <td>{dokter.spesialisasi || '-'}</td>
                    <td>{dokter.no_sip || '-'}</td>
                    <td>{dokter.no_telp || '-'}</td>
                    <td>{dokter.email || '-'}</td>
                      <td>{lokasi ? lokasi.nama_lokasi : '-'}</td>
                    <td>
                      <span className={dokter.aktif === 'Y' ? styles.statusActive : styles.statusInactive}>
                        {dokter.aktif === 'Y' ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(dokter)}
                        className={styles.btnEdit}
                      >
                        Edit
                      </button>
                          <button
                            onClick={() => handleDelete(dokter.id, dokter.nama_dokter)}
                            disabled={deleting === dokter.id}
                            className={styles.btnDelete}
                          >
                            {deleting === dokter.id ? 'Menghapus...' : 'Hapus'}
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

