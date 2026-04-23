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
  tempat_lahir?: string | null;
  jabatan?: string | null;
  unit?: string | null;
  alamat: string;
  email?: string | null;
  lokasi_penugasan?: string | null;
  tanggal_mulai_tugas?: string | null;
  durasi_penugasan?: string | null;
  tinggi_badan: number | null;
  berat_badan: number | null;
  imt: number | null;
  tensi_darah_sistol: number | null;
  tensi_darah_diastol: number | null;
  denyut_nadi: number | null;
  suhu_tubuh: number | null;
  laju_pernapasan: number | null;
  kolesterol: number | null;
  gds: number | null;
  as_urat: number | null;
  keluhan: string | null;

  // Riwayat Penyakit Dahulu
  riwayat_malaria: string | null;
  riwayat_malaria_ket: string | null;
  riwayat_kronis: string | null;
  riwayat_kronis_ket: string | null;
  riwayat_rawat_inap: string | null;
  riwayat_rawat_inap_ket: string | null;
  riwayat_alergi_obat: string | null;
  riwayat_alergi_obat_ket: string | null;
  riwayat_merokok: string | null;
  riwayat_merokok_ket: string | null;
  riwayat_alkohol: string | null;
  riwayat_alkohol_ket: string | null;
  riwayat_obat_rutin: string | null;
  riwayat_obat_rutin_ket: string | null;
  catatan_khusus: string | null;

  // Pemeriksaan Fisik (Relevan)
  fisik_keadaan_umum: string | null;
  fisik_keadaan_umum_ket: string | null;
  fisik_kepala_leher: string | null;
  fisik_jantung: string | null;
  fisik_paru: string | null;
  fisik_abdomen: string | null;
  fisik_ekstremitas: string | null;
  fisik_kulit: string | null;
  fisik_lain_lain: string | null;

  anamnesa?: string | null;
  pemeriksaan_fisik?: string | null;
  hpht?: string | null;
  hpl?: string | null;
  tfu?: number | null;
  djj_anak?: number | null;
  alergi?: string | null;
  kesimpulan_kelayakan: string | null;
  saran_medis: string | null;
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

  const initialFormData = {
    keluhan: '',
    riwayat_malaria: 'Tidak',
    riwayat_malaria_ket: '',
    riwayat_kronis: 'Tidak',
    riwayat_kronis_ket: '',
    riwayat_rawat_inap: 'Tidak',
    riwayat_rawat_inap_ket: '',
    riwayat_alergi_obat: 'Tidak',
    riwayat_alergi_obat_ket: '',
    riwayat_merokok: 'Tidak',
    riwayat_merokok_ket: '',
    riwayat_alkohol: 'Tidak',
    riwayat_alkohol_ket: '',
    riwayat_obat_rutin: 'Tidak',
    riwayat_obat_rutin_ket: '',
    catatan_khusus: '',
    fisik_keadaan_umum: 'Baik',
    fisik_keadaan_umum_ket: '',
    fisik_kepala_leher: '',
    fisik_jantung: '',
    fisik_paru: '',
    fisik_abdomen: '',
    fisik_ekstremitas: '',
    fisik_kulit: '',
    fisik_lain_lain: '',
    anamnesa: '',
    pemeriksaan_fisik: '',
    hpht: '',
    hpl: '',
    tfu: '',
    djj_anak: '',
    alergi: '',
    kesimpulan_kelayakan: '',
    saran_medis: '',
  };

  const [formData, setFormData] = useState(initialFormData);

  const getNadiKet = (nadi: number | null) => {
    if (!nadi) return null;
    return (nadi < 60 || nadi > 100) ? 
      <span style={{ color: '#ef4444', fontWeight: 'bold' }}> (Abnormal)</span> : 
      <span style={{ color: '#10b981' }}> (Normal)</span>;
  };

  const getSuhuKet = (suhu: number | null) => {
    if (!suhu) return null;
    return (suhu < 36.0 || suhu > 37.5) ? 
      <span style={{ color: '#ef4444', fontWeight: 'bold' }}> (Abnormal)</span> : 
      <span style={{ color: '#10b981' }}> (Normal)</span>;
  };

  const getNapasKet = (napas: number | null) => {
    if (!napas) return null;
    return (napas < 12 || napas > 20) ? 
      <span style={{ color: '#ef4444', fontWeight: 'bold' }}> (Abnormal)</span> : 
      <span style={{ color: '#10b981' }}> (Normal)</span>;
  };

  const getIMTKet = (imt: number | null) => {
    if (!imt) return null;
    if (imt < 18.5) return <span style={{ color: '#ef4444', fontWeight: 'bold' }}> (Kurus)</span>;
    if (imt > 25.0) return <span style={{ color: '#ef4444', fontWeight: 'bold' }}> (Gemuk)</span>;
    return <span style={{ color: '#10b981' }}> (Normal)</span>;
  };

  const getTensiKet = (sis: number | null, dia: number | null) => {
    if (!sis || !dia) return null;
    return (sis >= 140 || dia >= 90) ? 
      <span style={{ color: '#ef4444', fontWeight: 'bold' }}> (Tinggi)</span> : 
      <span style={{ color: '#10b981' }}> (Normal)</span>;
  };

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
      keluhan: patient.keluhan || '',
      riwayat_malaria: patient.riwayat_malaria || 'Tidak',
      riwayat_malaria_ket: patient.riwayat_malaria_ket || '',
      riwayat_kronis: patient.riwayat_kronis || 'Tidak',
      riwayat_kronis_ket: patient.riwayat_kronis_ket || '',
      riwayat_rawat_inap: patient.riwayat_rawat_inap || 'Tidak',
      riwayat_rawat_inap_ket: patient.riwayat_rawat_inap_ket || '',
      riwayat_alergi_obat: patient.riwayat_alergi_obat || 'Tidak',
      riwayat_alergi_obat_ket: patient.riwayat_alergi_obat_ket || '',
      riwayat_merokok: patient.riwayat_merokok || 'Tidak',
      riwayat_merokok_ket: patient.riwayat_merokok_ket || '',
      riwayat_alkohol: patient.riwayat_alkohol || 'Tidak',
      riwayat_alkohol_ket: patient.riwayat_alkohol_ket || '',
      riwayat_obat_rutin: patient.riwayat_obat_rutin || 'Tidak',
      riwayat_obat_rutin_ket: patient.riwayat_obat_rutin_ket || '',
      catatan_khusus: patient.catatan_khusus || '',
      fisik_keadaan_umum: patient.fisik_keadaan_umum || 'Baik',
      fisik_keadaan_umum_ket: patient.fisik_keadaan_umum_ket || '',
      fisik_kepala_leher: patient.fisik_kepala_leher || '',
      fisik_jantung: patient.fisik_jantung || '',
      fisik_paru: patient.fisik_paru || '',
      fisik_abdomen: patient.fisik_abdomen || '',
      fisik_ekstremitas: patient.fisik_ekstremitas || '',
      fisik_kulit: patient.fisik_kulit || '',
      fisik_lain_lain: patient.fisik_lain_lain || '',
      anamnesa: patient.anamnesa || '',
      pemeriksaan_fisik: patient.pemeriksaan_fisik || '',
      hpht: patient.hpht || '',
      hpl: patient.hpl || '',
      tfu: patient.tfu?.toString() || '',
      djj_anak: patient.djj_anak?.toString() || '',
      alergi: patient.alergi || '',
      kesimpulan_kelayakan: patient.kesimpulan_kelayakan || '',
      saran_medis: patient.saran_medis || '',
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
          ...formData,
          tfu: parseFloat(formData.tfu) || null,
          djj_anak: parseInt(formData.djj_anak) || null,
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
        keluhan: '',
        riwayat_malaria: 'Tidak',
        riwayat_malaria_ket: '',
        riwayat_kronis: 'Tidak',
        riwayat_kronis_ket: '',
        riwayat_rawat_inap: 'Tidak',
        riwayat_rawat_inap_ket: '',
        riwayat_alergi_obat: 'Tidak',
        riwayat_alergi_obat_ket: '',
        riwayat_merokok: 'Tidak',
        riwayat_merokok_ket: '',
        riwayat_alkohol: 'Tidak',
        riwayat_alkohol_ket: '',
        riwayat_obat_rutin: 'Tidak',
        riwayat_obat_rutin_ket: '',
        catatan_khusus: '',
        fisik_keadaan_umum: 'Baik',
        fisik_keadaan_umum_ket: '',
        fisik_kepala_leher: '',
        fisik_jantung: '',
        fisik_paru: '',
        fisik_abdomen: '',
        fisik_ekstremitas: '',
        fisik_kulit: '',
        fisik_lain_lain: '',
        anamnesa: '',
        pemeriksaan_fisik: '',
        hpht: '',
        hpl: '',
        tfu: '',
        djj_anak: '',
        alergi: '',
        kesimpulan_kelayakan: '',
        saran_medis: '',
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
                  {selectedPatient.imt && <li>IMT: {selectedPatient.imt} kg/m²{getIMTKet(selectedPatient.imt)}</li>}
                  {selectedPatient.tensi_darah_sistol && selectedPatient.tensi_darah_diastol && (
                    <li>Tensi: {selectedPatient.tensi_darah_sistol}/{selectedPatient.tensi_darah_diastol} mmHg{getTensiKet(selectedPatient.tensi_darah_sistol, selectedPatient.tensi_darah_diastol)}</li>
                  )}
                  {selectedPatient.denyut_nadi && <li>Nadi: {selectedPatient.denyut_nadi} x/menit{getNadiKet(selectedPatient.denyut_nadi)}</li>}
                  {selectedPatient.suhu_tubuh && <li>Suhu: {selectedPatient.suhu_tubuh} °C{getSuhuKet(selectedPatient.suhu_tubuh)}</li>}
                  {selectedPatient.laju_pernapasan && <li>Napas: {selectedPatient.laju_pernapasan} x/menit{getNapasKet(selectedPatient.laju_pernapasan)}</li>}
                  {selectedPatient.kolesterol && <li>Kolesterol: {selectedPatient.kolesterol} mg/dL</li>}
                  {selectedPatient.gds && <li>GDS: {selectedPatient.gds} mg/dL</li>}
                  {selectedPatient.as_urat && <li>As Urat: {selectedPatient.as_urat} mg/dL</li>}
                </ul>
              </div>
            </div>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. ANAMNESA & RIWAYAT PENYAKIT</h2>
            <div className={styles.formGroupFull} style={{ marginBottom: '20px' }}>
              <label><strong>A. Keluhan Saat Ini (jika ada)</strong></label>
              <textarea
                name="keluhan"
                value={formData.keluhan}
                onChange={handleChange}
                rows={3}
                className={styles.textarea}
                placeholder="Masukkan keluhan saat ini..."
              />
            </div>

            <div className={styles.tableContainer}>
              <label><strong>B. Riwayat Penyakit Dahulu</strong></label>
              <table className={styles.examTable}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>No.</th>
                    <th>Pertanyaan</th>
                    <th style={{ width: '150px' }}>Ya / Tidak</th>
                    <th>Keterangan (jika Ya)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'riwayat_malaria', label: 'Riwayat demam berulang / malaria sebelumnya' },
                    { id: 'riwayat_kronis', label: 'Riwayat penyakit kronis (jantung, paru, ginjal, hati, dll)' },
                    { id: 'riwayat_rawat_inap', label: 'Riwayat rawat inap / operasi' },
                    { id: 'riwayat_alergi_obat', label: 'Riwayat alergi obat / makanan / lainnya' },
                    { id: 'riwayat_merokok', label: 'Riwayat merokok (Lama, Jumlah/hari)' },
                    { id: 'riwayat_alkohol', label: 'Riwayat konsumsi alkohol (Lama, Frekuensi)' },
                    { id: 'riwayat_obat_rutin', label: 'Penggunaan obat rutin (Sebutkan)' },
                  ].map((item, index) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center' }}>{index + 1}.</td>
                      <td>{item.label}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <label style={{ cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name={item.id}
                              value="Ya"
                              checked={formData[item.id as keyof typeof formData] === 'Ya'}
                              onChange={handleChange}
                            /> Ya
                          </label>
                          <label style={{ cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name={item.id}
                              value="Tidak"
                              checked={formData[item.id as keyof typeof formData] === 'Tidak'}
                              onChange={handleChange}
                            /> Tidak
                          </label>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          name={`${item.id}_ket`}
                          value={formData[`${item.id}_ket` as keyof typeof formData]}
                          onChange={handleChange}
                          className={styles.tableInput}
                          placeholder="Masukkan keterangan..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.formGroupFull} style={{ marginTop: '20px' }}>
              <label><strong>CATATAN KHUSUS (WAJIB DIISI)</strong>: Berikan perhatian khusus pada riwayat penyakit berikut dan kendalinya: Gangguan Hati Berat, DM tidak terkontrol, HT tidak terkontrol.</label>
              <textarea
                name="catatan_khusus"
                value={formData.catatan_khusus}
                onChange={handleChange}
                rows={3}
                className={styles.textarea}
                placeholder="Rincian / Catatan..."
              />
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. PEMERIKSAAN FISIK (RELEVAN)</h2>
            <div className={styles.tableContainer}>
              <table className={styles.examTable}>
                <thead>
                  <tr>
                    <th style={{ width: '150px' }}>Sistem/Organ</th>
                    <th>Pemeriksaan</th>
                    <th style={{ width: '200px' }}>Hasil</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Keadaan Umum</strong></td>
                    <td>Kesadaran, tampak sakit</td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <label style={{ cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="fisik_keadaan_umum"
                            value="Baik"
                            checked={formData.fisik_keadaan_umum === 'Baik'}
                            onChange={handleChange}
                          /> Baik
                        </label>
                        <label style={{ cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="fisik_keadaan_umum"
                            value="Kurang Baik"
                            checked={formData.fisik_keadaan_umum === 'Kurang Baik'}
                            onChange={handleChange}
                          /> Kurang Baik
                        </label>
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        name="fisik_keadaan_umum_ket"
                        value={formData.fisik_keadaan_umum_ket}
                        onChange={handleChange}
                        className={styles.tableInput}
                        placeholder="..."
                      />
                    </td>
                  </tr>
                  {[
                    { id: 'fisik_kepala_leher', label: 'Kepala & Leher', detail: 'Mata, THT, kelenjar getah bening, tiroid' },
                    { id: 'fisik_jantung', label: 'Jantung', detail: 'Inspeksi, auskultasi' },
                    { id: 'fisik_paru', label: 'Paru', detail: 'Inspeksi, perkusi, auskultasi' },
                    { id: 'fisik_abdomen', label: 'Abdomen', detail: 'Inspeksi, palpasi, hepar, lien' },
                    { id: 'fisik_ekstremitas', label: 'Ekstremitas', detail: 'Edema, deformitas, kekuatan otot' },
                    { id: 'fisik_kulit', label: 'Kulit', detail: 'Lesi, ruam, tanda infeksi' },
                    { id: 'fisik_lain_lain', label: 'Lain-lain', detail: 'Temuan klinis lain yang relevan' },
                  ].map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.label}</strong></td>
                      <td>{item.detail}</td>
                      <td colSpan={2}>
                        <input
                          type="text"
                          name={item.id}
                          value={formData[item.id as keyof typeof formData]}
                          onChange={handleChange}
                          className={styles.tableInput}
                          placeholder="Hasil & Keterangan..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. KESIMPULAN KELAYAKAN TUGAS</h2>
            <p>Berdasarkan hasil pemeriksaan, yang bersangkutan dinyatakan:</p>
            <div className={styles.fitnessContainer} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
              <label className={`${styles.fitnessCard} ${formData.kesimpulan_kelayakan === 'FIT' ? styles.active : ''}`}>
                <input
                  type="radio"
                  name="kesimpulan_kelayakan"
                  value="FIT"
                  checked={formData.kesimpulan_kelayakan === 'FIT'}
                  onChange={handleChange}
                />
                <div className={styles.fitnessTitle}>FIT (Layak)</div>
                <div className={styles.fitnessDesc}>Dapat melaksanakan penugasan tanpa pembatasan.</div>
              </label>
              <label className={`${styles.fitnessCard} ${formData.kesimpulan_kelayakan === 'FIT WITH NOTE' ? styles.active : ''}`}>
                <input
                  type="radio"
                  name="kesimpulan_kelayakan"
                  value="FIT WITH NOTE"
                  checked={formData.kesimpulan_kelayakan === 'FIT WITH NOTE'}
                  onChange={handleChange}
                />
                <div className={styles.fitnessTitle}>FIT WITH NOTE (Layak dengan Catatan)</div>
                <div className={styles.fitnessDesc}>Dapat melaksanakan penugasan dengan catatan / syarat tertentu (terlampir).</div>
              </label>
              <label className={`${styles.fitnessCard} ${formData.kesimpulan_kelayakan === 'UNFIT' ? styles.active : ''}`}>
                <input
                  type="radio"
                  name="kesimpulan_kelayakan"
                  value="UNFIT"
                  checked={formData.kesimpulan_kelayakan === 'UNFIT'}
                  onChange={handleChange}
                />
                <div className={styles.fitnessTitle}>UNFIT (Tidak Layak)</div>
                <div className={styles.fitnessDesc}>Tidak layak melaksanakan penugasan untuk sementara / permanen.</div>
              </label>
            </div>
            <div className={styles.formGroupFull}>
              <label><strong>Catatan / Saran Medis:</strong></label>
              <textarea
                name="saran_medis"
                value={formData.saran_medis}
                onChange={handleChange}
                rows={3}
                className={styles.textarea}
                placeholder="Masukkan saran medis..."
              />
            </div>
          </section>

          {/* <section className={styles.section}>
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
          </section> */}

          {/* <section className={styles.section}>
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
          </section> */}

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
                setFormData(initialFormData);
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
        <p>Copyright © {new Date().getFullYear()} PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </div>
  );
}

