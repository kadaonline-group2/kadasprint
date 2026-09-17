# AI Website Builder Frontend

## Menjalankan secara lokal

1. Jalankan `npm ci`.
2. Salin `.env.example` ke `.env.local`, lalu gunakan
   `VITE_API_MODE=real` dan `VITE_API_BASE_URL=http://localhost:3000/api/v1`
   untuk terhubung ke backend Dev 2.
3. Jalankan `npm run dev` dan buka `http://localhost:5173`.

Backend perlu mengizinkan origin frontend melalui `FRONTEND_ORIGIN`.
Konfigurasi `.env.local` diabaikan oleh Git.

Jika AI mengembalikan draft fallback, chat menjelaskan bahwa preview tersebut
bukan hasil dari deskripsi usaha. Tombol **Coba buat ulang** mengirim deskripsi
semula ke endpoint generate lagi, bukan ke endpoint revise.

## Edit manual

Setelah draft dibuat, buka **Edit manual** untuk mengubah nama usaha, judul dan
deskripsi utama, warna utama, serta nama, deskripsi, dan harga setiap item menu
atau layanan. Perubahan langsung tampil di preview dan dipakai saat menyalin
HTML atau mengunduh ZIP, tanpa memanggil AI. Data kontak tidak diubah oleh
editor ini. Kolom teks wajib diisi; unduhan dan salin HTML dinonaktifkan, serta
revisi lewat chat ditahan, bila ada kolom yang kosong.

## Gambar utama opsional

Setelah draft dibuat, pengguna dapat memilih gambar JPG, PNG, atau WebP
(maksimal 5 MB), lalu menekan **Terapkan gambar** atau **Gunakan tanpa gambar**.
Browser mengubah gambar yang diterapkan menjadi WebP maksimal 1 MB dan
menampilkannya di hero preview. Gambar tidak dikirim ke backend atau LLM,
tidak disimpan online, dan hilang saat halaman dimuat ulang. Jika gambar
diterapkan, unduhan berupa ZIP offline berisi `index.html` dengan gambar
tertanam; tanpa gambar, alur export backend tetap digunakan.

## Uji integrasi Dev 2 dan Dev 3

Jalankan `npm run dev:integration` di repo backend, lalu jalankan
`npm run test:integration` di repo frontend. Server backend tersebut memakai
respons AI terkontrol agar klien API frontend dapat diuji tanpa layanan Dev 1.
Perintah integrasi memeriksa generate, revise, fallback, error 422, dan unduhan
ZIP. `npm test` menjalankan test frontend tanpa memerlukan backend.

## Renderer bersama

`src/renderer.ts` dan `src/rendering/` adalah sumber kanonis untuk HTML preview
dan ZIP export backend. Setelah mengubah renderer, jalankan
`npm run renderer:sync` dan `npm run test:renderer-parity` dari repo backend
ketika kedua repo di-clone berdampingan. Backend menyimpan salinan source agar
masing-masing repo tetap dapat dibangun sendiri.

Jika `contact.whatsappNumber` bernilai `null`, preview dan export menampilkan
CTA WhatsApp non-klik dengan keterangan nomor belum tersedia. Setelah pengguna
menambahkan nomor valid melalui revisi, link `wa.me` kembali aktif. Ketentuan
ini mengikuti addendum kontrak WhatsApp v1.2 di repo backend Dev 2.
