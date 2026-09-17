import { useEffect, useRef, useState } from "react";
import { websiteApi } from "./api";
import { copyText } from "./clipboard";
import { ChatPanel } from "./components/ChatPanel";
import { applyTemplatePalette, PreviewPanel } from "./components/PreviewPanel";
import { processHeroImage, type HeroImage } from "./hero-image";
import { applyManualEdit, areManualFieldsValid } from "./manual-edit";
import { mockWebsite } from "./mock";
import { renderWebsite } from "./renderer";
import {
  WebsiteApiError,
  type ChatMessage,
  type TemplateId,
  type WebsiteState,
} from "./types";

const generateSteps = [
  "Menyusun hero section...",
  "Menyusun tentang kami...",
  "Menyusun layanan dan testimoni...",
];

const reviseSteps = [
  "Menerapkan perubahan...",
  "Menjaga section lain tetap utuh...",
];

function App() {
  const [website, setWebsite] = useState<WebsiteState>(mockWebsite);
  const [hasGenerated, setHasGenerated] = useState(false);
  const websiteRef = useRef(website);
  websiteRef.current = website;
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRetryingGeneration, setIsRetryingGeneration] = useState(false);
  const [retryPrompt, setRetryPrompt] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HeroImage | null>(null);
  const [imageApplied, setImageApplied] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [notice, setNotice] = useState("Preview contoh siap diedit");
  const [progressText, setProgressText] = useState(generateSteps[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Ceritakan usaha kamu. Sertakan nama, produk atau layanan, lokasi, dan nomor WhatsApp jika ada. Aku akan menyusun draft pertamanya.",
    },
  ]);
  const hasInvalidManualFields = hasGenerated && !areManualFieldsValid(website);

  useEffect(() => {
    if (!isGenerating) return;
    const steps = hasGenerated && !isRetryingGeneration ? reviseSteps : generateSteps;
    setProgressText(steps[0]);
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % steps.length;
      setProgressText(steps[index]);
    }, 700);
    return () => window.clearInterval(timer);
  }, [isGenerating, hasGenerated, isRetryingGeneration]);

  async function submitPrompt(value = prompt, forceGenerate = false) {
    if (isGenerating) return;
    const isRevision = hasGenerated && !forceGenerate;
    const cleanPrompt = value.trim();
    if (!cleanPrompt) {
      setNotice("Tulis instruksi dulu sebelum mengirim.");
      return;
    }
    if (!isRevision && (cleanPrompt.length < 10 || cleanPrompt.length > 4000)) {
      setNotice("Deskripsi usaha harus terdiri dari 10–4000 karakter.");
      return;
    }
    if (isRevision && !areManualFieldsValid(websiteRef.current)) {
      setNotice("Isi semua kolom edit manual sebelum meminta revisi lewat chat.");
      return;
    }

    setPrompt("");
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text: cleanPrompt },
    ]);
    setIsRetryingGeneration(forceGenerate);
    setIsGenerating(true);
    setNotice(isRevision ? "Menyusun revisi..." : "Menyusun draft pertama...");
    try {
      const result = isRevision
        ? await websiteApi.revise({
            currentState: websiteRef.current,
            instruction: cleanPrompt,
          })
        : await websiteApi.generate({ businessDescription: cleanPrompt });
      const revisionFailed = isRevision && result.revisionApplied === false;
      setWebsite(result.state);
      setHasGenerated(true);
      if (!isRevision) setRetryPrompt(result.isFallback ? cleanPrompt : null);
      else if (!revisionFailed) setRetryPrompt(null);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: revisionFailed
            ? "Revisi belum berhasil. Preview tetap seperti sebelumnya. Coba instruksi lain."
            : !isRevision && result.isFallback
              ? "AI belum berhasil membuat draft sesuai deskripsi. Yang terlihat adalah draft fallback, bukan hasil untuk usaha Anda. Klik Coba buat ulang untuk mengirim deskripsi yang sama."
            : !isRevision && result.state.contact.whatsappNumber === null
              ? "Draft pertama siap. Nomor WhatsApp belum tersedia; kirim nomor melalui chat untuk mengaktifkan tombol."
            : result.isFallback
              ? "Preview diperbarui dengan data fallback. Coba instruksi lain untuk mengeksplorasi tampilannya."
              : isRevision
                ? "Preview diperbarui. Coba instruksi lain untuk mengeksplorasi tampilannya."
                : "Draft pertama siap. Minta perubahan warna, teks, atau tambah item lewat chat.",
        },
      ]);
      setNotice(
        revisionFailed
          ? "Revisi tidak diterapkan. Preview tetap seperti sebelumnya."
          : !isRevision && result.isFallback
            ? "Draft fallback — AI belum berhasil. Coba buat ulang."
          : !isRevision && result.state.contact.whatsappNumber === null
            ? "Draft siap — nomor WhatsApp belum tersedia"
          : result.isFallback
            ? result.fallbackReason
              ? `Preview diperbarui dengan fallback: ${result.fallbackReason}`
              : "Preview diperbarui dengan fallback"
            : isRevision
              ? "Preview diperbarui"
              : "Draft pertama siap",
      );
    } catch (error) {
      if (!isRevision) setRetryPrompt(cleanPrompt);
      setNotice(
        error instanceof WebsiteApiError
          ? error.message
          : "Perubahan gagal dibuat. Coba lagi.",
      );
    } finally {
      setIsGenerating(false);
      setIsRetryingGeneration(false);
    }
  }

  async function downloadWebsite() {
    if (!areManualFieldsValid(websiteRef.current)) {
      setNotice("Isi semua kolom edit manual sebelum mengunduh website.");
      return;
    }
    setIsDownloading(true);
    setNotice("Menyiapkan file website...");
    try {
      await websiteApi.download(websiteRef.current, imageApplied ? selectedImage?.dataUrl : undefined);
      setNotice("File website siap diunduh");
    } catch (error) {
      setNotice(
        error instanceof WebsiteApiError
          ? error.message
          : "Export website gagal. Coba lagi.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  async function copyHtml() {
    if (!areManualFieldsValid(websiteRef.current)) {
      setNotice("Isi semua kolom edit manual sebelum menyalin HTML.");
      return;
    }
    try {
      await copyText(renderWebsite(websiteRef.current, imageApplied ? selectedImage?.dataUrl : undefined));
      setNotice("Kode HTML disalin ke clipboard");
    } catch {
      setNotice("Gagal menyalin HTML. Coba unduh filenya.");
    }
  }

  function changeTemplate(templateId: TemplateId) {
    setWebsite((current) => applyTemplatePalette(current, templateId));
  }

  async function selectImage(file: File) {
    setIsProcessingImage(true);
    setNotice("Memproses gambar...");
    try {
      const image = await processHeroImage(file);
      setSelectedImage(image);
      setImageApplied(false);
      setNotice("Gambar siap. Klik Terapkan gambar untuk melihatnya di website.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gambar gagal diproses.");
    } finally {
      setIsProcessingImage(false);
    }
  }

  return (
    <div className="app-shell">
      <ChatPanel
        messages={messages}
        prompt={prompt}
        isGenerating={isGenerating}
        hasGenerated={hasGenerated}
        isRevising={isGenerating && hasGenerated && !isRetryingGeneration}
        canRetryGenerate={retryPrompt !== null}
        progressText={progressText}
        onPromptChange={setPrompt}
        onSubmit={(value) => void submitPrompt(value)}
        onRetryGenerate={() => {
          if (retryPrompt) void submitPrompt(retryPrompt, true);
        }}
      />
      <PreviewPanel
        website={website}
        isSample={!hasGenerated}
        notice={notice}
        viewport={viewport}
        isGenerating={isGenerating}
        isDownloading={isDownloading}
        hasInvalidManualFields={hasInvalidManualFields}
        imageName={selectedImage?.name ?? null}
        imageApplied={imageApplied}
        isProcessingImage={isProcessingImage}
        heroImageDataUrl={imageApplied ? selectedImage?.dataUrl : undefined}
        onViewportChange={setViewport}
        onTemplateChange={changeTemplate}
        onManualEdit={(edit) => {
          if (!hasGenerated || isGenerating) return;
          setWebsite((current) => applyManualEdit(current, edit));
          setNotice("Edit manual tersimpan pada preview.");
        }}
        onImageSelect={(file) => void selectImage(file)}
        onImageApply={() => {
          setImageApplied(true);
          setNotice("Gambar diterapkan pada preview dan akan ikut dalam unduhan.");
        }}
        onImageRemove={() => {
          setImageApplied(false);
          setNotice("Website kembali memakai desain tanpa gambar.");
        }}
        onDownload={() => void downloadWebsite()}
        onCopyHtml={() => void copyHtml()}
      />
    </div>
  );
}

export default App;
