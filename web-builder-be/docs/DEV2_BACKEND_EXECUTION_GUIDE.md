# Panduan Kerja Developer 2

## AI Website Builder untuk UMKM

Versi: 1.2 — Sinkronisasi API Contract v1.1  
Peran: Backend & AI Revision/Integration Lead  
Stack: Node.js, Express, TypeScript  
Durasi target: 8 hari kerja intensif dalam sprint 2 minggu

---

## 1. Tujuan Peran Anda

Sebagai Developer 2, Anda menjadi pemilik alur backend dan integrasi antar-layer.

Tanggung jawab utama Anda adalah memastikan:

1. Frontend dapat memanggil API dengan format yang jelas.
2. Request dari frontend tervalidasi sebelum diproses.
3. Output dari AI selalu divalidasi terhadap `WebsiteState`.
4. Revisi hanya mengubah bagian yang diminta pengguna.
5. Section lain tetap utuh setelah revisi.
6. Error backend dikembalikan dalam format yang konsisten.
7. Dev 1 dapat mengganti provider LLM tanpa mengubah public API milik Dev 2.
8. Dev 3 dapat mengintegrasikan frontend tanpa menebak-nebak bentuk response.
9. Export ZIP dihasilkan backend dan dapat dibuka secara offline.

Anda bukan pemilik utama prompt generation dan integrasi provider LLM. Itu adalah
fokus Dev 1 dalam repository AI service yang terpisah. Repository Anda harus
menyediakan HTTP client yang mengikuti kontrak internal agar orchestrator dapat
memanggil AI service tanpa bergantung pada implementasi internal Dev 1.

### Topologi repository

```text
ai-website-builder-frontend     -> Dev 3
ai-website-builder-api          -> Dev 2 (repository Anda)
ai-website-builder-ai-service   -> Dev 1
```

Alur komunikasi:

```text
Frontend -> Public API Dev 2 -> Internal AI API Dev 1 -> Public API Dev 2 -> Frontend
```

Frontend hanya boleh memanggil public API Dev 2. API key LLM hanya berada pada
AI service Dev 1 dan tidak disimpan di frontend maupun repository Dev 2.

---

## 2. Sumber Kebenaran yang Wajib Dipakai

Gunakan file berikut sebagai acuan teknis:

- `docs/API_Contract_AI_Website_Builder_UMKM_v1.1.md`
- `docs/AI_SERVICE_INTERNAL_CONTRACT_v1.1.md`
- `schemas/website-state.schema.json`
- `schemas/revision-mutation.schema.json`
- FRD bagian kebutuhan fungsional dan skenario pengujian
- Scrum Plan bagian ownership Dev 2, DoR, dan DoD

Jika kode yang sudah ada berbeda dengan kontrak, jangan langsung mengganti
kontrak secara sepihak. Buat catatan perubahan, diskusikan dengan Dev 1 dan
Dev 3, lalu ubah kontrak melalui Pull Request.

Konvensi yang sudah dikunci:

| Area | Keputusan |
|---|---|
| Base path | `/api/v1` |
| Endpoint MVP | `GET /health`, `POST /generate`, `POST /revise`, `POST /export` |
| Field daftar produk/layanan | `services` |
| Warna kedua | `accentColor` |
| State | Stateless; frontend mengirim `currentState` lengkap saat revise |
| Response revise | Full merged `WebsiteState` |
| Runtime validation | JSON Schema dengan Ajv atau validator JSON Schema setara |
| Integrasi Dev 1 ↔ Dev 2 | HTTP internal API, bukan import source code lintas repo |
| URL AI service | Environment variable `AI_SERVICE_BASE_URL` |
| Export MVP | Server-side melalui `POST /api/v1/export`; frontend memicu download |
| Publish online | Stretch goal; jangan menjadi blocker MVP |
| Database/auth | Tidak diperlukan untuk MVP |

---

