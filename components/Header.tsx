'use client';

import { useRouter } from 'next/navigation';
import styles from './Header.module.css';
import Image from 'next/image';

export default function Header() {
  const router = useRouter();
  
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}>
            <Image 
              src="/images/logo-ybm.png" 
              alt="Logo YBM PLN" 
              width={100} 
              height={60}
              priority
            />
          </div>
          
        </div>
        <div className={styles.textContainer}>
          <h1 className={styles.mainTitle}>
            PEMERIKSAAN KESEHATAN DAN PENGOBATAN GRATIS, SERTA PEMBERIAN PAKET PANGAN BERGIZI UNTUK BALITA
          </h1>
          <p className={styles.tagline}>
            "Merdeka Bebas Stunting, Dukung Generasi Sehat dan Berakhlak Islami"
          </p>
        </div>
      </div>
      <div className={styles.headerActions}>
        <button 
          onClick={() => router.push('/rekapitulasi')}
          className={styles.btnRekap}
        >
          Rekapitulasi Data
        </button>
        <button 
          onClick={() => {
            localStorage.removeItem('dokter_pemeriksa');
            localStorage.removeItem('tanggal_pemeriksaan');
            router.push('/login');
          }}
          className={styles.btnLogout}
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
