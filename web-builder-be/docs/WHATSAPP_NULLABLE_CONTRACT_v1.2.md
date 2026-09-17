# Addendum Kontrak WhatsApp Nullable v1.2

Status: disetujui untuk integrasi terkoordinasi Dev 1, Dev 2, dan Dev 3.
Addendum ini menggantikan hanya aturan nomor WhatsApp dalam Public API Contract
v1.1 dan Internal AI Service Contract v1.1. Field dan endpoint lain tetap.

## WebsiteState

`contact.whatsappNumber` tetap wajib ada, tetapi nilainya `null` atau nomor
Indonesia ternormalisasi yang cocok dengan `^62[0-9]{8,13}$`. `null` berarti
pengguna belum memberikan nomor; kondisi ini bukan error dan tidak boleh
diganti dengan placeholder atau nomor yang tampak nyata. String kosong dan
nomor bertopeng seperti `628xxxxxxxxxx` tidak valid.

Pada generate, Dev 1 mengambil nomor valid dari deskripsi pengguna dan
menormalisasinya. Output LLM bukan bukti bahwa pengguna memberikan nomor.
Fallback mengikuti aturan yang sama. Dev 2 memvalidasi hasil dan
mempertahankan `null` pada API publik.

Pada revise, Dev 1 hanya boleh mengisi nomor yang muncul dalam instruksi.
Permintaan eksplisit untuk menghapus nomor boleh menghasilkan `null`. Karena
itu, mutation internal `UPDATE_CONTACT` menerima
`whatsappNumber: string | null`. Dev 2 menormalisasi nilai non-null,
memvalidasi state hasil merge, dan mempertahankan field lain.

Dev 3 tidak membuat link `wa.me` atau CTA WhatsApp yang bisa diklik ketika
nilainya `null`. Sebagai gantinya, tampilkan keterangan bahwa nomor belum
tersedia. HTML dalam ZIP export backend wajib sama. Nomor valid mengaktifkan
kembali link seperti biasa.

## Versi request internal dan rollout

Dev 2 mengirim `schemaVersion: "1.1"` ke Dev 1 untuk generate dan revise.
Dev 1 mewajibkan versi tersebut. Path dan bentuk request API publik tetap;
respons `WebsiteState` dan request revisi publik menerima field nullable.
Gabungkan atau deploy ketiga repo secara terkoordinasi: konsumen lama dapat
menolak `null`, sedangkan instance Dev 1 lama menolak versi skema baru.

Sebelum rollout, jalankan `npm test`, `npm run test:ai-integration`, dan
`npm run test:renderer-parity` di backend; `npm test` dan `npm run build` di
frontend; serta tes kontrak pytest terisolasi di Dev 1. Pengujian dengan
provider LLM asli adalah langkah terpisah.