## 3. Deliverable yang Harus Anda Buat

Pada akhir pekerjaan backend, repository minimal harus memiliki:

### A. Backend application

- Express app dalam TypeScript.
- `GET /api/v1/health`.
- `POST /api/v1/generate`.
- `POST /api/v1/revise`.
- `POST /api/v1/export` dengan response ZIP.
- CORS untuk origin frontend.
- Parsing JSON request.
- Request ID untuk setiap request.
- Central error handler.
- Response envelope yang konsisten.

### B. Validasi dan state management

- Validator request `businessDescription`.
- Validator `currentState`.
- Validator output AI.
- Validator mutation revisi dari internal AI service.
- Normalisasi nomor WhatsApp ke format `62...`.
- Template selection deterministik untuk `template-services`,
  `template-fnb`, dan `template-retail`.
- Merge/mutation state yang tidak merusak section yang tidak direvisi.
- Fallback state valid ketika proses AI gagal dan fallback tersedia.
- Export renderer dan ZIP builder yang deterministik, tanpa memanggil LLM.
- Bundle berisi `index.html` dan aset terbundel yang dapat dibuka offline.

### C. Integrasi yang dapat diuji

- HTTP client untuk internal AI service Dev 1.
- Timeout, request ID propagation, dan internal error mapping.
- Mock AI service client untuk unit test dan development lokal.
- Test route menggunakan mock client sehingga test tidak bergantung pada
  API key, repository Dev 1, atau jaringan internet.
- Dokumentasi cara menjalankan backend.
- Contoh `.env.example` berisi `AI_SERVICE_BASE_URL` dan timeout tanpa secret.

### D. Bukti siap integrasi

- Collection Postman atau file request `.http`.
- Contoh response sukses dan error.
- Test untuk generate, revise, export, state preservation, dan invalid request.
- Pull Request kecil yang dapat direview oleh Dev 1 dan Dev 3.

---

## 4. Arsitektur Backend yang Direkomendasikan

Jangan membuat controller berisi seluruh logika bisnis. Pisahkan tanggung jawab
agar perubahan dari Dev 1 tidak merusak route.

~~~text
Frontend HTTP Request
    |
    v
Public Route Dev 2
    |
    v
Controller  ------> Request validation
    |
    v
Website orchestrator
    |
    +----> AI service HTTP client
    |          |
    |          v
    |      Internal API Dev 1 -> LLM provider
    +----> State normalizer
    +----> WebsiteState validator
    +----> Template selector
    +----> Error mapper
    +----> Export renderer dan ZIP builder
    |
    v
Response envelope
~~~

Struktur folder awal yang dapat digunakan:

~~~text
backend/
├─ docs/
│  ├─ API_Contract_AI_Website_Builder_UMKM_v1.1.md
│  └─ AI_SERVICE_INTERNAL_CONTRACT_v1.1.md
├─ schemas/
│  ├─ website-state.schema.json
│  └─ revision-mutation.schema.json
├─ src/
│  ├─ app.ts
│  ├─ server.ts
│  ├─ config/
│  │  └─ env.ts
│  ├─ controllers/
│  │  ├─ health.controller.ts
│  │  ├─ generate.controller.ts
│  │  ├─ revise.controller.ts
│  │  └─ export.controller.ts
│  ├─ routes/
│  │  ├─ health.routes.ts
│  │  ├─ generate.routes.ts
│  │  ├─ revise.routes.ts
│  │  └─ export.routes.ts
│  ├─ clients/
│  │  ├─ ai-service.client.ts
│  │  └─ mock-ai-service.client.ts
│  ├─ contracts/
│  │  └─ ai-service.types.ts
│  ├─ services/
│  │  ├─ website-orchestrator.service.ts
│  │  ├─ revision.service.ts
│  │  ├─ state-normalizer.service.ts
│  │  ├─ template-selector.service.ts
│  │  ├─ export-renderer.service.ts
│  │  ├─ zip-builder.service.ts
│  │  └─ fallback-state.ts
│  ├─ validators/
│  │  ├─ request.validator.ts
│  │  ├─ website-state.validator.ts
│  │  └─ revision-mutation.validator.ts
│  ├─ middleware/
│  │  ├─ request-id.middleware.ts
│  │  └─ error-handler.middleware.ts
│  ├─ types/
│  │  ├─ api.ts
│  │  └─ website-state.ts
│  └─ utils/
│     └─ whatsapp.ts
├─ tests/
│  ├─ health.test.ts
│  ├─ generate.test.ts
│  ├─ revise.test.ts
│  ├─ export.test.ts
│  └─ website-state.test.ts
├─ .env.example
├─ AGENTS.md
├─ package.json
└─ tsconfig.json
~~~

