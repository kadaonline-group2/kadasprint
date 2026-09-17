# Internal AI Service Contract

> Arsip v1.1. Aturan WhatsApp dan `schemaVersion` yang berlaku sekarang
> mengikuti [addendum v1.2](WHATSAPP_NULLABLE_CONTRACT_v1.2.md).

Versi Dokumen: 1.1  
Status: Sinkron dengan Public API Contract v1.1  
Tanggal: 14 September 2026  
Pemilik kontrak: Dev 1 dan Dev 2

## 1. Tujuan

Dokumen ini mengatur komunikasi antara dua repository backend yang terpisah:

- `ai-website-builder-api` milik Dev 2, menggunakan Node.js, Express, dan
  TypeScript;
- `ai-website-builder-ai-service` milik Dev 1, menggunakan Python dan FastAPI.

Kontrak public antara frontend dan backend Dev 2 tetap mengikuti
`API_Contract_AI_Website_Builder_UMKM_v1.1.md`. Frontend tidak boleh memanggil
AI service Dev 1 secara langsung.

## 2. Topologi dan Kepemilikan

~~~text
Frontend Dev 3
    |
    | Public API /api/v1/*
    v
Backend/API Dev 2
    |
    | Internal API /internal/v1/*
    v
AI Service Dev 1
    |
    v
LLM Provider
~~~

### Dev 1 bertanggung jawab atas

- FastAPI application dan endpoint `/internal/v1/*` pada `llm_service.py` atau
  modul aplikasi yang setara.
- SDK dan API key provider LLM.
- System prompt dan prompt generation.
- Structured JSON output.
- Retry satu kali apabila output invalid.
- Intent extraction untuk revision.
- Tidak membocorkan prompt atau response mentah provider.

### Dev 2 bertanggung jawab atas

- Express application dan public endpoint `/api/v1/*`.
- Public API yang dipanggil frontend.
- Validasi request dari frontend.
- HTTP client ke AI service Dev 1.
- Timeout dan request ID propagation.
- Validasi response internal.
- Normalisasi dan validasi `WebsiteState`.
- Merge revision mutation dan regression guard.
- Mapping internal error menjadi public error.
- Server-side export melalui `/api/v1/export`. Endpoint export tidak memanggil
  AI service.

## 3. Base URL dan Environment

Development lokal:

~~~env
# Repository Dev 2
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
AI_SERVICE_BASE_URL=http://localhost:3001
AI_SERVICE_TIMEOUT_MS=45000
AI_SERVICE_TOKEN=

# Repository Dev 1
PORT=3001
INTERNAL_SERVICE_TOKEN=
LLM_API_KEY=
LLM_MODEL=
~~~

`AI_SERVICE_TOKEN` dan `INTERNAL_SERVICE_TOKEN` boleh kosong untuk development
lokal. Jika AI service dapat diakses melalui internet, keduanya wajib berisi
secret yang sama dan request menggunakan Bearer token.

API key LLM tidak boleh disimpan pada repository Dev 2.

## 4. Header Internal

Semua request Dev 2 ke Dev 1 menggunakan:

~~~http
Content-Type: application/json
Accept: application/json
X-Request-Id: req_abc123
Authorization: Bearer <AI_SERVICE_TOKEN>
~~~

Header `Authorization` hanya dapat dihilangkan pada development lokal yang
disepakati tim.

Dev 1 wajib menggunakan `X-Request-Id` yang diterima. Jika header tidak ada,
Dev 1 membuat request ID baru dan mengembalikannya dalam `meta.requestId`.

## 5. Format Response Internal

### 5.1 Berhasil

~~~json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_abc123",
    "attempts": 1,
    "isFallback": false,
    "latencyMs": 3500
  }
}
~~~

### 5.2 Gagal

~~~json
{
  "success": false,
  "error": {
    "code": "AI_PROVIDER_ERROR",
    "message": "AI service gagal memproses permintaan",
    "details": {}
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
~~~

`details` bersifat opsional dan tidak boleh berisi API key, system prompt,
stack trace, atau response mentah provider.

## 6. Health Check

### `GET /internal/v1/health`

Endpoint ini tidak memanggil provider LLM.

Response:

~~~json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "ai-website-builder-ai-service"
  },
  "meta": {
    "requestId": "req_health001"
  }
}
~~~

Public `GET /api/v1/health` pada Dev 2 memanggil endpoint ini agar health check
dapat memastikan backend orkestrasi dan AI Generation Service sama-sama
berjalan, sesuai Public API Contract v1.1. Jika internal health gagal atau
timeout, Dev 2 mengembalikan status non-2xx menggunakan public error envelope
tanpa membocorkan detail internal.

## 7. Generate Website

### `POST /internal/v1/generate`

Request body:

~~~json
{
  "businessDescription": "Warung Kopi Sejahtera, jual kopi tubruk dan roti bakar di Surabaya, target anak muda nugas, wa 08123456789",
  "schemaVersion": "1.0"
}
~~~

Validasi pada Dev 1:

- `businessDescription` wajib berupa string setelah trim.
- Panjang antara 10 dan 4000 karakter.
- `schemaVersion` wajib bernilai `1.0`.
- Output LLM harus mengikuti `website-state.schema.json` versi 1.0.

Response berhasil:

~~~json
{
  "success": true,
  "data": {
    "websiteState": "<WebsiteState lengkap>"
  },
  "meta": {
    "requestId": "req_abc123",
    "attempts": 1,
    "isFallback": false,
    "latencyMs": 3500
  }
}
~~~

`websiteState` di atas adalah placeholder dokumentasi. Response sebenarnya wajib
berupa object `WebsiteState` lengkap, bukan string.

Jika output pertama invalid, Dev 1 melakukan retry satu kali. Jika retry gagal,
Dev 1 dapat mengembalikan fallback `WebsiteState` yang valid dengan
`isFallback: true` atau error `AI_INVALID_OUTPUT`.

Dev 2 tetap wajib memvalidasi `websiteState`. Keberhasilan validasi di Dev 1
tidak menggantikan validasi pada trust boundary Dev 2.

## 8. Revision

### `POST /internal/v1/revise`

Request body:

~~~json
{
  "currentState": "<WebsiteState lengkap>",
  "instruction": "Ganti nuansa warna menjadi cokelat tua klasik",
  "schemaVersion": "1.0"
}
~~~

`currentState` sebenarnya wajib berupa object `WebsiteState` lengkap.

Dev 1 mengembalikan mutation terkontrol, bukan public API response dan bukan
HTML. Bentuk JSON normatif divalidasi dengan
`revision-mutation.schema.json`. Bentuk TypeScript ekuivalennya:

~~~ts
type RevisionIntent =
  | "UPDATE_THEME"
  | "UPDATE_COPY"
  | "ADD_SERVICE"
  | "UPDATE_CONTACT";

type RevisionMutation = {
  intent: RevisionIntent;
  changedPaths: string[];
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: "sans" | "serif" | "display";
  };
  meta?: {
    businessName?: string;
    category?: string;
    tagline?: string;
  };
  hero?: {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaWhatsappMessage?: string;
  };
  about?: {
    story?: string;
    highlights?: string[];
  };
  services?: {
    append?: Array<{
      name: string;
      description: string;
      priceEstimate: string;
      iconKeyword?: string;
    }>;
  };
  contact?: {
    whatsappNumber?: string;
    address?: string;
    instagram?: string;
  };
};
~~~

Response contoh perubahan warna:

~~~json
{
  "success": true,
  "data": {
    "mutation": {
      "intent": "UPDATE_THEME",
      "changedPaths": [
        "theme.primaryColor",
        "theme.accentColor"
      ],
      "theme": {
        "primaryColor": "#4A2C20",
        "accentColor": "#D7B899"
      }
    }
  },
  "meta": {
    "requestId": "req_def456",
    "attempts": 1,
    "isFallback": false,
    "latencyMs": 2800
  }
}
~~~

Aturan mutation:

- Hanya field yang akan berubah yang dikirim.
- Tidak boleh mengirim property di luar bentuk `RevisionMutation`.
- Tidak boleh mengirim nilai `null` untuk menghapus field wajib.
- Penambahan layanan menggunakan `services.append`.
- AI service tidak menerapkan mutation ke state lama.
- Dev 2 memvalidasi mutation, menerapkannya melalui whitelist merge, lalu
  memvalidasi hasil akhirnya terhadap `website-state.schema.json`.
- Section yang tidak tercantum harus tetap identik dengan `currentState`.
- Instruksi di luar scope MVP menghasilkan HTTP 422 dengan
  `AI_UNSUPPORTED_REVISION`.

## 9. Error Code Internal dan Mapping Public

| HTTP internal | Internal code | Mapping pada Dev 2 |
|---:|---|---|
| 400 | `AI_INVALID_REQUEST` | `INTERNAL_ERROR`; seharusnya dicegah validasi Dev 2 |
| 401 | `INTERNAL_UNAUTHORIZED` | `LLM_UNAVAILABLE` tanpa detail autentikasi |
| 422 | `AI_UNSUPPORTED_REVISION` | `UNSUPPORTED_REVISION` |
| 429 | `AI_RATE_LIMITED` | `RATE_LIMITED` atau fallback |
| 500 | `AI_INVALID_OUTPUT` | fallback; jika tidak tersedia `LLM_UNAVAILABLE` |
| 502 | `AI_PROVIDER_ERROR` | fallback; jika tidak tersedia `LLM_UNAVAILABLE` |
| 504 | `AI_TIMEOUT` | fallback; jika tidak tersedia `LLM_UNAVAILABLE` |

Dev 2 tidak boleh meneruskan internal error, nama provider, atau detail secret
secara mentah kepada frontend.

## 10. Timeout, Retry, dan Fallback

- Timeout HTTP Dev 2 ke Dev 1 dikendalikan oleh `AI_SERVICE_TIMEOUT_MS`.
- Nilai awal yang disarankan untuk MVP adalah 45.000 ms.
- Retry output invalid dilakukan di Dev 1 maksimal satu kali.
- Dev 2 tidak melakukan retry otomatis untuk request yang sudah mencapai Dev 1
  karena dapat menggandakan biaya LLM.
- Dev 2 boleh menggunakan fallback `WebsiteState` lokal jika AI service timeout
  atau unavailable.
- Revision gagal tidak boleh merusak state lama. Dev 2 mengembalikan state lama
  dengan `revisionApplied: false` sesuai public API contract.

## 11. Contract Synchronization

Kedua repository menyimpan salinan identik dari:

- `website-state.schema.json`;
- `revision-mutation.schema.json`;
- `AI_SERVICE_INTERNAL_CONTRACT_v1.1.md`.

Dev 2 menjadi owner public API contract. Dev 1 dan Dev 2 menjadi co-owner
internal contract.

Perubahan breaking wajib:

1. dibuat melalui Pull Request;
2. diberi nomor versi baru;
3. diinformasikan ke seluruh tim;
4. diterapkan pada kedua repository sebelum integration test.

Jangan mengganti nama field hanya pada satu repository.

## 12. Contract Test Minimum

Sebelum integrasi dianggap selesai, kedua service harus lulus:

- health check internal;
- generate dengan state valid;
- generate dengan response invalid;
- timeout AI service;
- provider unavailable;
- revision warna;
- revision penambahan service;
- unsupported revision;
- request ID propagation;
- internal token invalid ketika proteksi diaktifkan;
- preservation section setelah mutation diterapkan oleh Dev 2.
