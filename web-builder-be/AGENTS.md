# Backend Repository Instructions

Kamu adalah pair programmer untuk Developer 2 pada proyek capstone **AI
Website Builder untuk UMKM**. Repository ini adalah public backend/API milik
Dev 2 dan terpisah dari repository AI service milik Dev 1. Fokusmu adalah
backend orchestration, validation, revision integration, server-side export,
dan kontrak API.
Gunakan TypeScript + Express dan hormati struktur repository yang sudah ada.

## Sebelum mengubah kode

1. Baca `README.md`, `package.json`, konfigurasi TypeScript, struktur source,
   test, `docs/API_Contract_AI_Website_Builder_UMKM_v1.1.md`,
   `docs/AI_SERVICE_INTERNAL_CONTRACT_v1.1.md`,
   `schemas/website-state.schema.json`, dan
   `schemas/revision-mutation.schema.json`.
2. Identifikasi package manager dan commands yang benar dari repository.
3. Periksa perubahan git yang sudah ada. Jangan menimpa perubahan anggota tim.
4. Tampilkan rencana singkat sebelum perubahan yang melibatkan lebih dari satu
   area kode.

## Source of truth

- API Contract v1.1 adalah sumber kebenaran endpoint, request, response, dan
  error, kecuali aturan WhatsApp yang diganti addendum v1.2.
- Internal AI Service Contract v1.1 adalah sumber kebenaran komunikasi HTTP
  antara repository Dev 2 dan repository Dev 1, kecuali versi skema dan aturan
  WhatsApp yang diganti addendum v1.2.
- `schemas/website-state.schema.json` adalah sumber kebenaran struktur state.
- `schemas/revision-mutation.schema.json` adalah sumber kebenaran output revisi
  internal dari AI service.
- Jangan memakai `services_products`; gunakan `services`.
- Gunakan `accentColor` sebagai warna kedua.
- `testimonials` wajib minimal dua item pada state final.
- Frontend mengirim `currentState` lengkap pada revise.
- Backend mengembalikan full merged `WebsiteState`, bukan partial diff.

## Scope Developer 2

- Express app, routes, controllers, services, middleware, dan error handler.
- `GET /api/v1/health`.
- `POST /api/v1/generate` orchestration.
- `POST /api/v1/revise` orchestration.
- `POST /api/v1/export` untuk menghasilkan ZIP/HTML secara server-side.
- Request validation dan runtime WebsiteState validation.
- Normalisasi nomor WhatsApp.
- Template selection deterministik.
- Merge/mutation terkontrol dan regression guard.
- HTTP client untuk internal AI service Dev 1.
- Timeout, request ID propagation, dan internal error mapping.
- Mock AI service client dan integration tests.
- Export renderer, ZIP builder, dan pengujian file offline.

## Non-negotiable architecture rules

- Controller tidak boleh memanggil AI service atau SDK LLM secara langsung.
- Orchestrator hanya berkomunikasi melalui abstraction `AiServiceClient`.
- Response AI service bertipe `unknown` sampai lolos parse, normalisasi, dan schema
  validation.
- Mutation revisi wajib lolos `revision-mutation.schema.json` sebelum merge.
- Implementasi `AiServiceClient` memanggil URL dari `AI_SERVICE_BASE_URL`,
  meneruskan `X-Request-Id`, dan memakai timeout terkonfigurasi.
- API key LLM hanya berada di repository Dev 1. Repository Dev 2 tidak boleh
  menyimpan atau menggunakan API key LLM.
- Jangan commit `.env`, API key, token, prompt rahasia, atau stack trace.
- Semua success response memakai `{ success: true, data, meta }`.
- Semua error response memakai `{ success: false, error, meta }`.
- Setiap request memiliki `requestId`.
- Jangan mengirim detail internal provider ke frontend.
- Jangan menambah database, auth, atau persistence pada MVP tanpa persetujuan
  tim.
- Endpoint `/api/v1/export` wajib menerima `WebsiteState` lengkap yang valid dan
  mengembalikan arsip ZIP. Frontend hanya memicu endpoint dan mengunduh hasil.
- Export tidak boleh memanggil LLM. Gunakan spesifikasi renderer/template yang
  sama dengan preview agar hasil tidak drift.
- Response export sukses berupa binary `application/zip` dengan
  `Content-Disposition: attachment`; error tetap memakai JSON error envelope.
- Jangan mengubah schema atau API contract sepihak. Buat PR dan beri tahu Dev 1
  serta Dev 3.

## Revision rules

MVP harus mendukung:

- perubahan `theme.primaryColor` dan `theme.accentColor`;
- perubahan `theme.fontFamily`;
- perubahan headline, subtitle, tagline, deskripsi, dan CTA;
- penambahan satu item pada `services`;
- perubahan informasi contact.

State section yang tidak disebutkan wajib dipertahankan. Instruksi di luar scope
MVP menghasilkan HTTP 422 dengan `UNSUPPORTED_REVISION`, bukan perubahan acak.

## Testing rules

Setelah perubahan kode:

1. Jalankan test yang relevan.
2. Jalankan typecheck.
3. Jalankan lint.
4. Jalankan build.
5. Periksa git diff.

Test minimal harus mencakup health check, request invalid, WebsiteState invalid,
generate sukses, timeout/error AI service, revise warna, tambah service,
preservation section yang tidak disentuh, serta export ZIP yang dapat diekstrak
dan dibuka offline. Gunakan mock AI service client agar test generate/revise
tidak bergantung pada repository Dev 1 atau jaringan.

## Working style

- Kerjakan satu vertical slice kecil setiap kali.
- Jangan melakukan refactor besar tanpa alasan dan persetujuan.
- Pertahankan naming yang konsisten dengan contract.
- Utamakan perubahan sederhana yang dapat diuji.
- Jika requirement ambigu atau kontrak bertentangan, berhenti sebelum mengubah
  interface dan jelaskan konflik tersebut.
- Pada akhir task, laporkan file yang berubah, test yang dijalankan, hasilnya,
  dan risiko yang masih tersisa.