Jika repository sudah memiliki struktur sendiri, jangan melakukan refactor besar
hanya untuk mengikuti struktur di atas. Pertahankan pola yang sudah ada selama
pemisahan route, controller, service, validator, dan test tetap jelas.

---

## 5. Kontrak Antara Dev 1 dan Dev 2

Karena repository terpisah, batas integrasi adalah HTTP internal API. Kontrak
lengkap berada pada `docs/AI_SERVICE_INTERNAL_CONTRACT_v1.1.md`.

Repository Dev 2 menyediakan abstraction berikut:

~~~ts
export interface AiServiceClient {
  generate(input: {
    businessDescription: string;
    requestId: string;
  }): Promise<unknown>;

  revise(input: {
    currentState: WebsiteState;
    instruction: string;
    requestId: string;
  }): Promise<unknown>;
}
~~~

Implementasi production memanggil:

- `GET /internal/v1/health`
- `POST /internal/v1/generate`
- `POST /internal/v1/revise`

Aturan penting:

- Response AI service tetap dianggap `unknown` sampai lolos validasi Dev 2.
- Controller tidak boleh memanggil AI service atau SDK LLM secara langsung.
- Orchestrator memanggil `AiServiceClient`.
- Dev 2 meneruskan request ID melalui header `X-Request-Id`.
- Dev 2 menerapkan timeout melalui `AI_SERVICE_TIMEOUT_MS`.
- API key LLM hanya dibaca repository Dev 1.
- Test route Dev 2 harus menggunakan mock client.
- Error internal dipetakan menjadi public error `LLM_UNAVAILABLE` atau fallback.

Dengan pola ini, Dev 1 bebas mengubah prompt dan provider LLM, sedangkan public
endpoint untuk frontend tetap stabil.

---

## 6. Alur Endpoint yang Harus Diimplementasikan

### 6.1 `GET /api/v1/health`

Tujuan: mengecek backend tanpa memanggil LLM.

Response sukses:

~~~json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "ai-website-builder-backend"
  },
  "meta": {
    "requestId": "req_health001"
  }
}
~~~

### 6.2 `POST /api/v1/generate`

Urutan kerja:

1. Pastikan body object dan `businessDescription` berupa string.
2. Trim input dan tolak string kosong.
3. Tolak input di bawah 10 atau di atas 4000 karakter.
4. Panggil internal AI service melalui `AiServiceClient`.
5. Validasi envelope dan payload response internal.
6. Normalisasi `contact.whatsappNumber`.
7. Pilih template secara deterministik jika AI service belum mengisi dengan benar.
8. Validasi hasil terhadap `website-state.schema.json`.
9. Jika invalid, minta retry melalui service AI sesuai tanggung jawab Dev 1.
10. Jika tetap gagal, gunakan fallback state valid atau kembalikan error sesuai
    kontrak.
11. Kembalikan `WebsiteState` lengkap dalam `data`.

Jangan mengembalikan sebagian data website yang belum tervalidasi.

### 6.3 `POST /api/v1/revise`

