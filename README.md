# ZAIN.NET Photo Grid AI Pro V2.6

Aplikasi GitHub Pages statis untuk pekerjaan pas foto dan layout cetak campuran. Tidak membutuhkan API token.

## Fitur utama
- AI lokal deteksi wajah & auto-crop.
- Auto rotate berdasarkan orientasi wajah dan kemiringan mata.
- Hapus background lokal dengan MediaPipe Selfie Segmentation.
- Background putih/merah/biru.
- Koreksi brightness/contrast/saturation otomatis.
- Preview wajah manual sebelum cetak.
- Satu foto dapat memiliki banyak ukuran sekaligus.
- Mixed-size optimizer: 2x3, 3x4, 4x6, KTP, STNK, 2R sampai 10RS, visa, custom dapat dicampur dalam satu halaman.
- Template “Paket Resmi Hemat”: 3x4 x5, 4x6 x5, 2x3 x3.
- Batch puluhan foto.
- DOCX siap cetak dan PNG halaman.
- PWA/install ke desktop/HP.

## Catatan AI lokal
Inference wajah/background dilakukan di browser. Pada pemakaian AI pertama kali, browser perlu mengunduh library/model MediaPipe dari CDN. Foto tidak dikirim ke API token atau server ZAIN.NET.

## DOCX mixed-size
Sekarang export DOCX memakai mode **editable**: setiap foto ditempatkan sebagai objek gambar terpisah di Microsoft Word. Jadi susunan tetap rapi, tetapi user masih bisa menggeser, crop, atau menyesuaikan foto satu per satu bila ukuran akhir perlu koreksi manual.


## Update V2.1
- Upload **PDF** sekarang didukung.
- File PDF akan otomatis di-convert menjadi **JPG per halaman** di browser.
- Setelah menjadi JPG, semua halaman bisa diproses seperti foto biasa: AI wajah, hapus background, mixed-size optimizer, dan export DOCX/PNG.


## Update V2.2 — Pilih Halaman PDF
- Upload PDF tetap didukung.
- Saat PDF dipilih, aplikasi menampilkan pilihan **Semua Halaman** atau **Halaman Tertentu**.
- Halaman tertentu dapat ditulis seperti `1,3,5-8`.
- Hanya halaman yang dipilih yang dikonversi menjadi JPG dan masuk ke layout.
- Nomor halaman asli PDF dipertahankan pada nama JPG, misalnya `dokumen_halaman_5.jpg`.


## Update V2.3
- **Putar Slot untuk Hemat** sekarang mengikuti arah kertas.
  - Portrait: prioritas kiri → kanan sampai satu baris penuh, lalu turun.
  - Landscape: prioritas atas → bawah sampai satu kolom penuh, lalu pindah ke kanan.
- Upload diperbaiki: **sekali klik / sekali pilih file langsung masuk**, tidak ada pemanggilan file picker ganda.
- Input file di-reset setelah pemrosesan sehingga file yang sama juga bisa dipilih ulang jika diperlukan.


## Update V2.4
- Export DOCX diubah: **setiap foto tidak lagi digabung menjadi satu gambar halaman**.
- Foto 3×4 sebanyak 5 lembar akan tetap menjadi **5 objek foto terpisah** di Word.
- Ditambahkan ukuran baru: **STNK, 2R, 3R, 4R, 5R, 6R, 8R, 8RS, 10R, 10RS**.
- Nama file export DOCX diperbarui menjadi `ZAINNET_Photo_Grid_AI_Pro_V2.4.docx`.


## Update V2.5 — Paket Baris Pas Foto
- Pada kertas portrait, ukuran **3×4 diprioritaskan 6 foto dalam satu baris**.
- Ukuran **4×6 diprioritaskan 5 foto dalam satu baris**.
- Saat ada 4×6 pada A4 portrait, aplikasi otomatis memakai margin/jarak kompak (maks. margin kiri/kanan 0,2 cm dan gap 0,1 cm) agar 5 foto 4×6 tetap ukuran asli dan benar-benar muat.
- Setelah baris penuh, layout baru turun ke baris berikutnya.


## Update V2.6
- Ditambahkan **Deteksi Ukuran Otomatis**.
- Jika user upload file seperti **PDF STNK**, aplikasi akan mencoba langsung memilih ukuran **STNK**.
- Untuk PDF, aplikasi juga membaca **ukuran fisik halaman** bila tersedia dan mencocokkannya ke preset yang paling mendekati.
- Untuk ukuran dokumen seperti **STNK/KTP/seri R**, mode otomatis memakai **Fit Utuh** agar isi tidak terpotong.
- Ukuran manual tetap tersedia melalui **Tambah ukuran manual** dan **Custom / Manual**.


## Update V2.7
- Ditambahkan fitur **Select All Foto**.
- User bisa memilih semua foto lalu mengganti ukuran sekaligus, misalnya **semua jadi 3×4** atau **semua jadi 4×6**.
- Tombol baru: **Terapkan ukuran ke foto terpilih**.
- Tiap kartu foto juga memiliki checkbox pilihan individual.


## Update V2.8
- Ditambahkan mode foto baru:
  - **Fit Utuh**: ukuran asli dipertahankan. Jika foto 3×4 dicetak ke 4×6 maka sisa area menjadi **putih polos**.
  - **Smart Crop Presisi**: mengisi ukuran target sambil menjaga proporsi, dengan fokus crop berbasis wajah.
  - **Resize Presisi / Paksa Exact**: mengisi ukuran target secara penuh walau gambar bisa sedikit gepeng.
- Auto crop wajah ditingkatkan: sekarang memakai **titik mata / hidung** agar hasil crop lebih presisi.
