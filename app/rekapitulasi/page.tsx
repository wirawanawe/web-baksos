'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { formatAge } from '@/lib/formatAge';
import styles from './page.module.css';

interface Patient {
  id: number;
  tanggal_pemeriksaan: string | null;
  nama: string;
  no_ktp: string | null;
  no_telepon: string | null;
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
  denyut_nadi: number | null;
  suhu_tubuh: number | null;
  laju_pernapasan: number | null;
  keluhan: string | null;
  anamnesa: string | null;
  pemeriksaan_fisik: string | null;
  hpht: string | null;
  hpl: string | null;
  tfu: number | null;
  djj_anak: number | null;
  alergi: string | null;
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
  fisik_keadaan_umum: string | null;
  fisik_keadaan_umum_ket: string | null;
  fisik_kepala_leher: string | null;
  fisik_jantung: string | null;
  fisik_paru: string | null;
  fisik_abdomen: string | null;
  fisik_ekstremitas: string | null;
  fisik_kulit: string | null;
  fisik_lain_lain: string | null;
  kesimpulan_kelayakan: string | null;
  saran_medis: string | null;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterJenisKelamin, setFilterJenisKelamin] = useState('');
  const [filterDokter, setFilterDokter] = useState('');
  const [filterLokasi, setFilterLokasi] = useState('');
  const [dokterList, setDokterList] = useState<{ nama_dokter: string }[]>([]);
  const [lokasiList, setLokasiList] = useState<{ id: number; nama_lokasi: string }[]>([]);
  const [fetchingDokter, setFetchingDokter] = useState(false);
  const [fetchingLokasi, setFetchingLokasi] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('dokter_pemeriksa');
    localStorage.removeItem('tanggal_pemeriksaan');
    localStorage.removeItem('tanggal_praktik');
    localStorage.removeItem('dokter_id');
    router.push('/login');
  };

  const fetchPatients = useCallback(async (page: number = currentPage) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', itemsPerPage.toString());

      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (filterStatus) {
        params.append('status', filterStatus);
      }
      if (filterJenisKelamin) {
        params.append('jenis_kelamin', filterJenisKelamin);
      }
      if (filterDokter) {
        params.append('dokter_pemeriksa', filterDokter);
      }
      if (filterLokasi) {
        params.append('lokasi_id', filterLokasi);
      }

      const response = await fetch(`/api/patients?${params.toString()}`);
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
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, currentPage, itemsPerPage, searchTerm, filterStatus, filterJenisKelamin, filterDokter, filterLokasi]);

  // Fetch unique doctors and locations for filter
  useEffect(() => {
    const fetchDokterList = async () => {
      try {
        setFetchingDokter(true);
        const response = await fetch('/api/dokter?aktif=true');
        const result = await response.json();
        if (result.success && result.data) {
          setDokterList(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching dokter list:', error);
      } finally {
        setFetchingDokter(false);
      }
    };

    const fetchLokasiList = async () => {
      try {
        setFetchingLokasi(true);
        const response = await fetch('/api/lokasi');
        const result = await response.json();
        if (result.success && result.data) {
          setLokasiList(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching lokasi list:', error);
      } finally {
        setFetchingLokasi(false);
      }
    };

    fetchDokterList();
    fetchLokasiList();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchPatients(currentPage);
  }, [startDate, endDate, currentPage, filterStatus, filterJenisKelamin, filterDokter, filterLokasi, searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilter = () => {
    setCurrentPage(1);
    fetchPatients(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterJenisKelamin('');
    setFilterDokter('');
    setFilterLokasi('');
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();

      // Filter by lokasi_id for superadmin (if filter selected)
      if (filterLokasi) {
        params.append('lokasi_id', filterLokasi);
      }

      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (filterStatus) {
        params.append('status', filterStatus);
      }
      if (filterJenisKelamin) {
        params.append('jenis_kelamin', filterJenisKelamin);
      }
      if (filterDokter) {
        params.append('dokter_pemeriksa', filterDokter);
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
      const response = await fetch(`/api/resep?pemeriksaan_id=${patient.id}`);
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
      <Header />
      {/* <div className={styles.pageHeader}>
        <h1 className={styles.title}>Rekapitulasi Data Pasien</h1>
        <div className={styles.pageHeaderActions}>
          <button 
            onClick={() => router.push('/superadmin')}
            className={styles.btnSecondary}
          >
            Kembali ke Superadmin
          </button>
          <button 
            onClick={handleLogout}
            className={styles.btnLogout}
          >
            Keluar
          </button>
        </div>
      </div> */}

      <div className={styles.filters}>
        <div className={styles.filterRow}>
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
          <div className={styles.filterGroup}>
            <label htmlFor="filterStatus">Status</label>
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.input}
            >
              <option value="">Semua Status</option>
              <option value="pendaftaran">Pendaftaran</option>
              <option value="perawat">Perawat</option>
              <option value="dokter">Dokter</option>
              <option value="farmasi">Farmasi</option>
              <option value="selesai">Selesai</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="filterJenisKelamin">Jenis Kelamin</label>
            <select
              id="filterJenisKelamin"
              value={filterJenisKelamin}
              onChange={(e) => {
                setFilterJenisKelamin(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.input}
            >
              <option value="">Semua</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="filterDokter">Dokter</label>
            <select
              id="filterDokter"
              value={filterDokter}
              onChange={(e) => {
                setFilterDokter(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.input}
              disabled={fetchingDokter}
            >
              <option value="">Semua Dokter</option>
              {dokterList.map((dokter, index) => (
                <option key={index} value={dokter.nama_dokter}>
                  {dokter.nama_dokter}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="filterLokasi">Lokasi</label>
            <select
              id="filterLokasi"
              value={filterLokasi}
              onChange={(e) => {
                setFilterLokasi(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.input}
              disabled={fetchingLokasi}
            >
              <option value="">Semua Lokasi</option>
              {lokasiList.map((lokasi) => (
                <option key={lokasi.id} value={lokasi.id.toString()}>
                  {lokasi.nama_lokasi}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup} style={{ flex: 1 }}>
            <label htmlFor="searchTerm">Cari Pasien</label>
            <input
              type="text"
              id="searchTerm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama, no. KTP, no. telepon, atau no. registrasi..."
              className={styles.input}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <button onClick={handleFilter} className={styles.btnFilter}>
            Terapkan Filter
          </button>
          <button onClick={handleResetFilters} className={styles.btnReset}>
            Reset Filter
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
            <p>Total Data: <strong>{totalPatients}</strong> pasien | Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong></p>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tgl Pemeriksaan</th>
                  <th>Nama</th>
                  <th>JK</th>
                  <th>Usia</th>
                  <th>Alamat</th>
                  <th>TB/BB</th>
                  <th>Tensi</th>
                  <th>Nadi</th>
                  <th>Napas</th>
                  <th>Suhu</th>
                  <th>Kelayakan</th>
                  <th>Dokter</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient, index) => (
                  <tr key={patient.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className={styles.cellDate}>
                      {patient.tanggal_pemeriksaan
                        ? new Date(patient.tanggal_pemeriksaan).toLocaleDateString('id-ID')
                        : '-'}
                    </td>
                    <td className={styles.cellName}>{patient.nama}</td>
                    <td>{patient.jenis_kelamin}</td>
                    <td>{formatAge(patient.usia, patient.tanggal_lahir)}</td>
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
                    <td>{patient.denyut_nadi || '-'}</td>
                    <td>{patient.laju_pernapasan || '-'}</td>
                    <td>{patient.suhu_tubuh ? `${patient.suhu_tubuh}°C` : '-'}</td>
                    <td className={styles.cellText}>{patient.kesimpulan_kelayakan || '-'}</td>
                    <td>{patient.dokter_pemeriksa || '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status${patient.status?.charAt(0).toUpperCase() + patient.status?.slice(1)}`] || ''}`}>
                        {patient.status === 'pendaftaran' ? 'Pendaftaran' :
                          patient.status === 'perawat' ? 'Perawat' :
                            patient.status === 'dokter' ? 'Dokter' :
                              patient.status === 'farmasi' ? 'Farmasi' :
                                patient.status === 'selesai' ? 'Selesai' :
                                  patient.status === 'dibatalkan' ? 'Dibatalkan' :
                                    patient.status || '-'}
                      </span>
                    </td>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={styles.paginationBtn}
              >
                Sebelumnya
              </button>
              <div className={styles.paginationInfo}>
                Halaman {currentPage} dari {totalPages}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={styles.paginationBtn}
              >
                Selanjutnya
              </button>
            </div>
          )}
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
                    <span>{formatAge(selectedPatient.usia, selectedPatient.tanggal_lahir)}</span>
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
                    <label>Denyut Nadi:</label>
                    <span>{selectedPatient.denyut_nadi ? `${selectedPatient.denyut_nadi} bpm` : '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Laju Pernapasan:</label>
                    <span>{selectedPatient.laju_pernapasan ? `${selectedPatient.laju_pernapasan} x/menit` : '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Suhu Tubuh:</label>
                    <span>{selectedPatient.suhu_tubuh ? `${selectedPatient.suhu_tubuh} °C` : '-'}</span>
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
                  <div className={styles.detailItem}>
                    <label>Kesimpulan Kelayakan:</label>
                    <span style={{ fontWeight: 'bold', fontSize: '30px', color: selectedPatient.kesimpulan_kelayakan === 'UNFIT' ? '#ef4444' : selectedPatient.kesimpulan_kelayakan === 'FIT WITH NOTE' ? '#f59e0b' : '#10b981' }}>
                      {selectedPatient.kesimpulan_kelayakan || '-'}
                    </span>
                  </div>
                  {selectedPatient.saran_medis && (
                    <div className={styles.detailItemFull}>
                      <label>Saran Medis:</label>
                      <span>{selectedPatient.saran_medis}</span>
                    </div>
                  )}
                  {selectedPatient.alergi && (
                    <div className={styles.detailItemFull}>
                      <label>Alergi:</label>
                      <span>{selectedPatient.alergi}</span>
                    </div>
                  )}
                  {selectedPatient.catatan_khusus && (
                    <div className={styles.detailItemFull}>
                      <label>Catatan Khusus:</label>
                      <span>{selectedPatient.catatan_khusus}</span>
                    </div>
                  )}
                </div>

                <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Riwayat Penyakit Dahulu</h4>
                <div className={styles.resepTable}>
                  <table style={{ width: '100%', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Riwayat</th>
                        <th>Status</th>
                        <th>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Malaria/Demam Berulang</td><td>{selectedPatient.riwayat_malaria}</td><td>{selectedPatient.riwayat_malaria_ket || '-'}</td></tr>
                      <tr><td>Penyakit Kronis</td><td>{selectedPatient.riwayat_kronis}</td><td>{selectedPatient.riwayat_kronis_ket || '-'}</td></tr>
                      <tr><td>Rawat Inap/Operasi</td><td>{selectedPatient.riwayat_rawat_inap}</td><td>{selectedPatient.riwayat_rawat_inap_ket || '-'}</td></tr>
                      <tr><td>Alergi Obat/Makanan</td><td>{selectedPatient.riwayat_alergi_obat}</td><td>{selectedPatient.riwayat_alergi_obat_ket || '-'}</td></tr>
                      <tr><td>Merokok</td><td>{selectedPatient.riwayat_merokok}</td><td>{selectedPatient.riwayat_merokok_ket || '-'}</td></tr>
                      <tr><td>Alkohol</td><td>{selectedPatient.riwayat_alkohol}</td><td>{selectedPatient.riwayat_alkohol_ket || '-'}</td></tr>
                      <tr><td>Obat Rutin</td><td>{selectedPatient.riwayat_obat_rutin}</td><td>{selectedPatient.riwayat_obat_rutin_ket || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>

                <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Pemeriksaan Fisik</h4>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <label>Keadaan Umum:</label>
                    <span>{selectedPatient.fisik_keadaan_umum} {selectedPatient.fisik_keadaan_umum_ket ? `(${selectedPatient.fisik_keadaan_umum_ket})` : ''}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Kepala & Leher:</label>
                    <span>{selectedPatient.fisik_kepala_leher || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Jantung:</label>
                    <span>{selectedPatient.fisik_jantung || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Paru:</label>
                    <span>{selectedPatient.fisik_paru || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Abdomen:</label>
                    <span>{selectedPatient.fisik_abdomen || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Ekstremitas:</label>
                    <span>{selectedPatient.fisik_ekstremitas || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Kulit:</label>
                    <span>{selectedPatient.fisik_kulit || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <label>Lain-lain:</label>
                    <span>{selectedPatient.fisik_lain_lain || '-'}</span>
                  </div>
                </div>
              </section>


              {/* Data Resep */}
              {/* <section className={styles.detailSection}>
                <h3>Resep Obat</h3>
                {loadingDetail ? (
                  <p>Memuat data resep...</p>
                ) : resepDetails.length > 0 ? (
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
                ) : (
                  <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Tidak ada resep obat untuk pasien ini</p>
                )}
              </section> */}
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
        <p>Copyright © {new Date().getFullYear()} PT Doctor PHC Indonesia. All rights reserved.</p>
      </div>
    </div>
  );
}