Request wajib memiliki:

~~~json
{
  "currentState": "WebsiteState lengkap",
  "instruction": "Ganti warna utama menjadi cokelat tua klasik"
}
~~~

Urutan kerja:

1. Validasi `currentState` terhadap schema sebelum memanggil AI.
2. Validasi `instruction` tidak kosong.
3. Klasifikasikan atau batasi revisi pada scope MVP.
4. Panggil endpoint revision internal melalui `AiServiceClient`.
5. Validasi mutation terhadap `revision-mutation.schema.json`.
6. Terapkan hasil sebagai mutasi terkontrol terhadap state lama.
7. Pastikan section yang tidak disebutkan tetap sama.
8. Normalisasi field yang terdampak.
9. Validasi state hasil merge terhadap schema.
10. Kembalikan full merged `WebsiteState`.

Revisi MVP yang wajib didukung:

- `theme.primaryColor` dan `theme.accentColor`.
- `theme.fontFamily`.
- headline, subtitle, tagline, deskripsi, dan CTA.
- menambah satu item pada `services`.
- informasi kontak.

Jika instruksi belum didukung, gunakan HTTP 422 dengan kode
`UNSUPPORTED_REVISION`. Jangan diam-diam mengubah section lain.

### 6.4 Export dan publish

Implementasikan `POST /api/v1/export` sesuai API Contract v1.1. Endpoint ini
tidak memanggil AI service.

Urutan kerja:

1. Validasi request body dan `currentState` terhadap schema.
2. Normalisasi data yang diperlukan, termasuk nomor dan URL WhatsApp.
3. Render website menggunakan spesifikasi template yang sama dengan preview.
4. Buat bundle ZIP yang minimal memuat `index.html` dan aset lokal yang
   dibutuhkan.
5. Pastikan bundle tidak memuat script editor, source map, secret, atau kode
   internal builder.
6. Kembalikan binary dengan header:
   - `Content-Type: application/zip`;
   - `Content-Disposition: attachment; filename="website-umkm.zip"`.
7. Jika validasi atau proses export gagal, kembalikan JSON error envelope
   standar, bukan file ZIP rusak.

Frontend Dev 3 hanya memicu endpoint dan mengunduh blob. Preview dan export
harus mengikuti kontrak renderer/template yang disepakati bersama. Publish
online tetap stretch goal dan tidak boleh menghambat export MVP.

---

## 7. Aturan Response dan Error

Response sukses wajib berbentuk:

~~~ts
type SuccessResponse<T> = {
  success: true;
  data: T;
  meta: {
    requestId: string;
    isFallback?: boolean;
    latencyMs?: number;
    revisionApplied?: boolean;
    changedPaths?: string[];
  };
};
~~~

Response error wajib berbentuk:

~~~ts
type ErrorResponse = {
  success: false;
  error: {
    code:
      | "INVALID_REQUEST"
      | "INVALID_WEBSITE_STATE"
      | "UNSUPPORTED_REVISION"
      | "RATE_LIMITED"
      | "LLM_UNAVAILABLE"
      | "INTERNAL_ERROR";
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    requestId: string;
  };
};
~~~

Jangan mengirim stack trace, API key, prompt internal, atau detail provider ke
frontend.

---

## 8. Rencana Pengerjaan Praktis

### Hari 1: Pahami repo dan kunci kontrak

- Jika repository kosong, inisialisasi Node.js + Express + TypeScript.
- Jika project sudah ada, jalankan terlebih dahulu tanpa mengubah struktur.
- Baca `AGENTS.md`, README, package scripts, dan struktur source.
- Pastikan public contract, internal contract, dan schema berada di lokasi yang
  disepakati.
- Buat issue/branch `feat/backend-bootstrap`.
- Catat keputusan yang belum jelas bersama Dev 1 dan Dev 3.

Output: backend dapat dijalankan, `.env.example`, dan catatan arsitektur.

