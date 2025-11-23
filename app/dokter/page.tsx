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
  tinggi_badan: number | null;
  berat_badan: number | null;
  tensi_darah_sistol: number | null;
  tensi_darah_diastol: number | null;
  kolesterol: number | null;
  gds: number | null;
  as_urat: number | null;
  keluhan: string | null;
  anamnesa?: string | null;
  pemeriksaan_fisik?: string | null;
  hpht?: string | null;
  hpl?: string | null;
  tfu?: number | null;
  djj_anak?: number | null;
  diagnosa?: string | null;
  alergi?: string | null;
  terapi?: string | null;
  dokter_pemeriksa: string | null;
  status: string;
  locked_by?: string | null;
  locked_at?: string | null;
}

interface Obat {
  id: number;
  nama_obat: string;
  satuan: string;
  stok: number;
}

interface ResepItem {
  obat_id: number;
  jumlah: number | string;
  aturan_pakai: string;
}

export default function DokterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [obatList, setObatList] = useState<Obat[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [resepItems, setResepItems] = useState<ResepItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const itemsPerPage = 10;
  
  const [formData, setFormData] = useState({
    anamnesa: '',
    pemeriksaan_fisik: '',
    hpht: '',
    hpl: '',
    tfu: '',
    djj_anak: '',
    diagnosa: '',
    alergi: '',
    terapi: '',
  });

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'dokter') {
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
  }, [router, selectedPatient, currentPage, searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPatients = async (page: number = currentPage, search: string = searchTerm) => {
    try {
      setFetching(true);
      const tanggalPraktik = localStorage.getItem('tanggal_praktik');
      const lokasiId = localStorage.getItem('lokasi_id');
      
      if (!tanggalPraktik) {
        setMessage({ type: 'error', text: 'Data login tidak lengkap. Silakan login ulang.' });
        return;
      }
      
      // Dokter melihat pasien dengan status 'perawat' (sudah diperiksa perawat)
      // Filter berdasarkan lokasi yang dipilih saat login dengan pagination dan search
      let url = `/api/patients?status=perawat&startDate=${tanggalPraktik}&endDate=${tanggalPraktik}&page=${page}&limit=${itemsPerPage}`;
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
        cache: 'no-store', // Prevent caching
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Obat fetch result:', result); // Debug log
      
      if (result.success && result.data) {
        console.log('Obat list count:', result.data.length); // Debug log
        console.log('Obat list:', result.data); // Debug log
        setObatList(Array.isArray(result.data) ? result.data : []);
      } else {
        console.error('Failed to fetch obat:', result.message);
        setObatList([]);
        setMessage({ type: 'error', text: 'Gagal memuat daftar obat: ' + (result.message || 'Unknown error') });
      }
    } catch (error: any) {
      console.error('Error fetching obat:', error);
      setObatList([]);
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat memuat daftar obat: ' + error.message });
    }
  };

  const handleSelectPatient = async (patient: Patient) => {
    const user_name = localStorage.getItem('user_name') || '';
    
    // Update locked_by to track current doctor (without strict lock)
    // API will return warning if patient is being processed by another doctor
    try {
      const lockResponse = await fetch(`/api/patients/${patient.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name, user_role: 'dokter' }),
      });
      
      const lockResult = await lockResponse.json();
      
      // Show warning if patient is being processed by another doctor
      if (lockResult.warning && lockResult.warning.locked_by) {
        setMessage({ 
          type: 'error', 
          text: `⚠️ Peringatan: Pasien sedang diperiksa oleh ${lockResult.warning.locked_by}. Pastikan tidak terjadi duplikasi pemeriksaan.` 
        });
      } else {
        setMessage(null);
      }
    } catch (error) {
      console.error('Error updating locked_by:', error);
      // Continue anyway
    }
    
    setSelectedPatient(patient);
    setFormData({
      anamnesa: patient.anamnesa || '',
      pemeriksaan_fisik: patient.pemeriksaan_fisik || '',
      hpht: patient.hpht || '',
      hpl: patient.hpl || '',
      tfu: patient.tfu?.toString() || '',
      djj_anak: patient.djj_anak?.toString() || '',
      diagnosa: patient.diagnosa || '',
      alergi: (patient as any).alergi || '',
      terapi: patient.terapi || '',
    });
    setResepItems([]);
    setMessage(null);
    // Refresh obat list when selecting patient
    if (obatList.length === 0) {
      fetchObat();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddResep = () => {
    setResepItems([...resepItems, { obat_id: 0, jumlah: '', aturan_pakai: '' }]);
  };

  const handleResepChange = (index: number, field: keyof ResepItem, value: any) => {
    const updated = [...resepItems];
    const currentItem = updated[index];
    
    // Validasi: tidak bisa memilih obat dengan stok 0
    if (field === 'obat_id' && value > 0) {
      const obat = obatList.find(o => o.id === value);
      if (obat && obat.stok === 0) {
        setMessage({ 
          type: 'error', 
          text: `Stok ${obat.nama_obat} sudah habis. Pilih obat lain.` 
        });
        return;
      }
    }
    
    // Validasi jumlah tidak boleh melebihi stok
    if (field === 'jumlah' && currentItem.obat_id > 0 && value !== '') {
      const jumlahNum = typeof value === 'string' ? parseInt(value) : value;
      if (!isNaN(jumlahNum as number)) {
        const obat = obatList.find(o => o.id === currentItem.obat_id);
        if (obat && jumlahNum > obat.stok) {
          setMessage({ 
            type: 'error', 
            text: `Jumlah ${obat.nama_obat} tidak boleh melebihi stok tersedia (${obat.stok})` 
          });
          return;
        }
      }
    }
    
    updated[index] = { ...updated[index], [field]: value };
    setResepItems(updated);
    setMessage(null);
  };

  const handleRemoveResep = (index: number) => {
    setResepItems(resepItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('Pilih pasien terlebih dahulu!');
      return;
    }

    // Validasi stok sebelum submit
    for (const item of resepItems) {
      if (item.obat_id > 0) {
        const obat = obatList.find(o => o.id === item.obat_id);
        if (!obat) {
          setMessage({ 
            type: 'error', 
            text: 'Obat tidak ditemukan. Silakan refresh halaman.' 
          });
          return;
        }
        if (obat.stok === 0) {
          setMessage({ 
            type: 'error', 
            text: `Stok ${obat.nama_obat} sudah habis. Hapus dari resep atau pilih obat lain.` 
          });
          return;
        }
        const jumlahNum = typeof item.jumlah === 'string' ? parseInt(item.jumlah) : item.jumlah;
        if (!jumlahNum || jumlahNum <= 0) {
          setMessage({ 
            type: 'error', 
            text: `Jumlah ${obat.nama_obat} harus diisi dan lebih dari 0` 
          });
          return;
        }
        if (jumlahNum > obat.stok) {
          setMessage({ 
            type: 'error', 
            text: `Stok ${obat.nama_obat} tidak cukup. Stok tersedia: ${obat.stok}, jumlah yang diminta: ${jumlahNum}` 
          });
          return;
        }
      }
    }

    setLoading(true);
    setMessage(null);

    try {
      const user_name = localStorage.getItem('user_name') || '';
      
      // Convert resepItems untuk memastikan jumlah adalah number
      const resepItemsToSave = resepItems.map(item => ({
        ...item,
        jumlah: typeof item.jumlah === 'string' ? parseInt(item.jumlah) || 1 : item.jumlah
      }));
      
      // Determine status based on whether there are resep items
      // If no resep → status = 'selesai' (patient is done)
      // If has resep → status = 'farmasi' (patient goes to pharmacy)
      const finalStatus = resepItemsToSave.length > 0 ? 'farmasi' : 'selesai';
      
      // Update patient data
      const updateResponse = await fetch(`/api/patients/${selectedPatient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anamnesa: formData.anamnesa || null,
          pemeriksaan_fisik: formData.pemeriksaan_fisik || null,
          hpht: formData.hpht || null,
          hpl: formData.hpl || null,
          tfu: parseFloat(formData.tfu) || null,
          djj_anak: parseInt(formData.djj_anak) || null,
          diagnosa: formData.diagnosa || null,
          alergi: formData.alergi || null,
          terapi: formData.terapi || null,
          resep: resepItemsToSave.length > 0 ? JSON.stringify(resepItemsToSave) : null,
          dokter_pemeriksa: user_name,
          status: finalStatus,
        }),
      });

      const updateResult = await updateResponse.json();

      if (!updateResult.success) {
        throw new Error(updateResult.message);
      }

      // Save resep details
      if (resepItemsToSave.length > 0) {
        const resepErrors: string[] = [];
        for (const item of resepItemsToSave) {
          if (item.obat_id > 0) {
            const resepResponse = await fetch('/api/resep', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pemeriksaan_id: selectedPatient.id,
                obat_id: item.obat_id,
                jumlah: typeof item.jumlah === 'string' ? parseInt(item.jumlah) || 1 : item.jumlah,
                aturan_pakai: item.aturan_pakai,
              }),
            });
            
            const resepResult = await resepResponse.json();
            if (!resepResult.success) {
              resepErrors.push(resepResult.message || 'Gagal menyimpan resep');
            }
          }
        }
        
        if (resepErrors.length > 0) {
          throw new Error(resepErrors.join('; '));
        }
      }

      const successMessage = resepItemsToSave.length > 0 
        ? 'Data pemeriksaan dokter berhasil disimpan! Pasien akan dikirim ke farmasi.'
        : 'Data pemeriksaan dokter berhasil disimpan! Pasien dinyatakan selesai berobat.';
      setMessage({ type: 'success', text: successMessage });
      setFormData({
        anamnesa: '',
        pemeriksaan_fisik: '',
        hpht: '',
        hpl: '',
        tfu: '',
        djj_anak: '',
        diagnosa: '',
        alergi: '',
        terapi: '',
      });
      setResepItems([]);
      
      // Clear locked_by after submit
      if (selectedPatient) {
        try {
          const user_name = localStorage.getItem('user_name') || '';
          await fetch(`/api/patients/${selectedPatient.id}/lock`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name }),
          });
        } catch (error) {
          console.error('Error clearing locked_by:', error);
        }
      }
      
      setSelectedPatient(null);
      fetchPatients(currentPage, searchTerm);
      fetchObat(); // Refresh daftar obat untuk menampilkan stok terbaru
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Terjadi kesalahan saat menyimpan data' });
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
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Daftar Pasien Menunggu Pemeriksaan Dokter</h2>
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
          <p className={styles.empty}>Tidak ada pasien yang menunggu pemeriksaan dokter{searchTerm ? ` dengan kata kunci "${searchTerm}"` : ''}</p>
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
                  {patient.keluhan && (
                    <span className={styles.keluhan}>Keluhan: {patient.keluhan}</span>
                  )}
                  {patient.tensi_darah_sistol && patient.tensi_darah_diastol && (
                    <span>Tensi: {patient.tensi_darah_sistol}/{patient.tensi_darah_diastol} mmHg</span>
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
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.selectedPatientInfo}>
            <h3>Pemeriksaan untuk: <strong>{selectedPatient.nama}</strong></h3>
            <div className={styles.patientData}>
              <div>
                <strong>Data dari Perawat:</strong>
                <ul>
                  {selectedPatient.tinggi_badan && <li>TB: {selectedPatient.tinggi_badan} cm</li>}
                  {selectedPatient.berat_badan && <li>BB: {selectedPatient.berat_badan} kg</li>}
                  {selectedPatient.tensi_darah_sistol && selectedPatient.tensi_darah_diastol && (
                    <li>Tensi: {selectedPatient.tensi_darah_sistol}/{selectedPatient.tensi_darah_diastol} mmHg</li>
                  )}
                  {selectedPatient.kolesterol && <li>Kolesterol: {selectedPatient.kolesterol} mg/dL</li>}
                  {selectedPatient.gds && <li>GDS: {selectedPatient.gds} mg/dL</li>}
                  {selectedPatient.as_urat && <li>As Urat: {selectedPatient.as_urat} mg/dL</li>}
                  {selectedPatient.keluhan && <li>Keluhan: {selectedPatient.keluhan}</li>}
                </ul>
              </div>
            </div>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>ANAMNESA</h2>
            <div className={styles.formGrid}>
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

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>PEMERIKSAAN FISIK</h2>
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
                <label htmlFor="hpht">HPHT (Tanggal)</label>
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
                <label htmlFor="hpl">HPL (Tanggal)</label>
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

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>DIAGNOSA</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroupFull}>
                <label htmlFor="diagnosa">Diagnosa</label>
                <textarea
                  id="diagnosa"
                  name="diagnosa"
                  value={formData.diagnosa}
                  onChange={handleChange}
                  rows={3}
                  className={styles.textarea}
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>ALERGI</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroupFull}>
                <label htmlFor="alergi">Alergi</label>
                <textarea
                  id="alergi"
                  name="alergi"
                  value={formData.alergi}
                  onChange={handleChange}
                  rows={3}
                  className={styles.textarea}
                  placeholder="Masukkan informasi alergi pasien (jika ada)"
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>TERAPI</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroupFull}>
                <label htmlFor="terapi">Terapi</label>
                <textarea
                  id="terapi"
                  name="terapi"
                  value={formData.terapi}
                  onChange={handleChange}
                  rows={3}
                  className={styles.textarea}
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.resepHeader}>
              <h2 className={styles.sectionTitle}>RESEP OBAT</h2>
              <div className={styles.resepHeaderInfo}>
                {obatList.length === 0 && (
                  <span className={styles.warningText}>⚠ Belum ada data obat di database</span>
                )}
                <button
                  type="button"
                  onClick={handleAddResep}
                  className={styles.btnAddResep}
                >
                  + Tambah Obat
                </button>
              </div>
            </div>
            {resepItems.length === 0 ? (
              <p className={styles.emptyResep}>
                Belum ada obat yang ditambahkan
                {obatList.length === 0 && (
                  <><br /><strong>Silakan tambahkan data obat di halaman Admin {'>'} Data Obat terlebih dahulu.</strong></>
                )}
              </p>
            ) : (
              <div className={styles.resepList}>
                {resepItems.map((item, index) => {
                  const selectedObat = item.obat_id > 0 ? obatList.find(o => o.id === item.obat_id) : null;
                  const isStokHabis = selectedObat && selectedObat.stok === 0;
                  
                  return (
                    <div key={index} className={styles.resepItem} style={isStokHabis ? { borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2' } : {}}>
                      {isStokHabis && (
                        <div style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                          ⚠ Stok {selectedObat?.nama_obat} sudah habis. Obat ini tidak bisa digunakan.
                        </div>
                      )}
                    <div className={styles.resepForm}>
                      <div className={styles.formGroup}>
                        <label>Nama Obat</label>
                        <select
                          value={item.obat_id}
                          onChange={(e) => handleResepChange(index, 'obat_id', parseInt(e.target.value))}
                          className={styles.input}
                          disabled={obatList.length === 0}
                        >
                          <option value="0">
                            {obatList.length === 0 
                              ? 'Belum ada data obat. Silakan tambahkan di halaman Data Obat.' 
                              : 'Pilih Obat'}
                          </option>
                          {obatList.length > 0 && obatList.map((obat) => (
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
                      <div className={styles.formGroup}>
                        <label>Jumlah</label>
                        <input
                          type="number"
                          value={item.jumlah}
                          onChange={(e) => handleResepChange(index, 'jumlah', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                          min="1"
                          max={item.obat_id > 0 ? obatList.find(o => o.id === item.obat_id)?.stok || 0 : undefined}
                          placeholder="Masukkan jumlah"
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Aturan Pakai</label>
                        <input
                          type="text"
                          value={item.aturan_pakai}
                          onChange={(e) => handleResepChange(index, 'aturan_pakai', e.target.value)}
                          placeholder="Contoh: 3x1 sesudah makan"
                          className={styles.input}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveResep(index)}
                        className={styles.btnRemove}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className={styles.formActions}>
            <button
              type="submit"
              disabled={loading}
              className={styles.btnPrimary}
            >
              {loading ? 'Menyimpan...' : 'Simpan Data Pemeriksaan'}
            </button>
            <button
              type="button"
              onClick={async () => {
                // Clear locked_by when canceling
                if (selectedPatient) {
                  try {
                    const user_name = localStorage.getItem('user_name') || '';
                    await fetch(`/api/patients/${selectedPatient.id}/lock`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ user_name }),
                    });
                  } catch (error) {
                    console.error('Error clearing locked_by:', error);
                  }
                }
                
                setSelectedPatient(null);
                setFormData({
                  anamnesa: '',
                  pemeriksaan_fisik: '',
                  hpht: '',
                  hpl: '',
                  tfu: '',
                  djj_anak: '',
                  diagnosa: '',
                  alergi: '',
                  terapi: '',
                });
                setResepItems([]);
              }}
              className={styles.btnReset}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      <div className={styles.footer}>
        <p>Copyright © 2025 PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </div>
  );
}

