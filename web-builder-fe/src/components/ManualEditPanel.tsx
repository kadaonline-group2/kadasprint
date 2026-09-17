import type { ManualEdit } from "../manual-edit";
import type { WebsiteState } from "../types";

interface ManualEditPanelProps {
  website: WebsiteState;
  isSample: boolean;
  isGenerating: boolean;
  hasInvalidFields: boolean;
  onEdit: (edit: ManualEdit) => void;
}

export function ManualEditPanel({
  website,
  isSample,
  isGenerating,
  hasInvalidFields,
  onEdit,
}: ManualEditPanelProps) {
  return (
    <details className="manual-editor">
      <summary>
        <span>Edit manual</span>
        <small>Tanpa AI · langsung ke preview</small>
      </summary>
      {isSample ? (
        <p className="manual-editor-note">Buat draft dulu melalui chat untuk mulai mengedit.</p>
      ) : (
        <fieldset className="manual-editor-fields" disabled={isGenerating}>
          <legend className="sr-only">Field website yang bisa diedit</legend>
          <div className="manual-editor-grid">
            <label>
              Nama usaha
              <input
                type="text"
                value={website.meta.businessName}
                required
                aria-invalid={!website.meta.businessName.trim()}
                onChange={(event) => onEdit({ field: "businessName", value: event.target.value })}
              />
            </label>
            <label>
              Warna utama
              <input
                type="color"
                value={website.theme.primaryColor}
                onChange={(event) => onEdit({ field: "primaryColor", value: event.target.value })}
              />
            </label>
            <label>
              Judul utama
              <input
                type="text"
                value={website.hero.title}
                required
                aria-invalid={!website.hero.title.trim()}
                onChange={(event) => onEdit({ field: "heroTitle", value: event.target.value })}
              />
            </label>
            <label>
              Deskripsi utama
              <textarea
                value={website.hero.subtitle}
                rows={2}
                required
                aria-invalid={!website.hero.subtitle.trim()}
                onChange={(event) => onEdit({ field: "heroSubtitle", value: event.target.value })}
              />
            </label>
          </div>
          <h3>Menu / layanan</h3>
          <div className="manual-service-list">
            {website.services.map((service, index) => (
              <div className="manual-service-item" key={index}>
                <strong>Item {index + 1}</strong>
                <div className="manual-editor-grid">
                  <label>
                    Nama item {index + 1}
                    <input
                      type="text"
                      value={service.name}
                      required
                      aria-invalid={!service.name.trim()}
                      onChange={(event) => onEdit({ field: "service", index, serviceField: "name", value: event.target.value })}
                    />
                  </label>
                  <label>
                    Harga item {index + 1}
                    <input
                      type="text"
                      value={service.priceEstimate}
                      required
                      aria-invalid={!service.priceEstimate.trim()}
                      onChange={(event) => onEdit({ field: "service", index, serviceField: "priceEstimate", value: event.target.value })}
                    />
                  </label>
                  <label className="manual-editor-wide">
                    Deskripsi item {index + 1}
                    <textarea
                      value={service.description}
                      rows={2}
                      required
                      aria-invalid={!service.description.trim()}
                      onChange={(event) => onEdit({ field: "service", index, serviceField: "description", value: event.target.value })}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          {hasInvalidFields ? (
            <p className="manual-editor-error" role="alert">
              Isi semua kolom sebelum menyalin, mengunduh, atau meminta revisi.
            </p>
          ) : null}
        </fieldset>
      )}
    </details>
  );
}