### Hari 2: Skeleton API dan health check

- Buat `app.ts` yang dapat di-import oleh test.
- Buat `server.ts` untuk listen port.
- Tambahkan CORS, JSON parser, request ID, dan error handler.
- Implementasikan `/api/v1/health`.
- Tambahkan test health check.

Output: backend hidup dan test pertama lulus.

### Hari 3: Schema validator dan mock AI service client

- Masukkan schema sebagai file resmi.
- Compile schema dengan Ajv.
- Buat type `WebsiteState`.
- Buat validator request dan state.
- Buat mock AI service client yang mengembalikan response internal valid.
- Tambahkan environment `AI_SERVICE_BASE_URL` dan `AI_SERVICE_TIMEOUT_MS`.
- Tambahkan test invalid state dan invalid request.

Output: backend dapat memverifikasi state tanpa LLM.

### Hari 4: Generate orchestration

- Implementasikan route, controller, dan service generate.
- Sambungkan orchestrator ke `AiServiceClient`, bukan SDK LLM langsung.
- Implementasikan timeout, `AI_SERVICE_BASE_URL`, dan `X-Request-Id`.
- Tambahkan normalisasi WhatsApp dan template selection.
- Uji response sukses, invalid AI output, dan fallback.

Output: input deskripsi bisnis menghasilkan `WebsiteState` valid.

### Hari 5: Revision orchestration

- Implementasikan `/api/v1/revise`.
- Validasi state sebelum proses.
- Terapkan mutasi terkontrol.
- Tambahkan regression guard untuk section yang tidak disentuh.
- Uji perubahan warna dan penambahan layanan.

Output: revisi tidak merusak data section lain.

### Hari 6: Export server-side dan integrasi frontend

- Kirim contract dan contoh request kepada Dev 3.
- Uji alur frontend → backend Dev 2 → AI service Dev 1 → response.
- Implementasikan `POST /api/v1/export`, renderer, dan ZIP builder.
- Uji ZIP dapat diekstrak, `index.html` dapat dibuka offline, dan CTA WhatsApp
  berfungsi.
- Perbaiki CORS, error mapping, dan loading/error state.
- Gunakan request log tanpa membocorkan secret atau isi sensitif.

Output: alur generate, revise, dan export dapat dipakai frontend.

### Hari 7: QA dan hardening

- Jalankan seluruh test.
- Uji input kosong, input terlalu panjang, state rusak, timeout, dan response
  AI service yang invalid.
- Uji error export dan pastikan response gagal tetap berupa JSON envelope.
- Uji request berulang dan rate limit sederhana jika memang dibutuhkan.
- Periksa `npm run build`, lint, dan typecheck.

Output: branch siap Pull Request dan main tetap build-passing.

### Hari 8: Demo readiness

- Siapkan request demo Warung Kopi.
- Siapkan revisi warna.
- Siapkan penambahan menu.
- Verifikasi link WhatsApp.
- Verifikasi hasil export konsisten dengan preview.
- Buat backup mock/fallback jika API LLM bermasalah.
- Dokumentasikan kontribusi dan batasan MVP.

Output: backend siap dipakai pada simulasi demo.

---

## 9. Checklist Definition of Done Dev 2

