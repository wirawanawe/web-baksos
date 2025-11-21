'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import styles from './page.module.css';

interface Patient {
  id: number;
  nama: string;
  no_ktp: string;
  no_telepon: string;
  jenis_kelamin: string;
  usia: number;
  alamat: string;
  tinggi_badan: number | null;
  berat_badan: number | null;
  tensi_darah_sistol: number | null;
  tensi_darah_diastol: number | null;
  kolesterol: number | null;
  gds: number | null;
  as_urat: number | null;
  keluhan: string | null;
  dokter_pemeriksa: string | null;
  status: string;
}

interface Obat {
  id: number;
  nama_obat: string;
  satuan: string;
  stok: number;
}

interface ResepItem {
  obat_id: number;
  jumlah: number;
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
  
  const [formData, setFormData] = useState({
    anamnesa: '',
    pemeriksaan_fisik: '',
    hpht: '',
    hpl: '',
    tfu: '',
    djj_anak: '',
    diagnosa: '',
    terapi: '',
  });

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'dokter') {
      router.push('/login');
    } else {
      fetchPatients();
      fetchObat();
    }
  }, [router]);

  const fetchPatients = async () => {
    try {
      setFetching(true);
      const tanggalPraktik = localStorage.getItem('tanggal_praktik');
      const userName = localStorage.getItem('user_name'); // Nama dokter yang login
      if (!tanggalPraktik || !userName) {
        setMessage({ type: 'error', text: 'Data login tidak lengkap. Silakan login ulang.' });
        return;
      }
      
      // Debug: log untuk melihat parameter yang dikirim
      console.log('Fetching patients:', { tanggalPraktik, userName });
      
      // Dokter melihat pasien yang didaftarkan untuk dirinya sendiri di tanggal praktik tersebut
      // Ambil semua pasien (tanpa filter status), lalu filter di client untuk status 'perawat' atau 'pendaftaran'
      const url = `/api/patients?startDate=${tanggalPraktik}&endDate=${tanggalPraktik}&dokter_pemeriksa=${encodeURIComponent(userName)}`;
      console.log('API URL:', url);
      
      const response = await fetch(url);
      const result = await response.json();
      
      console.log('API Response:', result);
      
      if (result.success) {
        // Filter di client side untuk hanya menampilkan pasien dengan status 'perawat' (sudah diperiksa perawat)
        // atau 'pendaftaran' (baru didaftarkan, belum diperiksa perawat)
        const filtered = (result.data || []).filter((p: Patient) => 
          p.status === 'perawat' || p.status === 'pendaftaran'
        );
        
        console.log('Total patients found:', result.data?.length || 0);
        console.log('Filtered patients (perawat or pendaftaran):', filtered.length);
        
        // Debug: tampilkan semua pasien yang ditemukan untuk melihat dokter_pemeriksa mereka
        if (result.data && result.data.length > 0) {
          console.log('All patients found:', result.data.map((p: any) => ({ 
            id: p.id, 
            nama: p.nama, 
            dokter_pemeriksa: p.dokter_pemeriksa,
            status: p.status 
          })));
        }
        
        setPatients(filtered);
        
        // Jika tidak ada pasien, tampilkan pesan yang lebih informatif
        if (!result.data || result.data.length === 0) {
          console.log('No patients found. Possible reasons:');
          console.log('- Status is not "perawat" (patient needs to be examined by nurse first)');
          console.log('- Date mismatch (tanggal_pemeriksaan:', tanggalPraktik, ')');
          console.log('- Doctor name mismatch (searching for:', userName, ')');
          
          // Coba fetch tanpa filter dokter untuk melihat semua pasien di tanggal tersebut
          const allPatientsUrl = `/api/patients?status=perawat&startDate=${tanggalPraktik}&endDate=${tanggalPraktik}`;
          console.log('Fetching all patients on this date for debugging:', allPatientsUrl);
          const allResponse = await fetch(allPatientsUrl);
          const allResult = await allResponse.json();
          if (allResult.success && allResult.data && allResult.data.length > 0) {
            console.log('All patients on this date with status "perawat":', allResult.data.map((p: any) => ({ 
              id: p.id, 
              nama: p.nama, 
              dokter_pemeriksa: p.dokter_pemeriksa,
              status: p.status,
              tanggal_pemeriksaan: p.tanggal_pemeriksaan
            })));
            
            // Cek apakah ada pasien dengan nama dokter yang mirip
            const cleanSearchName = userName.replace(/^Dr\.\s*/i, '').replace(/,\s*Sp\.[A-Z]+$/i, '').trim();
            const similarPatients = allResult.data.filter((p: any) => {
              const dbDokterName = (p.dokter_pemeriksa || '').trim();
              return dbDokterName.includes(cleanSearchName) || cleanSearchName.includes(dbDokterName);
            });
            if (similarPatients.length > 0) {
              console.log('Found patients with similar doctor name:', similarPatients.map((p: any) => ({ 
                id: p.id, 
                nama: p.nama, 
                dokter_pemeriksa: p.dokter_pemeriksa,
                status: p.status
              })));
            }
          } else {
            console.log('No patients found with status "perawat" on this date');
            
            // Coba cari pasien dengan status 'pendaftaran' untuk debugging
            const pendaftaranUrl = `/api/patients?status=pendaftaran&startDate=${tanggalPraktik}&endDate=${tanggalPraktik}`;
            const pendaftaranResponse = await fetch(pendaftaranUrl);
            const pendaftaranResult = await pendaftaranResponse.json();
            if (pendaftaranResult.success && pendaftaranResult.data && pendaftaranResult.data.length > 0) {
              console.log('Found patients with status "pendaftaran" (not yet examined by nurse):', pendaftaranResult.data.map((p: any) => ({ 
                id: p.id, 
                nama: p.nama, 
                dokter_pemeriksa: p.dokter_pemeriksa,
                status: p.status
              })));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setMessage({ type: 'error', text: 'Gagal memuat data pasien' });
    } finally {
      setFetching(false);
    }
  };

  const fetchObat = async () => {
    try {
      const response = await fetch('/api/obat', {
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

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      anamnesa: '',
      pemeriksaan_fisik: '',
      hpht: '',
      hpl: '',
      tfu: '',
      djj_anak: '',
      diagnosa: '',
      terapi: '',
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
    setResepItems([...resepItems, { obat_id: 0, jumlah: 1, aturan_pakai: '' }]);
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
    if (field === 'jumlah' && currentItem.obat_id > 0) {
      const obat = obatList.find(o => o.id === currentItem.obat_id);
      if (obat && parseInt(value) > obat.stok) {
        setMessage({ 
          type: 'error', 
          text: `Jumlah ${obat.nama_obat} tidak boleh melebihi stok tersedia (${obat.stok})` 
        });
        return;
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
        if (item.jumlah > obat.stok) {
          setMessage({ 
            type: 'error', 
            text: `Stok ${obat.nama_obat} tidak cukup. Stok tersedia: ${obat.stok}, jumlah yang diminta: ${item.jumlah}` 
          });
          return;
        }
      }
    }

    setLoading(true);
    setMessage(null);

    try {
      const user_name = localStorage.getItem('user_name') || '';
      
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
          terapi: formData.terapi || null,
          resep: resepItems.length > 0 ? JSON.stringify(resepItems) : null,
          dokter_pemeriksa: user_name,
          status: 'dokter',
        }),
      });

      const updateResult = await updateResponse.json();

      if (!updateResult.success) {
        throw new Error(updateResult.message);
      }

      // Save resep details
      if (resepItems.length > 0) {
        const resepErrors: string[] = [];
        for (const item of resepItems) {
          if (item.obat_id > 0) {
            const resepResponse = await fetch('/api/resep', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                patient_id: selectedPatient.id,
                obat_id: item.obat_id,
                jumlah: item.jumlah,
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

      setMessage({ type: 'success', text: 'Data pemeriksaan dokter berhasil disimpan!' });
      setFormData({
        anamnesa: '',
        pemeriksaan_fisik: '',
        hpht: '',
        hpl: '',
        tfu: '',
        djj_anak: '',
        diagnosa: '',
        terapi: '',
      });
      setResepItems([]);
      setSelectedPatient(null);
      fetchPatients();
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
        <h2 className={styles.sectionTitle}>Daftar Pasien Menunggu Pemeriksaan Dokter</h2>
        {fetching ? (
          <p>Memuat data...</p>
        ) : patients.length === 0 ? (
          <p className={styles.empty}>Tidak ada pasien yang menunggu pemeriksaan dokter</p>
        ) : (
          <div className={styles.patientList}>
            {patients.map((patient) => (
              <div
                key={patient.id}
                className={`${styles.patientCard} ${selectedPatient?.id === patient.id ? styles.selected : ''}`}
                onClick={() => handleSelectPatient(patient)}
              >
                <div className={styles.patientInfo}>
                  <strong>{patient.nama}</strong>
                  <span>Usia: {patient.usia} tahun | {patient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
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
                <label htmlFor="tfu">TFU</label>
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
                <label htmlFor="djj_anak">DJJ Anak</label>
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
                          onChange={(e) => handleResepChange(index, 'jumlah', parseInt(e.target.value) || 1)}
                          min="1"
                          max={item.obat_id > 0 ? obatList.find(o => o.id === item.obat_id)?.stok || 0 : undefined}
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
              onClick={() => {
                setSelectedPatient(null);
                setFormData({
                  anamnesa: '',
                  pemeriksaan_fisik: '',
                  hpht: '',
                  hpl: '',
                  tfu: '',
                  djj_anak: '',
                  diagnosa: '',
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

