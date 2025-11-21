/**
 * Format usia menjadi string yang mudah dibaca
 * Untuk usia < 1 tahun: tampilkan dalam bulan atau minggu
 * Untuk usia >= 1 tahun: tampilkan dalam tahun
 */
export function formatAge(usia: number, tanggalLahir?: string | Date | null): string {
  // Jika usia >= 1 tahun, tampilkan dalam tahun
  if (usia >= 1) {
    return `${usia} tahun`;
  }

  // Jika usia < 1 tahun, hitung bulan atau minggu dari tanggal_lahir
  if (tanggalLahir) {
    try {
      const tanggalLahirDate = typeof tanggalLahir === 'string' ? new Date(tanggalLahir) : tanggalLahir;
      const sekarang = new Date();
      
      // Validasi tanggal
      if (isNaN(tanggalLahirDate.getTime())) {
        return usia === 0 ? '< 1 tahun' : `${usia} tahun`;
      }
      
      // Jika tanggal lahir lebih besar dari tanggal sekarang (masa depan), return 0
      if (tanggalLahirDate > sekarang) {
        return '0 hari';
      }
      
      // Hitung selisih hari
      const selisihHari = Math.floor((sekarang.getTime() - tanggalLahirDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (selisihHari < 0) {
        return '0 hari';
      }
      
      // Jika kurang dari 1 minggu (7 hari), tampilkan dalam hari
      if (selisihHari < 7) {
        if (selisihHari === 0) {
          return 'Baru lahir';
        } else if (selisihHari === 1) {
          return '1 hari';
        } else {
          return `${selisihHari} hari`;
        }
      }
      
      // Jika kurang dari 4 minggu (28 hari), tampilkan dalam minggu
      if (selisihHari < 28) {
        const minggu = Math.floor(selisihHari / 7);
        const hari = selisihHari % 7;
        
        if (hari === 0) {
          return `${minggu} minggu`;
        } else {
          return `${minggu} minggu ${hari} hari`;
        }
      }
      
      // Jika 4 minggu atau lebih, hitung bulan dengan lebih akurat
      const tahunLahir = tanggalLahirDate.getFullYear();
      const bulanLahir = tanggalLahirDate.getMonth();
      const hariLahir = tanggalLahirDate.getDate();
      
      const tahunSekarang = sekarang.getFullYear();
      const bulanSekarang = sekarang.getMonth();
      const hariSekarang = sekarang.getDate();
      
      let selisihBulan = (tahunSekarang - tahunLahir) * 12 + (bulanSekarang - bulanLahir);
      
      // Jika hari sekarang kurang dari hari lahir, kurangi 1 bulan
      if (hariSekarang < hariLahir) {
        selisihBulan--;
      }
      
      // Hitung sisa hari setelah bulan penuh
      const tanggalBulanLalu = new Date(tahunSekarang, bulanSekarang, hariLahir);
      if (tanggalBulanLalu > sekarang) {
        tanggalBulanLalu.setMonth(bulanSekarang - 1);
      }
      const sisaHari = Math.floor((sekarang.getTime() - tanggalBulanLalu.getTime()) / (1000 * 60 * 60 * 24));
      
      if (selisihBulan === 0) {
        return `${selisihHari} hari`;
      } else if (sisaHari < 7) {
        return `${selisihBulan} bulan`;
      } else {
        const mingguSisa = Math.floor(sisaHari / 7);
        return `${selisihBulan} bulan ${mingguSisa} minggu`;
      }
    } catch (error) {
      // Fallback jika terjadi error
      return usia === 0 ? '< 1 tahun' : `${usia} tahun`;
    }
  }
  
  // Fallback jika tidak ada tanggal_lahir
  return usia === 0 ? '< 1 tahun' : `${usia} tahun`;
}