- [ ] Semua route menggunakan `/api/v1`.
- [ ] `GET /health` tidak membutuhkan API key.
- [ ] Request invalid menghasilkan status dan error code yang benar.
- [ ] Output AI tidak pernah langsung diteruskan tanpa validasi.
- [ ] `WebsiteState` valid terhadap schema.
- [ ] Mutation internal valid terhadap `revision-mutation.schema.json`.
- [ ] `services`, bukan `services_products`, digunakan di seluruh backend.
- [ ] `accentColor` digunakan konsisten.
- [ ] `testimonials` minimal dua item pada state final.
- [ ] Nomor WhatsApp dinormalisasi sebelum response.
- [ ] Revisi tidak menghapus data section lain.
- [ ] Ada mock AI service client untuk test tanpa jaringan.
- [ ] `AI_SERVICE_BASE_URL` dan timeout berasal dari environment variable.
- [ ] API key LLM tidak berada di repository Dev 2.
- [ ] `POST /api/v1/export` menghasilkan ZIP valid dengan header download.
- [ ] `index.html` hasil export dapat dibuka offline dan konsisten dengan preview.
- [ ] Unit/integration test lulus.
- [ ] Typecheck, lint, dan build lulus.
- [ ] Dokumentasi request dan response tersedia.
- [ ] Pull Request direview minimal satu anggota tim.

---

## 10. Prompt Kerja untuk Codex

Letakkan file `AGENTS.md` yang disertakan bersama panduan ini di root
repository backend. Setelah itu, gunakan prompt kecil per task. Jangan meminta
Codex membangun seluruh backend sekaligus.

### Prompt awal: inspeksi repository

~~~text
Kamu bekerja sebagai pair programmer untuk Developer 2 pada proyek AI Website
Builder untuk UMKM. Baca AGENTS.md, README, package.json, konfigurasi
TypeScript, struktur src, test, public API contract, internal AI service
contract, dan JSON Schema yang sudah ada. Jangan mengubah file dulu.

Laporkan:
1. struktur repository saat ini;
2. cara menjalankan aplikasi dan test;
3. bagian yang sudah ada;
4. bagian yang belum ada untuk scope Dev 2;
5. potensi konflik dengan kedua API contract dan website-state.schema.json.

Setelah laporan, usulkan rencana maksimal 5 langkah dan tunggu persetujuan saya.
~~~

### Prompt task 1: bootstrap

~~~text
Implementasikan backend skeleton sesuai AGENTS.md dan API Contract v1.1.
Fokus hanya pada app bootstrap, config environment, CORS, request ID,
central error handler, dan GET /api/v1/health.

Siapkan `.env.example` dengan AI_SERVICE_BASE_URL=http://localhost:3001 dan
AI_SERVICE_TIMEOUT_MS=45000, tetapi jangan memanggil AI service pada health
check public.

Sebelum mengubah file, tampilkan rencana singkat. Setelah implementasi:
- jalankan typecheck, lint, build, dan test;
- perbaiki error yang ditemukan;
- tampilkan ringkasan file berubah dan cara menguji endpoint.
Jangan membuat endpoint generate/revise dulu.
~~~

### Prompt task 2: validator

~~~text
Implementasikan runtime validation berbasis schemas/website-state.schema.json.
Gunakan validator JSON Schema yang sesuai dengan stack repository. Buat type
WebsiteState, validator request, validator state, validator
revision-mutation.schema.json, kontrak type response internal, dan mock
AiServiceClient.

Tambahkan test untuk state valid, missing field, warna invalid, services kurang
dari tiga, testimonials kurang dari dua, dan nomor WhatsApp invalid.
Jangan mengintegrasikan LLM asli dan jangan mengubah API contract.
~~~

### Prompt task 3: generate

~~~text
Implementasikan POST /api/v1/generate sesuai API Contract v1.1.
Gunakan AiServiceClient/mock client; jangan memanggil SDK LLM langsung dari
repository Dev 2. Terapkan validasi input, orchestration, normalisasi WhatsApp,
template selection, response envelope, requestId, latencyMs, dan fallback.

Implementasi production client harus mengikuti
docs/AI_SERVICE_INTERNAL_CONTRACT_v1.1.md, meneruskan X-Request-Id, dan memiliki
timeout. Frontend tidak boleh memanggil AI service Dev 1 secara langsung.

Tambahkan test untuk request sukses, input kosong, input terlalu pendek, output
AI service invalid, timeout, dan fallback. Jalankan seluruh quality checks.
~~~

