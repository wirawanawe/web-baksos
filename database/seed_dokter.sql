-- Seed data untuk tabel dokter (10 data)
USE baksos_db;

INSERT INTO dokter (nama_dokter, spesialisasi, no_sip, no_telp, email, aktif) VALUES
('Dr. Ahmad Hidayat, Sp.PD', 'Spesialis Penyakit Dalam', 'SIP.001/2024', '081234567890', 'ahmad.hidayat@example.com', 'Y'),
('Dr. Siti Nurhaliza, Sp.A', 'Spesialis Anak', 'SIP.002/2024', '081234567891', 'siti.nurhaliza@example.com', 'Y'),
('Dr. Budi Santoso, Sp.OG', 'Spesialis Obstetri dan Ginekologi', 'SIP.003/2024', '081234567892', 'budi.santoso@example.com', 'Y'),
('Dr. Rina Wati, Sp.KK', 'Spesialis Kulit dan Kelamin', 'SIP.004/2024', '081234567893', 'rina.wati@example.com', 'Y'),
('Dr. Agus Setiawan, Sp.B', 'Spesialis Bedah', 'SIP.005/2024', '081234567894', 'agus.setiawan@example.com', 'Y'),
('Dr. Maya Sari, Sp.M', 'Spesialis Mata', 'SIP.006/2024', '081234567895', 'maya.sari@example.com', 'Y'),
('Dr. Indra Gunawan, Sp.BP', 'Spesialis Bedah Plastik', 'SIP.007/2024', '081234567896', 'indra.gunawan@example.com', 'Y'),
('Dr. Dewi Lestari, Sp.PK', 'Spesialis Patologi Klinik', 'SIP.008/2024', '081234567897', 'dewi.lestari@example.com', 'Y'),
('Dr. Eko Prasetyo, Sp.U', 'Spesialis Urologi', 'SIP.009/2024', '081234567898', 'eko.prasetyo@example.com', 'Y'),
('Dr. Fitri Handayani, Sp.S', 'Spesialis Saraf', 'SIP.010/2024', '081234567899', 'fitri.handayani@example.com', 'Y');

