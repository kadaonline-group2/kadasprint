import type { ChatMessage } from "../types";

export const DEMO_BUSINESS_PROMPT =
  "Warung Kopi Sejahtera, jual kopi tubruk dan roti bakar di Surabaya, target anak muda nugas, wa 08123456789";

export const DEMO_SERVICE_PROMPT =
  "Barbershop Ganteng, jasa potong rambut pria di Bandung, target mahasiswa, wa 08123456789";

export const quickPrompts = [
  {
    id: "demo-business",
    stage: "generate",
    label: "Contoh usaha kopi",
    prompt: DEMO_BUSINESS_PROMPT,
  },
  {
    id: "demo-service",
    stage: "generate",
    label: "Contoh usaha jasa",
    prompt: DEMO_SERVICE_PROMPT,
  },
  {
    id: "color-navy",
    stage: "revise",
    label: "Ganti warna navy",
    prompt: "Tolong ubah warna dominan jadi navy blue",
  },
  {
    id: "color",
    stage: "revise",
    label: "Ganti warna cokelat tua",
    prompt: "Ganti nuansa warna jadi cokelat tua klasik",
  },
  {
    id: "add-menu",
    stage: "revise",
    label: "Tambah pisang goreng keju",
    prompt: "Tambahkan menu baru: Pisang Goreng Keju harga 15 ribu",
  },
];

interface ChatPanelProps {
  messages: ChatMessage[];
  prompt: string;
  isGenerating: boolean;
  hasGenerated: boolean;
  isRevising: boolean;
  canRetryGenerate: boolean;
  progressText: string;
  onPromptChange: (value: string) => void;
  onSubmit: (value?: string) => void;
  onRetryGenerate: () => void;
}

export function ChatPanel({
  messages,
  prompt,
  isGenerating,
  hasGenerated,
  isRevising,
  canRetryGenerate,
  progressText,
  onPromptChange,
  onSubmit,
  onRetryGenerate,
}: ChatPanelProps) {
  return (
    <aside className="chat-panel">
      <div className="brand-lockup">
        <span className="brand-mark">R</span>
        <div>
          <strong>Nama Studio</strong>
          <span>AI website builder</span>
        </div>
      </div>
      <div className="chat-heading">
        <p className="kicker">Workspace / Draft 01</p>
        <h1>Bangun situs yang terasa seperti kamu.</h1>
        <p>
          Ceritakan nama usaha, produk atau layanan, lokasi, dan nomor WhatsApp jika ada.
          Contoh: {DEMO_BUSINESS_PROMPT}
        </p>
      </div>
      <div className="message-list">
        {messages.map((message) => (
          <div className={`message ${message.role}`} key={message.id}>
            <span>
              {message.role === "assistant" ? "Nama Studio" : "Kamu"}
            </span>
            <p>{message.text}</p>
          </div>
        ))}
        {isGenerating ? (
          <div className="message assistant progress" data-testid="progress-status">
            <span>Nama Studio</span>
            <p>{progressText}</p>
          </div>
        ) : null}
      </div>
      <div className="composer">
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (event.shiftKey) return;
            event.preventDefault();
            onSubmit();
          }}
          placeholder="Contoh: nama usaha, produk, lokasi, dan nomor WhatsApp jika ada"
          rows={3}
          disabled={isGenerating}
        />
        <div className="composer-footer">
          <span>Enter kirim · Shift+Enter baris baru</span>
          <button
            className="send-button"
            type="button"
            onClick={() => onSubmit()}
            disabled={isGenerating}
          >
            {isGenerating ? (isRevising ? "Merevisi..." : "Menyusun...") : "Kirim"}{" "}
            <span>↗</span>
          </button>
        </div>
      </div>
      {canRetryGenerate ? (
        <button
          className="retry-generate-button"
          type="button"
          onClick={onRetryGenerate}
          disabled={isGenerating}
        >
          Coba buat ulang dengan deskripsi sebelumnya
        </button>
      ) : null}
      <div className="quick-prompts">
        <span className="kicker">Coba cepat</span>
        {quickPrompts
          .filter((item) => item.stage === (hasGenerated ? "revise" : "generate"))
          .map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => onSubmit(item.prompt)}
              disabled={isGenerating}
            >
              {item.label} <span>↗</span>
            </button>
          ))}
      </div>
    </aside>
  );
}