### Prompt task 4: revise

~~~text
Implementasikan POST /api/v1/revise sesuai API Contract v1.1.
Validasi currentState sebelum AI service dipanggil. Dukung revisi warna, font,
copy, penambahan service, dan contact. Terapkan merge terkontrol dan regression
guard agar section yang tidak diminta tetap sama.

Kembalikan full WebsiteState. Untuk instruksi di luar scope MVP, kembalikan
HTTP 422 dengan UNSUPPORTED_REVISION. Tambahkan test state preservation dan
jalankan semua quality checks.
~~~

### Prompt task 5: export server-side

~~~text
Implementasikan POST /api/v1/export sesuai API Contract v1.1. Validasi
currentState terhadap schemas/website-state.schema.json sebelum render. Endpoint
tidak boleh memanggil AI service atau SDK LLM.

Gunakan service terpisah untuk render HTML dan membuat ZIP. Bundle minimal
memuat index.html, dapat dibuka offline, tidak memuat script editor atau secret,
dan menghasilkan CTA WhatsApp yang benar. Kembalikan application/zip dengan
Content-Disposition attachment. Error harus tetap menggunakan JSON error
envelope standar.

Tambahkan test untuk state valid, state invalid, header response, isi ZIP,
index.html offline, dan CTA WhatsApp. Jalankan semua quality checks.
~~~

### Prompt task 6: review sebelum Pull Request

~~~text
Lakukan code review terhadap perubahan backend sebagai reviewer yang kritis.
Periksa kesesuaian dengan AGENTS.md, public API Contract v1.1, internal AI
Service Contract v1.1, dan website-state.schema.json.

Cari khususnya:
- field yang tidak konsisten;
- output AI yang belum divalidasi;
- revisi yang dapat menghapus section lain;
- secret yang bocor ke log atau repository;
- request ID yang tidak diteruskan ke AI service;
- timeout atau internal error mapping yang salah;
- status HTTP dan error code yang salah;
- export ZIP yang rusak, bergantung jaringan, atau berbeda dari preview;
- test yang belum mencakup edge case.

Jangan mengubah file. Berikan temuan berdasarkan severity dan rekomendasi
perbaikannya.
~~~

---

## 11. Cara Bekerja yang Aman dengan Codex

1. Mulai dari inspeksi, bukan langsung meminta implementasi besar.
2. Satu prompt = satu vertical slice kecil.
3. Minta Codex menampilkan rencana sebelum perubahan besar.
4. Setelah perubahan, minta test, typecheck, lint, dan build.
5. Periksa diff sebelum commit.
6. Jangan menerima perubahan kontrak tanpa memberi tahu Dev 1 dan Dev 3.
7. Jangan menaruh `.env`, API key, atau token pada prompt, log, issue, maupun
   commit.
8. Commit perubahan kecil dengan pesan yang menjelaskan tujuan.

Contoh pesan commit:

~~~text
feat(api): add health check and request envelope
feat(validation): validate WebsiteState with JSON Schema
feat(revision): preserve untouched website sections
test(api): cover generate and revise failure cases
~~~

---

## 12. Batasan MVP yang Harus Dijaga

Jangan menambahkan hal-hal berikut sebelum fitur inti stabil:

- autentikasi dan role user;
- database persistence;
- dashboard admin;
- upload gambar;
- publish online;
- sistem pembayaran;
- streaming LLM kompleks;
- revisi bebas terhadap layout/template.

Fokus sprint adalah alur berikut:

~~~text
businessDescription
  -> generate
  -> WebsiteState valid
  -> frontend preview
  -> revise dengan currentState lengkap
  -> WebsiteState hasil merge
  -> frontend preview
  -> POST /api/v1/export
  -> ZIP/HTML offline
~~~

Jika fitur tambahan mengancam target tersebut, masukkan sebagai backlog dan
jangan mengerjakannya tanpa persetujuan tim.
