'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import styles from './page.module.css';

interface Patient {
  id: number;
  tanggal_pemeriksaan: string | null;
  nama: string;
  no_ktp: string | null;
  no_telepon: string | null;
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
  anamnesa: string | null;
  pemeriksaan_fisik: string | null;
  hpht: string | null;
  hpl: string | null;
  tfu: number | null;
  djj_anak: number | null;
  diagnosa: string | null;
  terapi: string | null;
  resep: string | null;
  dokter_pemeriksa: string | null;
  status: string;
  created_at: string;
}

interface ResepDetail {
  id: number;
  patient_id: number;
  obat_id: number;
  jumlah: number;
  aturan_pakai: string;
  nama_obat: string;
  satuan: string;
}

export default function RekapitulasiPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [resepDetails, setResepDetails] = useState<ResepDetail[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('dokter_pemeriksa');
    localStorage.removeItem('tanggal_pemeriksaan');
    localStorage.removeItem('tanggal_praktik');
    localStorage.removeItem('dokter_id');
    router.push('/login');
  };

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/patients?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setPatients(result.data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleFilter = () => {
    fetchPatients();
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/patients/export?${params.toString()}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Data_Pasien_Baksos_${startDate || 'all'}_${endDate || new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Gagal mengekspor data');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewDetail = async (patient: Patient) => {
    setSelectedPatient(patient);
    setLoadingDetail(true);
    setResepDetails([]);

    try {
      // Fetch resep details
      const response = await fetch(`/api/resep?patient_id=${patient.id}`);
      const result = await response.json();
      if (result.success) {
        setResepDetails(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching resep:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedPatient(null);
    setResepDetails([]);
  };

  return (
    <div className={styles.container}>
     
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Rekapitulasi Data Pasien</h1>
        <div className={styles.pageHeaderActions}>
          <button 
            onClick={() => router.push('/admin')}
            className={styles.btnSecondary}
          >
            Kembali ke Form
          </button>
          <button 
            onClick={handleLogout}
            className={styles.btnLogout}
          >
            Keluar
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="startDate">Tanggal Mulai</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="endDate">Tanggal Akhir</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.filterActions}>
          <button onClick={handleFilter} className={styles.btnFilter}>
            Filter
          </button>
          <button onClick={handleExport} disabled={exporting} className={styles.btnExport}>
            {exporting ? 'Mengekspor...' : 'Export ke Excel'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Memuat data...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className={styles.empty}>
          <p>Tidak ada data pasien ditemukan</p>
        </div>
      ) : (
        <>
          <div className={styles.summary}>
            <p>Total Data: <strong>{patients.length}</strong> pasien</p>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal Pemeriksaan</th>
                  <th>Nama</th>
                  <th>JK</th>
                  <th>Usia</th>
                  <th>Alamat</th>
                  <th>TB/BB</th>
                  <th>Tensi</th>
                  <th>Diagnosa</th>
                  <th>Dokter</th>
                  <th>Tanggal Input</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient, index) => (
                  <tr key={patient.id}>
                    <td>{index + 1}</td>
                    <td className={styles.cellDate}>
                      {patient.tanggal_pemeriksaan 
                        ? new Date(patient.tanggal_pemeriksaan).toLocaleDateString('id-ID')
                        : '-'}
                    </td>
                    <td className={styles.cellName}>{patient.nama}</td>
                    <td>{patient.jenis_kelamin}</td>
                    <td>{patient.usia}</td>
                    <td className={styles.cellAddress}>{patient.alamat}</td>
                    <td>
                      {patient.tinggi_badan && patient.berat_badan
                        ? `${patient.tinggi_badan}cm / ${patient.berat_badan}kg`
                        : '-'}
                    </td>
                    <td>
                      {patient.tensi_darah_sistol && patient.tensi_darah_diastol
                        ? `${patient.tensi_darah_sistol}/${patient.tensi_darah_diastol}`
                        : '-'}
                    </td>
                    <td className={styles.cellText}>{patient.diagnosa || '-'}</td>
                    <td>{patient.dokter_pemeriksa || '-'}</td>
                    <td className={styles.cellDate}>{formatDate(patient.created_at)}</td>
                    <td>
                      <button
                        onClick={() => handleViewDetail(patient)}
                        className={styles.btnDetail}
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Detail Pasien */}
      {selectedPatient && (
        <div className={styles.modalOverlay} onClick={handleCloseDetail}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Detail Pemeriksaan Pasien</h2>
              <button onClick={handleCloseDetail} className={styles.modalClose}>×</button>
            </div>
            
            <div className={styles.modalBody}>
              {/* Data Pasien */}
              <section className={styles.detailSection}>
                <h3>Data Pasien</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <label>Nama:</label>
                    <span>{selectedPatient.nama}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>No. KTP:</label>
                    <span>{selectedPatient.no_ktp || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>No. Telepon:</label>
                    <span>{selectedPatient.no_telepon || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Jenis Kelamin:</label>
                    <span>{selectedPatient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Usia:</label>
                    <span>{selectedPatient.usia} tahun</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Alamat:</label>
                    <span>{selectedPatient.alamat}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Tanggal Pemeriksaan:</label>
                    <span>
                      {selectedPatient.tanggal_pemeriksaan 
                        ? new Date(selectedPatient.tanggal_pemeriksaan).toLocaleDateString('id-ID')
                        : '-'}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Status:</label>
                    <span>{selectedPatient.status || '-'}</span>
                  </div>
                </div>
              </section>

              {/* Data Pemeriksaan Perawat */}
              <section className={styles.detailSection}>
                <h3>Data Pemeriksaan Perawat</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <label>Tinggi Badan:</label>
                    <span>{selectedPatient.tinggi_badan ? `${selectedPatient.tinggi_badan} cm` : '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Berat Badan:</label>
                    <span>{selectedPatient.berat_badan ? `${selectedPatient.berat_badan} kg` : '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Tensi Darah:</label>
                    <span>
                      {selectedPatient.tensi_darah_sistol && selectedPatient.tensi_darah_diastol
                        ? `${selectedPatient.tensi_darah_sistol}/${selectedPatient.tensi_darah_diastol} mmHg`
                        : '-'}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Kolesterol:</label>
                    <span>{selectedPatient.kolesterol ? `${selectedPatient.kolesterol} mg/dL` : '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>GDS:</label>
                    <span>{selectedPatient.gds ? `${selectedPatient.gds} mg/dL` : '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>As Urat:</label>
                    <span>{selectedPatient.as_urat ? `${selectedPatient.as_urat} mg/dL` : '-'}</span>
                  </div>
                  {selectedPatient.keluhan && (
                    <div className={styles.detailItemFull}>
                      <label>Keluhan:</label>
                      <span>{selectedPatient.keluhan}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Data Pemeriksaan Dokter */}
              <section className={styles.detailSection}>
                <h3>Data Pemeriksaan Dokter</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <label>Dokter Pemeriksa:</label>
                    <span>{selectedPatient.dokter_pemeriksa || '-'}</span>
                  </div>
                  {selectedPatient.anamnesa && (
                    <div className={styles.detailItemFull}>
                      <label>Anamnesa:</label>
                      <span>{selectedPatient.anamnesa}</span>
                    </div>
                  )}
                  {selectedPatient.pemeriksaan_fisik && (
                    <div className={styles.detailItemFull}>
                      <label>Pemeriksaan Fisik:</label>
                      <span>{selectedPatient.pemeriksaan_fisik}</span>
                    </div>
                  )}
                  {selectedPatient.hpht && (
                    <div className={styles.detailItem}>
                      <label>HPHT:</label>
                      <span>{new Date(selectedPatient.hpht).toLocaleDateString('id-ID')}</span>
                    </div>
                  )}
                  {selectedPatient.hpl && (
                    <div className={styles.detailItem}>
                      <label>HPL:</label>
                      <span>{new Date(selectedPatient.hpl).toLocaleDateString('id-ID')}</span>
                    </div>
                  )}
                  {selectedPatient.tfu !== null && (
                    <div className={styles.detailItem}>
                      <label>TFU:</label>
                      <span>{selectedPatient.tfu} cm</span>
                    </div>
                  )}
                  {selectedPatient.djj_anak !== null && (
                    <div className={styles.detailItem}>
                      <label>DJJ Anak:</label>
                      <span>{selectedPatient.djj_anak}</span>
                    </div>
                  )}
                  {selectedPatient.diagnosa && (
                    <div className={styles.detailItemFull}>
                      <label>Diagnosa:</label>
                      <span>{selectedPatient.diagnosa}</span>
                    </div>
                  )}
                  {selectedPatient.terapi && (
                    <div className={styles.detailItemFull}>
                      <label>Terapi:</label>
                      <span>{selectedPatient.terapi}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Data Resep */}
              {loadingDetail ? (
                <section className={styles.detailSection}>
                  <p>Memuat data resep...</p>
                </section>
              ) : resepDetails.length > 0 ? (
                <section className={styles.detailSection}>
                  <h3>Resep Obat</h3>
                  <div className={styles.resepTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>Nama Obat</th>
                          <th>Jumlah</th>
                          <th>Satuan</th>
                          <th>Aturan Pakai</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resepDetails.map((item, index) => (
                          <tr key={item.id}>
                            <td>{index + 1}</td>
                            <td>{item.nama_obat}</td>
                            <td>{item.jumlah}</td>
                            <td>{item.satuan}</td>
                            <td>{item.aturan_pakai || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </div>

            <div className={styles.modalFooter}>
              <button onClick={handleCloseDetail} className={styles.btnClose}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <p>Copyright © 2025 PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </div>
  );
}

