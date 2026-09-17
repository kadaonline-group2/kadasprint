# AI Website Builder Backend

API publik untuk website builder UMKM, dibangun dengan Express dan TypeScript.

## Menjalankan secara lokal

1. Instal dependensi dengan `npm install`.
2. Salin `.env.example` menjadi `.env`, lalu sesuaikan nilainya untuk layanan lokal.
3. Jalankan API dengan `npm run dev`. Port bawaan adalah `3000`.

`AI_SERVICE_BASE_URL` menunjuk ke AI service terpisah. `AI_SERVICE_TIMEOUT_MS`
menentukan batas waktu HTTP. Isi `AI_SERVICE_TOKEN` jika layanan internal
memerlukan autentikasi Bearer. Jangan simpan API key LLM di repository ini.

## Endpoint yang tersedia

- `GET /api/v1/health` memeriksa API Express dan AI service internal; jika AI
  service tidak sehat, respons berupa error envelope HTTP 502.
- `POST /api/v1/generate` menerima `{ "businessDescription": "..." }` sepanjang
  10–4000 karakter setelah trim. Endpoint memanggil AI service internal dan
  mengembalikan `WebsiteState` lengkap yang lolos validasi dalam response standar.
- `POST /api/v1/revise` menerima `currentState` lengkap dan `instruction`.
  Backend memvalidasi mutation dari AI service, menerapkannya melalui field yang
  diizinkan, lalu mengembalikan full `WebsiteState`. Jika revisi AI gagal, state
  lama dikembalikan dengan `revisionApplied: false`.
- `POST /api/v1/export` menerima `{ "currentState": WebsiteState }` yang valid dan
  mengembalikan ZIP berisi `index.html` mandiri. Frontend mengunduh response
  `application/zip` sebagai `website-umkm.zip`; endpoint ini tidak memanggil AI
  service. HTML export memakai salinan renderer preview milik Dev 3.

Endpoint generate mengembalikan `502 LLM_UNAVAILABLE` jika AI service gagal atau
hasilnya invalid tanpa fallback yang valid. Test menggunakan mock client dan
tidak memerlukan AI service yang berjalan.

Menurut [addendum kontrak v1.2](docs/WHATSAPP_NULLABLE_CONTRACT_v1.2.md),
`contact.whatsappNumber` bernilai `null` jika pengguna belum memberi nomor.
Backend mempertahankan nilai tersebut untuk generate, revise, dan export;
renderer tidak membuat link WhatsApp sampai nomor valid tersedia. Request
internal ke Dev 1 memakai `schemaVersion: "1.1"`.

Jalankan `npm run typecheck`, `npm run lint`, `npm test`, dan `npm run build`
untuk memeriksa backend.

## Integrasi lokal dengan frontend

Jalankan `npm run dev:integration` untuk menyediakan API lokal dengan respons AI
terkontrol. Perintah ini memakai fixture test, sehingga frontend dapat memakai
`VITE_API_MODE=real` dan `VITE_API_BASE_URL=http://localhost:3000/api/v1`
tanpa menjalankan AI service Dev 1. Generate mengembalikan fixture usaha kopi
atau barbershop sesuai contoh prompt frontend. Revise mendukung contoh instruksi
warna navy/cokelat dan penambahan "Pisang Goreng Keju". Instruksi lain
menghasilkan `UNSUPPORTED_REVISION`. Instruksi "simulasi gagal" menguji fallback
revisi. Export tetap dibuat oleh backend.
Server ini hanya untuk pengujian lokal, bukan pengganti AI service produksi.
Dengan server integrasi berjalan, jalankan `npm run test:integration` dari repo
frontend untuk memeriksa klien API FE terhadap endpoint BE yang sebenarnya.

## Integrasi HTTP Dev 1 dan Dev 2

Clone `web-builder-ai` berdampingan dengan repo backend ini, lalu pasang
`requirements-dev.txt` milik Dev 1 ke virtual environment Python. Jalankan
`npm run test:ai-integration` dari repo backend. Jika interpreter tidak berada
di `web-builder-ai/.venv`, atur `AI_INTEGRATION_PYTHON` ke path interpreter itu.

Perintah tersebut membangun backend dan menyalakan FastAPI serta Express pada
port loopback sementara. LLM diganti dengan respons deterministik dan base URL
provider diarahkan ke localhost yang tertutup; test tidak memakai API key nyata
atau memanggil provider. Kasusnya mencakup health, token dan request ID internal,
generate, revisi warna, tambah layanan, preservation state, unsupported revision,
fallback, provider error, dan timeout. Test ini terpisah dari `npm test` agar
test unit backend tetap dapat berjalan tanpa clone Dev 1.

## Renderer preview dan export

Source renderer kanonis ada di `web-builder-fe/src/renderer.ts` dan
`web-builder-fe/src/rendering/`. Backend menyimpan salinan source yang sama di
`src/renderer.ts` dan `src/rendering/` agar repo ini tetap bisa dibangun dan
di-deploy sendiri. Jangan edit salinan backend secara manual.

Ketika kedua repo tersedia berdampingan dan renderer frontend berubah, jalankan
`npm run renderer:sync` dari repo backend, lalu `npm run test:renderer-parity`.
Pemeriksaan itu membandingkan source dan HTML hasil render ketiga template.
`npm test` tetap dapat dijalankan pada clone backend mandiri. Perubahan renderer
perlu disinkronkan dan diuji pada kedua repo sebelum digabungkan ke cabang tim.
