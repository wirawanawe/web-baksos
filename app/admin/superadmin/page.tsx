'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import styles from './page.module.css';

// Interfaces
interface Lokasi {
  id: number;
  nama_lokasi: string;
  alamat: string | null;
  keterangan: string | null;
  aktif: string;
}

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

interface Obat {
  id: number;
  nama_obat: string;
  satuan: string;
  stok: number;
  keterangan: string | null;
  lokasi_id: number | null;
}

type TabType = 'lokasi' | 'dokter' | 'obat';

export default function SuperadminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('lokasi');
  
  // Common states
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lokasi states
  const [lokasiList, setLokasiList] = useState<Lokasi[]>([]);
  const [fetchingLokasi, setFetchingLokasi] = useState(false);
  const [loadingLokasi, setLoadingLokasi] = useState(false);
  const [deletingLokasi, setDeletingLokasi] = useState<number | null>(null);
  const [showFormLokasi, setShowFormLokasi] = useState(false);
  const [editingLokasi, setEditingLokasi] = useState<Lokasi | null>(null);
  const [lokasiFormData, setLokasiFormData] = useState({
    nama_lokasi: '',
    alamat: '',
    keterangan: '',
    aktif: 'Y',
  });

  // Dokter states
  const [dokterList, setDokterList] = useState<Dokter[]>([]);
  const [fetchingDokter, setFetchingDokter] = useState(false);
  const [loadingDokter, setLoadingDokter] = useState(false);
  const [deletingDokter, setDeletingDokter] = useState<number | null>(null);
  const [seedingDokter, setSeedingDokter] = useState(false);
  const [importingDokter, setImportingDokter] = useState(false);
  const [showFormDokter, setShowFormDokter] = useState(false);
  const [showImportFormDokter, setShowImportFormDokter] = useState(false);
  const [editingDokter, setEditingDokter] = useState<Dokter | null>(null);
  const [importFileDokter, setImportFileDokter] = useState<File | null>(null);
  const [dokterFormData, setDokterFormData] = useState({
    nama_dokter: '',
    spesialisasi: '',
    no_sip: '',
    no_telp: '',
    email: '',
    lokasi_id: '',
    aktif: 'Y',
  });
  const fetchingDokterRef = useRef(false);

  // Obat states
  const [obatList, setObatList] = useState<Obat[]>([]);
  const [fetchingObat, setFetchingObat] = useState(false);
  const [loadingObat, setLoadingObat] = useState(false);
  const [deletingObat, setDeletingObat] = useState<number | null>(null);
  const [seedingObat, setSeedingObat] = useState(false);
  const [importingObat, setImportingObat] = useState(false);
  const [showFormObat, setShowFormObat] = useState(false);
  const [showImportFormObat, setShowImportFormObat] = useState(false);
  const [editingObat, setEditingObat] = useState<Obat | null>(null);
  const [importFileObat, setImportFileObat] = useState<File | null>(null);
  const [obatFormData, setObatFormData] = useState({
    nama_obat: '',
    satuan: '',
    stok: '',
    keterangan: '',
    lokasi_id: '',
  });

  useEffect(() => {
    // Load data based on active tab (no authentication required for superadmin)
    if (activeTab === 'lokasi') {
      fetchLokasi();
    } else if (activeTab === 'dokter') {
      fetchDokter();
      fetchLokasiForDropdown();
    } else if (activeTab === 'obat') {
      fetchObat();
      fetchLokasiForDropdown();
    }
  }, [activeTab]);

  // ==================== LOKASI ====================
  const fetchLokasi = async () => {
    try {
      setFetchingLokasi(true);
      const response = await fetch('/api/lokasi');
      const result = await response.json();
      
      if (result.success) {
        setLokasiList(result.data || []);
      } else {
        if (result.error && result.error.includes("doesn't exist")) {
          const setupResponse = await fetch('/api/lokasi/setup', { method: 'POST' });
          const setupResult = await setupResponse.json();
          if (setupResult.success) {
            const retryResponse = await fetch('/api/lokasi');
            const retryResult = await retryResponse.json();
            if (retryResult.success) {
              setLokasiList(retryResult.data || []);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching lokasi:', error);
    } finally {
      setFetchingLokasi(false);
    }
  };

  // Fetch lokasi for dropdown (used in dokter and obat forms)
  const [lokasiListForDropdown, setLokasiListForDropdown] = useState<Lokasi[]>([]);

  const fetchLokasiForDropdown = async () => {
    try {
      const response = await fetch('/api/lokasi?aktif=true');
      const result = await response.json();
      if (result.success && result.data) {
        setLokasiListForDropdown(result.data || []);
      } else if (result.message && result.message.includes('does not exist')) {
        try {
          const setupResponse = await fetch('/api/lokasi/setup', { method: 'POST' });
          const setupResult = await setupResponse.json();
          if (setupResult.success) {
            const retryResponse = await fetch('/api/lokasi?aktif=true');
            const retryResult = await retryResponse.json();
            if (retryResult.success && retryResult.data) {
              setLokasiListForDropdown(retryResult.data || []);
            }
          }
        } catch (setupError) {
          console.error('Error setting up lokasi table:', setupError);
        }
      }
    } catch (error: any) {
      if (error.message && error.message.includes('does not exist')) {
        try {
          const setupResponse = await fetch('/api/lokasi/setup', { method: 'POST' });
          const setupResult = await setupResponse.json();
          if (setupResult.success) {
            const retryResponse = await fetch('/api/lokasi?aktif=true');
            const retryResult = await retryResponse.json();
            if (retryResult.success && retryResult.data) {
              setLokasiListForDropdown(retryResult.data || []);
            }
          }
        } catch (setupError) {
          console.error('Error setting up lokasi table:', setupError);
        }
      } else {
        console.error('Error fetching lokasi for dropdown:', error);
      }
    }
  };

  const handleLokasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLokasi(true);
    setMessage(null);

    try {
      const url = editingLokasi ? `/api/lokasi/${editingLokasi.id}` : '/api/lokasi';
      const method = editingLokasi ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_lokasi: lokasiFormData.nama_lokasi,
          alamat: lokasiFormData.alamat || null,
          keterangan: lokasiFormData.keterangan || null,
          aktif: lokasiFormData.aktif,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: editingLokasi ? 'Data lokasi berhasil diupdate!' : 'Data lokasi berhasil ditambahkan!' 
        });
        setLokasiFormData({ nama_lokasi: '', alamat: '', keterangan: '', aktif: 'Y' });
        setShowFormLokasi(false);
        setEditingLokasi(null);
        fetchLokasi();
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menyimpan data lokasi' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan data lokasi' });
    } finally {
      setLoadingLokasi(false);
    }
  };

  const handleLokasiEdit = (lokasi: Lokasi) => {
    setEditingLokasi(lokasi);
    setLokasiFormData({
      nama_lokasi: lokasi.nama_lokasi,
      alamat: lokasi.alamat || '',
      keterangan: lokasi.keterangan || '',
      aktif: lokasi.aktif,
    });
    setShowFormLokasi(true);
  };

  const handleLokasiDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data lokasi ini?')) return;

    setDeletingLokasi(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/lokasi/${id}`, { method: 'DELETE' });
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
      setDeletingLokasi(null);
    }
  };

  // ==================== DOKTER ====================
  const fetchDokter = async () => {
    if (fetchingDokterRef.current) return;
    try {
      fetchingDokterRef.current = true;
      setFetchingDokter(true);
      
      // NO FILTER - Fetch all doctors from all locations
      const response = await fetch('/api/dokter');
      const result = await response.json();
      if (result.success && result.data) {
        const uniqueDokter = result.data.filter((dokter: Dokter, index: number, self: Dokter[]) => 
          index === self.findIndex((d: Dokter) => d.id === dokter.id)
        );
        setDokterList(uniqueDokter);
      }
    } catch (error) {
      console.error('Error fetching dokter:', error);
    } finally {
      setFetchingDokter(false);
      fetchingDokterRef.current = false;
    }
  };

  const handleDokterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingDokter(true);
    setMessage(null);

    try {
      const url = editingDokter ? `/api/dokter/${editingDokter.id}` : '/api/dokter';
      const method = editingDokter ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_dokter: dokterFormData.nama_dokter,
          spesialisasi: dokterFormData.spesialisasi || null,
          no_sip: dokterFormData.no_sip || null,
          no_telp: dokterFormData.no_telp || null,
          email: dokterFormData.email || null,
          lokasi_id: dokterFormData.lokasi_id || null,
          aktif: dokterFormData.aktif,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: editingDokter ? 'Data dokter berhasil diupdate!' : 'Data dokter berhasil ditambahkan!' 
        });
        setDokterFormData({ 
          nama_dokter: '', spesialisasi: '', no_sip: '', no_telp: '', 
          email: '', lokasi_id: '', aktif: 'Y' 
        });
        setShowFormDokter(false);
        setEditingDokter(null);
        fetchDokter();
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menyimpan data dokter' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan data dokter' });
    } finally {
      setLoadingDokter(false);
    }
  };

  const handleDokterEdit = (dokter: Dokter) => {
    setEditingDokter(dokter);
    setDokterFormData({
      nama_dokter: dokter.nama_dokter,
      spesialisasi: dokter.spesialisasi || '',
      no_sip: dokter.no_sip || '',
      no_telp: dokter.no_telp || '',
      email: dokter.email || '',
      lokasi_id: dokter.lokasi_id ? dokter.lokasi_id.toString() : '',
      aktif: dokter.aktif,
    });
    setShowFormDokter(true);
  };

  const handleDokterDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data dokter ini?')) return;

    setDeletingDokter(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/dokter/${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Data dokter berhasil dihapus!' });
        fetchDokter();
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menghapus data dokter' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menghapus data dokter' });
    } finally {
      setDeletingDokter(null);
    }
  };

  // ==================== OBAT ====================
  const fetchObat = async () => {
    try {
      setFetchingObat(true);
      
      // NO FILTER - Fetch all medicines from all locations
      const response = await fetch('/api/obat');
      const result = await response.json();
      if (result.success) {
        setObatList(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching obat:', error);
    } finally {
      setFetchingObat(false);
    }
  };

  const handleObatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingObat(true);
    setMessage(null);

    try {
      const url = editingObat ? `/api/obat/${editingObat.id}` : '/api/obat';
      const method = editingObat ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_obat: obatFormData.nama_obat,
          satuan: obatFormData.satuan,
          stok: parseInt(obatFormData.stok) || 0,
          keterangan: obatFormData.keterangan || null,
          lokasi_id: obatFormData.lokasi_id || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: editingObat ? 'Data obat berhasil diupdate!' : 'Data obat berhasil ditambahkan!' 
        });
        setObatFormData({ nama_obat: '', satuan: '', stok: '', keterangan: '', lokasi_id: '' });
        setShowFormObat(false);
        setEditingObat(null);
        fetchObat();
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menyimpan data obat' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan data obat' });
    } finally {
      setLoadingObat(false);
    }
  };

  const handleObatEdit = (obat: Obat) => {
    setEditingObat(obat);
    setObatFormData({
      nama_obat: obat.nama_obat,
      satuan: obat.satuan,
      stok: obat.stok.toString(),
      keterangan: obat.keterangan || '',
      lokasi_id: obat.lokasi_id ? obat.lokasi_id.toString() : '',
    });
    setShowFormObat(true);
  };

  const handleObatDelete = async (id: number, namaObat: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus obat "${namaObat}"?`)) return;

    setDeletingObat(id);
    setMessage(null);

    try {
      const response = await fetch(`/api/obat/${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Obat berhasil dihapus!' });
        fetchObat();
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menghapus obat' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menghapus obat' });
    } finally {
      setDeletingObat(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, type: 'lokasi' | 'dokter' | 'obat') => {
    const { name, value } = e.target;
    if (type === 'lokasi') {
      setLokasiFormData(prev => ({ ...prev, [name]: value }));
    } else if (type === 'dokter') {
      setDokterFormData(prev => ({ ...prev, [name]: value }));
    } else if (type === 'obat') {
      setObatFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const getLokasiName = (lokasiId: number | null) => {
    if (!lokasiId) return '-';
    // Try both lokasiList and lokasiListForDropdown
    const lokasi = lokasiList.find(l => l.id === lokasiId) || lokasiListForDropdown.find(l => l.id === lokasiId);
    return lokasi ? lokasi.nama_lokasi : '-';
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
        <h1 className={styles.title}>Superadmin - Pengaturan Data</h1>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'lokasi' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('lokasi')}
        >
          Lokasi Baksos
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'dokter' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('dokter')}
        >
          Data Dokter
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'obat' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('obat')}
        >
          Data Obat
        </button>
      </div>

      {/* Tab Content - Lokasi */}
      {activeTab === 'lokasi' && (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Manajemen Lokasi Baksos</h2>
            <button
              type="button"
              onClick={() => {
                setShowFormLokasi(!showFormLokasi);
                if (!showFormLokasi) {
                  setEditingLokasi(null);
                  setLokasiFormData({ nama_lokasi: '', alamat: '', keterangan: '', aktif: 'Y' });
                }
              }}
              className={styles.btnAdd}
            >
              {showFormLokasi ? 'Tutup Form' : '+ Tambah Lokasi'}
            </button>
          </div>

          {showFormLokasi && (
            <form onSubmit={handleLokasiSubmit} className={styles.form}>
              <h3 className={styles.formTitle}>
                {editingLokasi ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
              </h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="nama_lokasi">
                    Nama Lokasi <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    id="nama_lokasi"
                    name="nama_lokasi"
                    value={lokasiFormData.nama_lokasi}
                    onChange={(e) => handleChange(e, 'lokasi')}
                    required
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="alamat">Alamat</label>
                  <textarea
                    id="alamat"
                    name="alamat"
                    value={lokasiFormData.alamat}
                    onChange={(e) => handleChange(e, 'lokasi')}
                    className={styles.textarea}
                    rows={3}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="keterangan">Keterangan</label>
                  <textarea
                    id="keterangan"
                    name="keterangan"
                    value={lokasiFormData.keterangan}
                    onChange={(e) => handleChange(e, 'lokasi')}
                    className={styles.textarea}
                    rows={3}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="aktif">Status</label>
                  <select
                    id="aktif"
                    name="aktif"
                    value={lokasiFormData.aktif}
                    onChange={(e) => handleChange(e, 'lokasi')}
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
                  onClick={() => {
                    setShowFormLokasi(false);
                    setEditingLokasi(null);
                    setLokasiFormData({ nama_lokasi: '', alamat: '', keterangan: '', aktif: 'Y' });
                  }}
                  className={styles.btnCancel}
                  disabled={loadingLokasi}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={styles.btnSubmit}
                  disabled={loadingLokasi}
                >
                  {loadingLokasi ? 'Menyimpan...' : editingLokasi ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          )}

          <div className={styles.tableWrapper}>
            {fetchingLokasi ? (
              <p>Memuat data lokasi...</p>
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
                      <td>{lokasi.nama_lokasi}</td>
                      <td>{lokasi.alamat || '-'}</td>
                      <td>{lokasi.keterangan || '-'}</td>
                      <td>{lokasi.aktif === 'Y' ? 'Aktif' : 'Tidak Aktif'}</td>
                      <td>
                        <button
                          onClick={() => handleLokasiEdit(lokasi)}
                          className={styles.btnEdit}
                        >
                          Edit
                        </button>
                        {' '}
                        <button
                          onClick={() => handleLokasiDelete(lokasi.id)}
                          disabled={deletingLokasi === lokasi.id}
                          className={styles.btnDelete}
                        >
                          {deletingLokasi === lokasi.id ? 'Menghapus...' : 'Hapus'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab Content - Dokter */}
      {activeTab === 'dokter' && (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Manajemen Data Dokter (Semua Lokasi)</h2>
            <button
              type="button"
              onClick={() => {
                setShowFormDokter(!showFormDokter);
                if (!showFormDokter) {
                  setEditingDokter(null);
                  setDokterFormData({ 
                    nama_dokter: '', spesialisasi: '', no_sip: '', no_telp: '', 
                    email: '', lokasi_id: '', aktif: 'Y' 
                  });
                }
              }}
              className={styles.btnAdd}
            >
              {showFormDokter ? 'Tutup Form' : '+ Tambah Dokter'}
            </button>
          </div>

          {showFormDokter && (
            <form onSubmit={handleDokterSubmit} className={styles.form}>
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
                    value={dokterFormData.nama_dokter}
                    onChange={(e) => handleChange(e, 'dokter')}
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
                    value={dokterFormData.spesialisasi}
                    onChange={(e) => handleChange(e, 'dokter')}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="no_sip">No SIP</label>
                  <input
                    type="text"
                    id="no_sip"
                    name="no_sip"
                    value={dokterFormData.no_sip}
                    onChange={(e) => handleChange(e, 'dokter')}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="no_telp">No Telepon</label>
                  <input
                    type="text"
                    id="no_telp"
                    name="no_telp"
                    value={dokterFormData.no_telp}
                    onChange={(e) => handleChange(e, 'dokter')}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={dokterFormData.email}
                    onChange={(e) => handleChange(e, 'dokter')}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="lokasi_id">Lokasi Baksos</label>
                  <select
                    id="lokasi_id"
                    name="lokasi_id"
                    value={dokterFormData.lokasi_id}
                    onChange={(e) => handleChange(e, 'dokter')}
                    className={styles.input}
                  >
                    <option value="">-- Pilih Lokasi --</option>
                    {lokasiListForDropdown.map((lokasi) => (
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
                    value={dokterFormData.aktif}
                    onChange={(e) => handleChange(e, 'dokter')}
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
                  onClick={() => {
                    setShowFormDokter(false);
                    setEditingDokter(null);
                    setDokterFormData({ 
                      nama_dokter: '', spesialisasi: '', no_sip: '', no_telp: '', 
                      email: '', lokasi_id: '', aktif: 'Y' 
                    });
                  }}
                  className={styles.btnCancel}
                  disabled={loadingDokter}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={styles.btnSubmit}
                  disabled={loadingDokter}
                >
                  {loadingDokter ? 'Menyimpan...' : editingDokter ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          )}

          <div className={styles.tableWrapper}>
            {fetchingDokter ? (
              <p>Memuat data dokter...</p>
            ) : dokterList.length === 0 ? (
              <p className={styles.empty}>Tidak ada data dokter</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Dokter</th>
                    <th>Spesialisasi</th>
                    <th>No SIP</th>
                    <th>No Telepon</th>
                    <th>Email</th>
                    <th>Lokasi</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {dokterList.map((dokter, index) => (
                    <tr key={dokter.id}>
                      <td>{index + 1}</td>
                      <td>{dokter.nama_dokter}</td>
                      <td>{dokter.spesialisasi || '-'}</td>
                      <td>{dokter.no_sip || '-'}</td>
                      <td>{dokter.no_telp || '-'}</td>
                      <td>{dokter.email || '-'}</td>
                      <td>{getLokasiName(dokter.lokasi_id)}</td>
                      <td>{dokter.aktif === 'Y' ? 'Aktif' : 'Tidak Aktif'}</td>
                      <td>
                        <button
                          onClick={() => handleDokterEdit(dokter)}
                          className={styles.btnEdit}
                        >
                          Edit
                        </button>
                        {' '}
                        <button
                          onClick={() => handleDokterDelete(dokter.id)}
                          disabled={deletingDokter === dokter.id}
                          className={styles.btnDelete}
                        >
                          {deletingDokter === dokter.id ? 'Menghapus...' : 'Hapus'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab Content - Obat */}
      {activeTab === 'obat' && (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Manajemen Data Obat (Semua Lokasi)</h2>
            <button
              type="button"
              onClick={() => {
                setShowFormObat(!showFormObat);
                if (!showFormObat) {
                  setEditingObat(null);
                  setObatFormData({ nama_obat: '', satuan: '', stok: '', keterangan: '', lokasi_id: '' });
                }
              }}
              className={styles.btnAdd}
            >
              {showFormObat ? 'Tutup Form' : '+ Tambah Obat'}
            </button>
          </div>

          {showFormObat && (
            <form onSubmit={handleObatSubmit} className={styles.form}>
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
                    value={obatFormData.nama_obat}
                    onChange={(e) => handleChange(e, 'obat')}
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
                    value={obatFormData.satuan}
                    onChange={(e) => handleChange(e, 'obat')}
                    required
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="stok">Stok Awal</label>
                  <input
                    type="number"
                    id="stok"
                    name="stok"
                    value={obatFormData.stok}
                    onChange={(e) => handleChange(e, 'obat')}
                    min="0"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="lokasi_id">Lokasi Baksos</label>
                  <select
                    id="lokasi_id"
                    name="lokasi_id"
                    value={obatFormData.lokasi_id}
                    onChange={(e) => handleChange(e, 'obat')}
                    className={styles.input}
                  >
                    <option value="">-- Pilih Lokasi --</option>
                    {lokasiListForDropdown.map((lokasi) => (
                      <option key={lokasi.id} value={lokasi.id}>
                        {lokasi.nama_lokasi}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroupFull}>
                  <label htmlFor="keterangan">Keterangan</label>
                  <textarea
                    id="keterangan"
                    name="keterangan"
                    value={obatFormData.keterangan}
                    onChange={(e) => handleChange(e, 'obat')}
                    rows={3}
                    className={styles.textarea}
                  />
                </div>
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowFormObat(false);
                    setEditingObat(null);
                    setObatFormData({ nama_obat: '', satuan: '', stok: '', keterangan: '', lokasi_id: '' });
                  }}
                  className={styles.btnCancel}
                  disabled={loadingObat}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={styles.btnSubmit}
                  disabled={loadingObat}
                >
                  {loadingObat ? 'Menyimpan...' : editingObat ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          )}

          <div className={styles.tableWrapper}>
            {fetchingObat ? (
              <p>Memuat data obat...</p>
            ) : obatList.length === 0 ? (
              <p className={styles.empty}>Tidak ada data obat</p>
            ) : (
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
                  {obatList.map((obat, index) => (
                    <tr key={obat.id}>
                      <td>{index + 1}</td>
                      <td>{obat.nama_obat}</td>
                      <td>{obat.satuan}</td>
                      <td>{obat.stok}</td>
                      <td>{getLokasiName(obat.lokasi_id)}</td>
                      <td>{obat.keterangan || '-'}</td>
                      <td>
                        <button
                          onClick={() => handleObatEdit(obat)}
                          className={styles.btnEdit}
                        >
                          Edit
                        </button>
                        {' '}
                        <button
                          onClick={() => handleObatDelete(obat.id, obat.nama_obat)}
                          disabled={deletingObat === obat.id}
                          className={styles.btnDelete}
                        >
                          {deletingObat === obat.id ? 'Menghapus...' : 'Hapus'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

