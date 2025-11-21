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
  diagnosa: string | null;
  resep: string | null;
  status: string;
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

export default function FarmasiPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [resepDetails, setResepDetails] = useState<ResepDetail[]>([]);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'farmasi') {
      router.push('/login');
    } else {
      fetchPatients();
    }
  }, [router]);

  const fetchPatients = async () => {
    try {
      setFetching(true);
      const tanggalPraktik = localStorage.getItem('tanggal_praktik');
      if (!tanggalPraktik) {
        setMessage({ type: 'error', text: 'Tanggal Praktik tidak ditemukan. Silakan login ulang.' });
        return;
      }
      
      // Filter berdasarkan tanggal praktik (semua pasien di tanggal tersebut)
      const response = await fetch(`/api/patients?status=dokter&startDate=${tanggalPraktik}&endDate=${tanggalPraktik}`);
      const result = await response.json();
      if (result.success) {
        setPatients(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setMessage({ type: 'error', text: 'Gagal memuat data pasien' });
    } finally {
      setFetching(false);
    }
  };

  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setMessage(null);
    
    // Fetch resep details
    try {
      const response = await fetch(`/api/resep?patient_id=${patient.id}`);
      const result = await response.json();
      if (result.success) {
        setResepDetails(result.data);
      }
    } catch (error) {
      console.error('Error fetching resep:', error);
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
        fetchPatients();
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
        <h2 className={styles.sectionTitle}>Daftar Pasien Menunggu Obat</h2>
        {fetching ? (
          <p>Memuat data...</p>
        ) : patients.length === 0 ? (
          <p className={styles.empty}>Tidak ada pasien yang menunggu obat</p>
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
                  {patient.diagnosa && (
                    <span className={styles.diagnosa}>Diagnosa: {patient.diagnosa}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
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
            <h2 className={styles.sectionTitle}>DETAIL RESEP OBAT</h2>
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
              onClick={() => {
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

