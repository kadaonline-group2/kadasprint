import { renderWebsite, templatePalettes } from "../renderer";
import type { ManualEdit } from "../manual-edit";
import type { TemplateId, WebsiteState } from "../types";
import { ManualEditPanel } from "./ManualEditPanel";

const templateOptions: Array<{ id: TemplateId; label: string; name: string }> =
  [
    { id: "template-services", label: "1", name: "Jasa" },
    { id: "template-fnb", label: "2", name: "F&B" },
    { id: "template-retail", label: "3", name: "Retail" },
  ];

interface PreviewPanelProps {
  website: WebsiteState;
  isSample: boolean;
  notice: string;
  viewport: "desktop" | "mobile";
  isGenerating: boolean;
  isDownloading: boolean;
  hasInvalidManualFields: boolean;
  imageName: string | null;
  imageApplied: boolean;
  isProcessingImage: boolean;
  heroImageDataUrl?: string;
  onViewportChange: (viewport: "desktop" | "mobile") => void;
  onTemplateChange: (templateId: TemplateId) => void;
  onManualEdit: (edit: ManualEdit) => void;
  onImageSelect: (file: File) => void;
  onImageApply: () => void;
  onImageRemove: () => void;
  onDownload: () => void;
  onCopyHtml: () => void;
}

function handlePreviewAnchorClick(event: MouseEvent) {
  const target = event.target as Element | null;
  if (typeof target?.closest !== "function") return;

  const link = target.closest('a[href^="#"]');
  if (!link) return;

  // A srcDoc link resolves against the builder URL, not the preview document.
  event.preventDefault();
  const sectionId = link.getAttribute("href")?.slice(1);
  if (sectionId) link.ownerDocument.getElementById(sectionId)?.scrollIntoView();
}

function enablePreviewAnchorNavigation(frame: HTMLIFrameElement) {
  const previewDocument = frame.contentDocument;
  if (!previewDocument) return;
  previewDocument.removeEventListener("click", handlePreviewAnchorClick);
  previewDocument.addEventListener("click", handlePreviewAnchorClick);
}

export function PreviewPanel({
  website,
  isSample,
  notice,
  viewport,
  isGenerating,
  isDownloading,
  hasInvalidManualFields,
  imageName,
  imageApplied,
  isProcessingImage,
  heroImageDataUrl,
  onViewportChange,
  onTemplateChange,
  onManualEdit,
  onImageSelect,
  onImageApply,
  onImageRemove,
  onDownload,
  onCopyHtml,
}: PreviewPanelProps) {
  return (
    <main className="preview-panel">
      <header className="preview-toolbar">
        <div>
          <span className="live-dot" />{" "}
          <span data-testid="preview-mode">
            {isSample ? "Preview contoh" : "Live preview"}
          </span>{" "}
          <span className="toolbar-divider">/</span>{" "}
          {website.meta.businessName}
        </div>
        <div className="toolbar-actions">
          <div className="template-control" aria-label="Pilih template website">
            <span className="template-control-label">Template</span>
            <div
              className="template-buttons"
              role="group"
              aria-label="Pilihan template"
            >
              {templateOptions.map((template) => (
                <button
                  className={website.templateId === template.id ? "active" : ""}
                  type="button"
                  key={template.id}
                  title={`Template ${template.label}: ${template.name}`}
                  aria-label={`Gunakan template ${template.label}: ${template.name}`}
                  aria-pressed={website.templateId === template.id}
                  disabled={isGenerating}
                  onClick={() => onTemplateChange(template.id)}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
          <div className="segmented-control">
            <button
              className={viewport === "desktop" ? "active" : ""}
              type="button"
              onClick={() => onViewportChange("desktop")}
            >
              Desktop
            </button>
            <button
              className={viewport === "mobile" ? "active" : ""}
              type="button"
              onClick={() => onViewportChange("mobile")}
            >
              Mobile
            </button>
          </div>
          <button
            className="download-button"
            type="button"
            onClick={onDownload}
            disabled={isDownloading || hasInvalidManualFields}
          >
            {isDownloading ? "..." : "Download"} <span>↓</span>
          </button>
          <button
            className="copy-button"
            type="button"
            onClick={onCopyHtml}
            disabled={isDownloading || hasInvalidManualFields}
          >
            Salin HTML
          </button>
        </div>
      </header>
      <div className="image-controls">
        <div>
          <strong>Gambar utama (opsional)</strong>
          <span>{isSample ? "Buat draft dulu untuk mengunggah foto." : imageName ? `${imageName}${imageApplied ? " · diterapkan" : " · belum diterapkan"}` : "Gunakan desain bawaan atau unggah foto usaha Anda."}</span>
        </div>
        <label className="image-picker" htmlFor="hero-image-input" aria-disabled={isSample || isGenerating || isProcessingImage}>
          {isProcessingImage ? "Memproses..." : "Pilih gambar"}
        </label>
        <input
          id="hero-image-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={isSample || isGenerating || isProcessingImage}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onImageSelect(file);
            event.currentTarget.value = "";
          }}
        />
        <button type="button" onClick={onImageApply} disabled={!imageName || imageApplied || isProcessingImage}>
          Terapkan gambar
        </button>
        <button type="button" onClick={onImageRemove} disabled={!imageApplied || isProcessingImage}>
          Gunakan tanpa gambar
        </button>
      </div>
      <div className="preview-workspace">
        <ManualEditPanel
          website={website}
          isSample={isSample}
          isGenerating={isGenerating}
          hasInvalidFields={hasInvalidManualFields}
          onEdit={onManualEdit}
        />
        <div className="preview-stage">
          <div className={`browser-frame ${viewport}`}>
            <div className="browser-chrome">
              <span />
              <span />
              <span />
              <small>
                {website.meta.businessName.toLowerCase().replace(/\s+/g, "-")}
                .site
              </small>
            </div>
            <iframe
              title="Website preview"
              srcDoc={renderWebsite(website, heroImageDataUrl)}
              onLoad={(event) => enablePreviewAnchorNavigation(event.currentTarget)}
            />
          </div>
        </div>
      </div>
      <footer className="status-bar">
        <span role="status">{notice}</span>
        <span>
          <i /> {isSample ? "Preview contoh / kontrak v1.1" : "Kontrak v1.1"}
        </span>
      </footer>
    </main>
  );
}

export function applyTemplatePalette(
  website: WebsiteState,
  templateId: TemplateId,
): WebsiteState {
  const palette = templatePalettes[templateId];
  return {
    ...website,
    templateId,
    theme: {
      ...website.theme,
      primaryColor: palette.primaryColor,
      accentColor: palette.accentColor,
    },
  };
}
