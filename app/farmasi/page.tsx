'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { formatAge } from '@/lib/formatAge';
import styles from './page.module.css';

interface Patient {
  id: number;
  no_registrasi?: string | null;
  nama: string;
  no_ktp: string;
  no_telepon: string;
  jenis_kelamin: string;
  usia: number;
  tanggal_lahir?: string;
  alamat: string;
  diagnosa: string | null;
  resep: string | null;
  status: string;
  locked_by?: string | null;
  locked_at?: string | null;
}

interface ResepDetail {
  id: number;
  pemeriksaan_id: number;
  patient_id?: number; // Backward compatibility
  obat_id: number;
  jumlah: number;
  aturan_pakai: string;
  nama_obat: string;
  satuan: string;
}

interface EditingResep {
  id: number;
  jumlah: number;
  aturan_pakai: string;
}

interface Obat {
  id: number;
  nama_obat: string;
  satuan: string;
  stok: number;
}

interface NewResepItem {
  obat_id: number;
  jumlah: number | string;
  aturan_pakai: string;
}

export default function FarmasiPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [resepDetails, setResepDetails] = useState<ResepDetail[]>([]);
  const [editingResep, setEditingResep] = useState<EditingResep | null>(null);
  const [obatList, setObatList] = useState<Obat[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResepItem, setNewResepItem] = useState<NewResepItem>({
    obat_id: 0,
    jumlah: '',
    aturan_pakai: '',
  });
  const [addingResep, setAddingResep] = useState(false);
  const [deletingResep, setDeletingResep] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'farmasi') {
      router.push('/login');
    } else {
      fetchPatients();
      fetchObat();
      
      // Auto-refresh every 30 seconds
      const refreshInterval = setInterval(() => {
        // Only refresh if no patient is selected
        if (!selectedPatient) {
          fetchPatients(currentPage, searchTerm);
        }
      }, 30000); // 30 seconds
      
      return () => clearInterval(refreshInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // fetchPatients uses currentPage and searchTerm which are already in deps
  }, [router, selectedPatient, currentPage, searchTerm]);

  const fetchPatients = async (page: number = currentPage, search: string = searchTerm) => {
    try {
      setFetching(true);
      const tanggalPraktik = localStorage.getItem('tanggal_praktik');
      const lokasiId = localStorage.getItem('lokasi_id');
      
      if (!tanggalPraktik) {
        setMessage({ type: 'error', text: 'Tanggal Praktik tidak ditemukan. Silakan login ulang.' });
        return;
      }
      
      // Filter berdasarkan status 'farmasi' (hanya pasien yang memiliki resep dari dokter)
      // dan tanggal praktik serta lokasi dengan pagination dan search
      let url = `/api/patients?status=farmasi&startDate=${tanggalPraktik}&endDate=${tanggalPraktik}&page=${page}&limit=${itemsPerPage}`;
      if (lokasiId) {
        url += `&lokasi_id=${lokasiId}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setPatients(result.data || []);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalPatients(result.pagination.total);
        }
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setMessage({ type: 'error', text: 'Gagal memuat data pasien' });
    } finally {
      setFetching(false);
    }
  };
  
  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchPatients(1, searchTerm);
      } else {
        setCurrentPage(1);
      }
    }, 500);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);
  
  useEffect(() => {
    fetchPatients(currentPage, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchObat = async () => {
    try {
      // Ambil lokasi_id dari localStorage untuk filter
      const lokasiId = localStorage.getItem('lokasi_id');
      
      // Build URL dengan filter lokasi jika ada
      let url = '/api/obat';
      if (lokasiId) {
        url += `?lokasi_id=${lokasiId}`;
      }
      
      const response = await fetch(url, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (result.success && result.data) {
        setObatList(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      console.error('Error fetching obat:', error);
    }
  };

  const handleSelectPatient = async (patient: Patient) => {
    // No lock mechanism for farmasi - can select any patient
    setSelectedPatient(patient);
    setMessage(null);
    setEditingResep(null);
    setShowAddForm(false);
    setNewResepItem({ obat_id: 0, jumlah: 1, aturan_pakai: '' });
    
    // Fetch resep details
    // Note: patient.id is actually pemeriksaan.id based on the API response
    try {
      const response = await fetch(`/api/resep?pemeriksaan_id=${patient.id}`);
      const result = await response.json();
      if (result.success) {
        setResepDetails(result.data);
      }
    } catch (error) {
      console.error('Error fetching resep:', error);
    }
  };

  const handleEditResep = (resep: ResepDetail) => {
    setEditingResep({
      id: resep.id,
      jumlah: resep.jumlah,
      aturan_pakai: resep.aturan_pakai || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingResep(null);
  };

  const handleUpdateResep = async (resepId: number) => {
    if (!editingResep || editingResep.id !== resepId) return;

    setUpdating(resepId);
    setMessage(null);

    try {
      const response = await fetch(`/api/resep/${resepId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jumlah: editingResep.jumlah,
          aturan_pakai: editingResep.aturan_pakai || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Resep berhasil diupdate' });
        setEditingResep(null);
        
        // Refresh resep details
        if (selectedPatient) {
          const resepResponse = await fetch(`/api/resep?pemeriksaan_id=${selectedPatient.id}`);
          const resepResult = await resepResponse.json();
          if (resepResult.success) {
            setResepDetails(resepResult.data);
          }
        }
        
        // Refresh obat list to get updated stock
        fetchObat();
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal mengupdate resep' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengupdate resep' });
    } finally {
      setUpdating(null);
    }
  };

  const handleResepChange = (field: 'jumlah' | 'aturan_pakai', value: any) => {
    if (!editingResep) return;
    
    setEditingResep({
      ...editingResep,
      [field]: field === 'jumlah' ? parseInt(value) || 1 : value,
    });
  };

  const handleDeleteResep = async (resepId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus obat ini dari resep?')) {
      return;
    }

    setDeletingResep(resepId);
    setMessage(null);

    try {
      const response = await fetch(`/api/resep?id=${resepId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Obat berhasil dihapus dari resep dan stok telah dikembalikan' });
        
        // Refresh resep details
        if (selectedPatient) {
          const resepResponse = await fetch(`/api/resep?pemeriksaan_id=${selectedPatient.id}`);
          const resepResult = await resepResponse.json();
          if (resepResult.success) {
            setResepDetails(resepResult.data);
          }
        }
        
        // Refresh obat list to get updated stock
        fetchObat();
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menghapus obat dari resep' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menghapus obat' });
    } finally {
      setDeletingResep(null);
    }
  };

  const handleAddResep = async () => {
    if (!selectedPatient || !newResepItem.obat_id || newResepItem.obat_id === 0) {
      setMessage({ type: 'error', text: 'Pilih obat terlebih dahulu' });
      return;
    }

    const jumlahNum = typeof newResepItem.jumlah === 'string' ? parseInt(newResepItem.jumlah) : newResepItem.jumlah;
    if (!jumlahNum || jumlahNum <= 0) {
      setMessage({ type: 'error', text: 'Jumlah obat harus diisi dan lebih dari 0' });
      return;
    }

    // Validasi stok
    const selectedObat = obatList.find(o => o.id === newResepItem.obat_id);
    if (!selectedObat) {
      setMessage({ type: 'error', text: 'Obat tidak ditemukan' });
      return;
    }

    if (selectedObat.stok < jumlahNum) {
      setMessage({ 
        type: 'error', 
        text: `Stok ${selectedObat.nama_obat} tidak cukup. Stok tersedia: ${selectedObat.stok}` 
      });
      return;
    }

    setAddingResep(true);
    setMessage(null);

    try {
      const response = await fetch('/api/resep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pemeriksaan_id: selectedPatient.id, // patient.id is actually pemeriksaan.id
          obat_id: newResepItem.obat_id,
          jumlah: jumlahNum,
          aturan_pakai: newResepItem.aturan_pakai || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Obat berhasil ditambahkan ke resep' });
        setShowAddForm(false);
        setNewResepItem({ obat_id: 0, jumlah: '', aturan_pakai: '' });
        
        // Refresh resep details
        const resepResponse = await fetch(`/api/resep?pemeriksaan_id=${selectedPatient.id}`);
        const resepResult = await resepResponse.json();
        if (resepResult.success) {
          setResepDetails(resepResult.data);
        }
        
        // Refresh obat list to get updated stock
        fetchObat();
      } else {
        setMessage({ type: 'error', text: result.message || 'Gagal menambahkan obat ke resep' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menambahkan obat' });
    } finally {
      setAddingResep(false);
    }
  };

  const handleSelesai = async () => {
    if (!selectedPatient) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'selesai',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Obat berhasil diberikan kepada pasien!' });
        
        setSelectedPatient(null);
        setResepDetails([]);
        fetchPatients(currentPage, searchTerm);
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

      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Daftar Pasien Menunggu Obat</h2>
          <input
            type="text"
            placeholder="Cari pasien (nama, KTP, telepon)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
              minWidth: '250px'
            }}
          />
        </div>
        {fetching ? (
          <p>Memuat data...</p>
        ) : patients.length === 0 ? (
          <p className={styles.empty}>Tidak ada pasien yang menunggu obat{searchTerm ? ` dengan kata kunci "${searchTerm}"` : ''}</p>
        ) : (
          <>
            <div className={styles.patientList}>
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className={`${styles.patientCard} ${selectedPatient?.id === patient.id ? styles.selected : ''}`}
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className={styles.patientInfo}>
                    {patient.no_registrasi && (
                      <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.9em', marginBottom: '4px', display: 'block' }}>
                        No. Registrasi: {patient.no_registrasi}
                      </span>
                    )}
                    <strong>{patient.nama}</strong>
                    <span>Usia: {formatAge(patient.usia, patient.tanggal_lahir)} | {patient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                    {patient.diagnosa && (
                      <span className={styles.diagnosa}>Diagnosa: {patient.diagnosa}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalPatients)} dari {totalPatients} pasien
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || fetching}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Sebelumnya
                  </button>
                  <span style={{ padding: '6px 12px', fontSize: '14px' }}>
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || fetching}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedPatient && (
        <div className={styles.form}>
          <div className={styles.selectedPatientInfo}>
            <h3>Resep untuk: <strong>{selectedPatient.nama}</strong></h3>
            <div className={styles.patientData}>
              <p><strong>No. KTP:</strong> {selectedPatient.no_ktp || '-'}</p>
              <p><strong>No. Telepon:</strong> {selectedPatient.no_telepon || '-'}</p>
              <p><strong>Alamat:</strong> {selectedPatient.alamat}</p>
              {selectedPatient.diagnosa && (
                <p><strong>Diagnosa:</strong> {selectedPatient.diagnosa}</p>
              )}
            </div>
          </div>

          <section className={styles.section}>
            <div className={styles.resepHeader}>
              <h2 className={`${styles.sectionTitle} ${styles.resepHeaderTitle}`}>DETAIL RESEP OBAT</h2>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className={styles.btnAddResep}
              >
                {showAddForm ? '✕ Batal' : '+ Tambah Obat'}
              </button>
            </div>

            {showAddForm && (
              <div className={styles.addResepForm}>
                <h3 className={styles.addResepFormTitle}>Tambah Obat Baru</h3>
                <div className={styles.addResepFormGrid}>
                  <div className={styles.addResepFormGroup}>
                    <label className={styles.addResepFormLabel}>
                      Nama Obat
                    </label>
                    <select
                      value={newResepItem.obat_id}
                      onChange={(e) => setNewResepItem({ ...newResepItem, obat_id: parseInt(e.target.value) })}
                      className={styles.addResepFormSelect}
                    >
                      <option value="0">Pilih Obat</option>
                      {obatList.map((obat) => (
                        <option 
                          key={obat.id} 
                          value={obat.id}
                          disabled={obat.stok === 0}
                          style={obat.stok === 0 ? { color: '#999', fontStyle: 'italic' } : {}}
                        >
                          {obat.nama_obat} ({obat.satuan}) - Stok: {obat.stok} {obat.stok === 0 ? '(Habis)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.addResepFormGroup}>
                    <label className={styles.addResepFormLabel}>
                      Jumlah
                    </label>
                    <input
                      type="number"
                      value={newResepItem.jumlah}
                      onChange={(e) => setNewResepItem({ ...newResepItem, jumlah: e.target.value === '' ? '' : parseInt(e.target.value) || '' })}
                      placeholder="Masukkan jumlah"
                      min="1"
                      max={newResepItem.obat_id > 0 ? obatList.find(o => o.id === newResepItem.obat_id)?.stok || 0 : undefined}
                      className={styles.addResepFormInput}
                    />
                  </div>
                  <div className={styles.addResepFormGroup}>
                    <label className={styles.addResepFormLabel}>
                      Aturan Pakai
                    </label>
                    <input
                      type="text"
                      value={newResepItem.aturan_pakai}
                      onChange={(e) => setNewResepItem({ ...newResepItem, aturan_pakai: e.target.value })}
                      placeholder="Contoh: 3x1 sesudah makan"
                      className={styles.addResepFormInput}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddResep}
                    disabled={addingResep || newResepItem.obat_id === 0}
                    className={styles.addResepFormButton}
                  >
                    {addingResep ? 'Menambah...' : 'Tambah'}
                  </button>
                </div>
              </div>
            )}

            {resepDetails.length === 0 ? (
              <p className={styles.emptyResep}>Tidak ada resep obat</p>
            ) : (
              <div className={styles.resepTable}>
                <table>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Obat</th>
                      <th>Jumlah</th>
                      <th>Satuan</th>
                      <th>Aturan Pakai</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resepDetails.map((item, index) => {
                      const isEditing = editingResep?.id === item.id;
                      
                      return (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td>{item.nama_obat}</td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingResep.jumlah}
                                onChange={(e) => handleResepChange('jumlah', e.target.value)}
                                min="1"
                                style={{ width: '80px', padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px' }}
                              />
                            ) : (
                              item.jumlah
                            )}
                          </td>
                          <td>{item.satuan}</td>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingResep.aturan_pakai}
                                onChange={(e) => handleResepChange('aturan_pakai', e.target.value)}
                                placeholder="Aturan pakai"
                                style={{ width: '200px', padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px' }}
                              />
                            ) : (
                              item.aturan_pakai || '-'
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleUpdateResep(item.id)}
                                  disabled={updating === item.id}
                                  style={{
                                    padding: '4px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    cursor: updating === item.id ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    opacity: updating === item.id ? 0.6 : 1
                                  }}
                                >
                                  {updating === item.id ? 'Menyimpan...' : 'Simpan'}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={updating === item.id}
                                  style={{
                                    padding: '4px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    cursor: updating === item.id ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    opacity: updating === item.id ? 0.6 : 1
                                  }}
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleEditResep(item)}
                                  style={{
                                    padding: '4px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: '#0ea5e9',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteResep(item.id)}
                                  disabled={deletingResep === item.id}
                                  style={{
                                    padding: '4px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: deletingResep === item.id ? '#9ca3af' : '#ef4444',
                                    color: 'white',
                                    cursor: deletingResep === item.id ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    opacity: deletingResep === item.id ? 0.6 : 1
                                  }}
                                >
                                  {deletingResep === item.id ? 'Menghapus...' : 'Hapus'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleSelesai}
              disabled={loading || resepDetails.length === 0}
              className={styles.btnPrimary}
            >
              {loading ? 'Memproses...' : 'Konfirmasi Obat Diberikan'}
            </button>
            <button
              type="button"
              onClick={async () => {
                // Unlock patient before clearing selection
                if (selectedPatient) {
                  try {
                    const user_name = localStorage.getItem('user_name') || '';
                    await fetch(`/api/patients/${selectedPatient.id}/lock`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ user_name }),
                    });
                  } catch (error) {
                    console.error('Error unlocking patient:', error);
                  }
                }
                
                setSelectedPatient(null);
                setResepDetails([]);
              }}
              className={styles.btnReset}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <p>Copyright © 2025 PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </div>
  );
}

