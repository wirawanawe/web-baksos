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
  tinggi_badan?: number | null;
  berat_badan?: number | null;
  imt?: number | null;
  tensi_darah_sistol?: number | null;
  tensi_darah_diastol?: number | null;
  denyut_nadi?: number | null;
  suhu_tubuh?: number | null;
  laju_pernapasan?: number | null;
  kolesterol?: number | null;
  gds?: number | null;
  as_urat?: number | null;
  dokter_pemeriksa: string | null;
  status: string;
  locked_by?: string | null;
  locked_at?: string | null;
}

export default function PerawatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const itemsPerPage = 10;
  
  const initialFormData = {
    tinggi_badan: '',
    berat_badan: '',
    imt: '',
    tensi_darah_sistol: '',
    tensi_darah_diastol: '',
    denyut_nadi: '',
    suhu_tubuh: '',
    laju_pernapasan: '',
    kolesterol: '',
    gds: '',
    as_urat: '',
  };

  const [formData, setFormData] = useState(initialFormData);

  const fetchPatients = async (page: number = currentPage, search: string = searchTerm) => {
    try {
      setFetching(true);
      const tanggalPraktik = localStorage.getItem('tanggal_praktik');
      const lokasiId = localStorage.getItem('lokasi_id');
      
      if (!tanggalPraktik) {
        setMessage({ type: 'error', text: 'Tanggal Praktik tidak ditemukan. Silakan login ulang.' });
        return;
      }
      
      let url = `/api/patients?status=pendaftaran&startDate=${tanggalPraktik}&endDate=${tanggalPraktik}&page=${page}&limit=${itemsPerPage}`;
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

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'perawat') {
      router.push('/login');
    } else {
      fetchPatients();
      
      const refreshInterval = setInterval(() => {
        if (!selectedPatient) {
          fetchPatients(currentPage, searchTerm);
        }
      }, 30000);
      
      return () => clearInterval(refreshInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, selectedPatient, currentPage, searchTerm]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      tinggi_badan: patient.tinggi_badan?.toString() || '',
      berat_badan: patient.berat_badan?.toString() || '',
      imt: patient.imt?.toString() || '',
      tensi_darah_sistol: patient.tensi_darah_sistol?.toString() || '',
      tensi_darah_diastol: patient.tensi_darah_diastol?.toString() || '',
      denyut_nadi: patient.denyut_nadi?.toString() || '',
      suhu_tubuh: patient.suhu_tubuh?.toString() || '',
      laju_pernapasan: patient.laju_pernapasan?.toString() || '',
      kolesterol: patient.kolesterol?.toString() || '',
      gds: patient.gds?.toString() || '',
      as_urat: patient.as_urat?.toString() || '',
    });
    setMessage(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      if (name === 'tinggi_badan' || name === 'berat_badan') {
        const tb = parseFloat(name === 'tinggi_badan' ? value : prev.tinggi_badan);
        const bb = parseFloat(name === 'berat_badan' ? value : prev.berat_badan);
        
        if (tb > 0 && bb > 0) {
          const tbMeter = tb / 100;
          const imt = bb / (tbMeter * tbMeter);
          newData.imt = imt.toFixed(2);
        } else {
          newData.imt = '';
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('Pilih pasien terlebih dahulu!');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tinggi_badan: parseFloat(formData.tinggi_badan) || null,
          berat_badan: parseFloat(formData.berat_badan) || null,
          imt: parseFloat(formData.imt) || null,
          tensi_darah_sistol: parseInt(formData.tensi_darah_sistol) || null,
          tensi_darah_diastol: parseInt(formData.tensi_darah_diastol) || null,
          denyut_nadi: parseInt(formData.denyut_nadi) || null,
          suhu_tubuh: parseFloat(formData.suhu_tubuh) || null,
          laju_pernapasan: parseInt(formData.laju_pernapasan) || null,
          kolesterol: parseFloat(formData.kolesterol) || null,
          gds: parseFloat(formData.gds) || null,
          as_urat: parseFloat(formData.as_urat) || null,
          status: 'perawat',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Data pemeriksaan perawat berhasil disimpan!' });
        setFormData({
          tinggi_badan: '',
          berat_badan: '',
          imt: '',
          tensi_darah_sistol: '',
          tensi_darah_diastol: '',
          denyut_nadi: '',
          suhu_tubuh: '',
          laju_pernapasan: '',
          kolesterol: '',
          gds: '',
          as_urat: '',
        });
        setSelectedPatient(null);
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
        <h2 className={styles.sectionTitle}>Daftar Pasien Menunggu Pemeriksaan</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                minWidth: '200px'
              }}
            />
          </div>
        </div>
        {fetching ? (
          <p>Memuat data...</p>
        ) : patients.length === 0 ? (
          <p className={styles.empty}>Tidak ada pasien yang menunggu pemeriksaan{searchTerm ? ` dengan kata kunci "${searchTerm}"` : ''}</p>
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
                    {patient.dokter_pemeriksa && (
                      <span style={{ color: '#666', fontSize: '0.9em' }}>Dokter: {patient.dokter_pemeriksa}</span>
                    )}
                  <span className={styles.address}>{patient.alamat}</span>
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
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>PEMERIKSAAN TANDA VITAL & ANTROPOMETRI</h2>
            
            <div className={styles.tableContainer} style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table className={styles.vitalTable} style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Parameter</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Hasil</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Satuan</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Nilai Rujukan</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Tekanan Darah (Tensi)</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        <input
                          type="number"
                          name="tensi_darah_sistol"
                          value={formData.tensi_darah_sistol}
                          onChange={handleChange}
                          placeholder="Sis"
                          style={{ width: '60px', padding: '5px', textAlign: 'center' }}
                        />
                        <span>/</span>
                        <input
                          type="number"
                          name="tensi_darah_diastol"
                          value={formData.tensi_darah_diastol}
                          onChange={handleChange}
                          placeholder="Dia"
                          style={{ width: '60px', padding: '5px', textAlign: 'center' }}
                        />
                      </div>
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>mmHg</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>&lt; 140/90 mmHg</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {formData.tensi_darah_sistol && formData.tensi_darah_diastol && (
                        (parseInt(formData.tensi_darah_sistol) >= 140 || parseInt(formData.tensi_darah_diastol) >= 90) ? 
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Tinggi</span> : 
                        <span style={{ color: '#10b981' }}>Normal</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Denyut Nadi</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                      <input
                        type="number"
                        name="denyut_nadi"
                        value={formData.denyut_nadi}
                        onChange={handleChange}
                        style={{ width: '80px', padding: '5px', textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>x/menit</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>60 - 100 x/menit</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {formData.denyut_nadi && (
                        (parseInt(formData.denyut_nadi) < 60 || parseInt(formData.denyut_nadi) > 100) ? 
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Abnormal</span> : 
                        <span style={{ color: '#10b981' }}>Normal</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Suhu Tubuh</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                      <input
                        type="number"
                        step="0.1"
                        name="suhu_tubuh"
                        value={formData.suhu_tubuh}
                        onChange={handleChange}
                        style={{ width: '80px', padding: '5px', textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>°C</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>36,0 - 37,5 °C</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {formData.suhu_tubuh && (
                        (parseFloat(formData.suhu_tubuh) < 36.0 || parseFloat(formData.suhu_tubuh) > 37.5) ? 
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Abnormal</span> : 
                        <span style={{ color: '#10b981' }}>Normal</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Laju Pernapasan</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                      <input
                        type="number"
                        name="laju_pernapasan"
                        value={formData.laju_pernapasan}
                        onChange={handleChange}
                        style={{ width: '80px', padding: '5px', textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>x/menit</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>12 - 20 x/menit</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {formData.laju_pernapasan && (
                        (parseInt(formData.laju_pernapasan) < 12 || parseInt(formData.laju_pernapasan) > 20) ? 
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Abnormal</span> : 
                        <span style={{ color: '#10b981' }}>Normal</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Berat Badan (BB)</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                      <input
                        type="number"
                        step="0.1"
                        name="berat_badan"
                        value={formData.berat_badan}
                        onChange={handleChange}
                        style={{ width: '80px', padding: '5px', textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>kg</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>-</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Tinggi Badan (TB)</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                      <input
                        type="number"
                        step="0.1"
                        name="tinggi_badan"
                        value={formData.tinggi_badan}
                        onChange={handleChange}
                        style={{ width: '80px', padding: '5px', textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>cm</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>-</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Indeks Massa Tubuh (IMT)</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                      <input
                        type="number"
                        step="0.01"
                        name="imt"
                        value={formData.imt}
                        readOnly
                        style={{ width: '80px', padding: '5px', textAlign: 'center', backgroundColor: '#f3f4f6' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>kg/m²</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>18,5 - 25,0</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {formData.imt && (
                        (parseFloat(formData.imt) < 18.5 || parseFloat(formData.imt) > 25.0) ? 
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{parseFloat(formData.imt) < 18.5 ? 'Kurus' : 'Gemuk'}</span> : 
                        <span style={{ color: '#10b981' }}>Normal</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: '12px', marginTop: '10px', fontStyle: 'italic' }}>
                Catatan: Interpretasi hasil antropometri sesuai kategori IMT (WHO Asia Pasifik).
              </p>
            </div>

            <h2 className={styles.sectionTitle}>PEMERIKSAAN PENUNJANG</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="kolesterol">Kolesterol (mg/dL)</label>
                <input
                  type="number"
                  id="kolesterol"
                  name="kolesterol"
                  value={formData.kolesterol}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Masukkan hasil kolesterol"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="gds">Gula Darah Sewaktu (GDS) (mg/dL)</label>
                <input
                  type="number"
                  id="gds"
                  name="gds"
                  value={formData.gds}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Masukkan hasil GDS"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="as_urat">Asam Urat (mg/dL)</label>
                <input
                  type="number"
                  id="as_urat"
                  name="as_urat"
                  value={formData.as_urat}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Masukkan hasil asam urat"
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
              {loading ? 'Menyimpan...' : 'Simpan Data Pemeriksaan'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPatient(null);
                setFormData(initialFormData);
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

