'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import styles from './page.module.css';

interface Patient {
  id: number;
  tanggal_pemeriksaan: string | null;
  nama: string;
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
  anamnesa: string | null;
  pemeriksaan_fisik: string | null;
  hpht: string | null;
  hpl: string | null;
  tfu: number | null;
  djj_anak: number | null;
  diagnosa: string | null;
  terapi: string | null;
  dokter_pemeriksa: string | null;
  created_at: string;
}

export default function RekapitulasiPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('dokter_pemeriksa');
    localStorage.removeItem('tanggal_pemeriksaan');
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

  return (
    <div className={styles.container}>
     
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Rekapitulasi Data Pasien</h1>
        <div className={styles.pageHeaderActions}>
          <button 
            onClick={() => router.push('/')}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className={styles.footer}>
        <p>Copyright © 2025 PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </div>
  );
}

