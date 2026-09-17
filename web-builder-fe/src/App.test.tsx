import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { sampleWebsite } from "./test/fixtures";
import { WebsiteApiError } from "./types";

const generate = vi.fn();
const revise = vi.fn();
const download = vi.fn();
const copyText = vi.fn();
const processHeroImage = vi.fn();
const imageDataUrl = "data:image/webp;base64,AQID";

vi.mock("./api", () => ({
  websiteApi: {
    generate: (...args: unknown[]) => generate(...args),
    revise: (...args: unknown[]) => revise(...args),
    download: (...args: unknown[]) => download(...args),
  },
}));

vi.mock("./clipboard", () => ({
  copyText: (...args: unknown[]) => copyText(...args),
}));

vi.mock("./hero-image", () => ({
  processHeroImage: (...args: unknown[]) => processHeroImage(...args),
}));

describe("App workflow", () => {
  beforeEach(() => {
    generate.mockReset();
    revise.mockReset();
    download.mockReset();
    copyText.mockReset();
    processHeroImage.mockReset();
    copyText.mockResolvedValue(undefined);
    processHeroImage.mockResolvedValue({ name: "foto.webp", dataUrl: imageDataUrl });
    generate.mockResolvedValue({
      state: {
        ...sampleWebsite,
        hero: { ...sampleWebsite.hero, title: "Draft pertama" },
      },
      isFallback: false,
    });
    revise.mockResolvedValue({
      state: {
        ...sampleWebsite,
        theme: {
          ...sampleWebsite.theme,
          primaryColor: "#5C3317",
        },
      },
      isFallback: false,
    });
  });

  it("labels the initial preview as a sample and generates on first submit", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId("preview-mode")).toHaveTextContent("Preview contoh");
    expect(screen.getByRole("button", { name: /contoh usaha kopi/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ganti warna cokelat tua/i })).not.toBeInTheDocument();
    const input = screen.getByPlaceholderText(/contoh:/i);
    await user.type(
      input,
      "Warung Kopi Sejahtera, jual kopi tubruk dan roti bakar di Surabaya",
    );
    await user.click(screen.getByRole("button", { name: /kirim/i }));
    await waitFor(() => {
      expect(generate).toHaveBeenCalledTimes(1);
    });
    expect(revise).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId("preview-mode")).toHaveTextContent("Live preview");
    });
    expect(screen.queryByRole("button", { name: /contoh usaha kopi/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ganti warna cokelat tua/i })).toBeInTheDocument();
    expect(screen.getByTitle("Website preview")).toHaveAttribute(
      "srcdoc",
      expect.stringContaining("Draft pertama"),
    );
  });

  it("revises with the full current state after the first draft exists", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /contoh usaha kopi/i }));
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    await user.type(
      screen.getByPlaceholderText(/contoh:/i),
      "Ganti nuansa warna jadi cokelat tua klasik",
    );
    await user.keyboard("{Enter}");
    await waitFor(() => expect(revise).toHaveBeenCalledTimes(1));
    expect(revise.mock.calls[0][0].currentState.hero.title).toBe("Draft pertama");
    expect(revise.mock.calls[0][0].instruction).toContain("cokelat tua klasik");
  });

  it("keeps the current preview when generate fails", async () => {
    generate.mockRejectedValue(
      new WebsiteApiError({
        code: "LLM_UNAVAILABLE",
        message: "Layanan AI sedang tidak tersedia.",
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByPlaceholderText(/contoh:/i), "Usaha jasa desain");
    await user.click(screen.getByRole("button", { name: /kirim/i }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Layanan AI sedang tidak tersedia.",
      );
    });
    expect(screen.getByTestId("preview-mode")).toHaveTextContent("Preview contoh");
    expect(screen.getByTitle("Website preview")).toHaveAttribute(
      "srcdoc",
      expect.stringContaining("Warung Kopi Sejahtera"),
    );
  });

  it("explains fallback responses without blocking the new state", async () => {
    generate.mockResolvedValue({
      state: sampleWebsite,
      isFallback: true,
      fallbackReason: "REVISION_FAILED",
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /contoh usaha kopi/i }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/fallback/i);
    });
    expect(screen.getByTestId("preview-mode")).toHaveTextContent("Live preview");
    expect(screen.getByText(/bukan hasil untuk usaha anda/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /coba buat ulang/i })).toBeInTheDocument();
  });

  it("retries a fallback generation with the original description instead of revising", async () => {
    const user = userEvent.setup();
    generate
      .mockResolvedValueOnce({ state: sampleWebsite, isFallback: true })
      .mockResolvedValueOnce({
        state: { ...sampleWebsite, meta: { ...sampleWebsite.meta, businessName: "Kopi Senja" } },
        isFallback: false,
      });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /contoh usaha kopi/i }));
    const retry = await screen.findByRole("button", { name: /coba buat ulang/i });
    await user.click(retry);

    await waitFor(() => expect(generate).toHaveBeenCalledTimes(2));
    expect(generate.mock.calls[1][0]).toEqual(generate.mock.calls[0][0]);
    expect(revise).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTitle("Website preview")).toHaveAttribute(
      "srcdoc", expect.stringContaining("Kopi Senja"),
    ));
    expect(screen.queryByRole("button", { name: /coba buat ulang/i })).not.toBeInTheDocument();
  });

  it("does not submit blank messages", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /kirim/i }));
    expect(generate).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/instruksi/i);
  });

  it("edits draft fields locally and sends the edited state to preview and export", async () => {
    generate.mockResolvedValue({
      state: {
        ...sampleWebsite,
        contact: { ...sampleWebsite.contact, whatsappNumber: null },
      },
      isFallback: false,
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Edit manual"));
    expect(screen.getByText(/buat draft dulu melalui chat/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Nama usaha")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /contoh usaha kopi/i }));
    await waitFor(() => expect(screen.getByLabelText("Nama usaha")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Nama usaha"), { target: { value: "Kopi Pagi" } });
    fireEvent.change(screen.getByLabelText("Judul utama"), { target: { value: "Mulai hari dengan kopi" } });
    fireEvent.change(screen.getByLabelText("Deskripsi utama"), { target: { value: "Kopi segar setiap pagi." } });
    fireEvent.change(screen.getByLabelText("Nama item 2"), { target: { value: "Roti Panggang" } });
    fireEvent.change(screen.getByLabelText("Deskripsi item 2"), { target: { value: "Roti hangat untuk sarapan." } });
    fireEvent.change(screen.getByLabelText("Harga item 2"), { target: { value: "Rp19.000" } });
    fireEvent.change(screen.getByLabelText("Warna utama"), { target: { value: "#123456" } });

    const previewHtml = screen.getByTitle("Website preview").getAttribute("srcdoc") ?? "";
    for (const text of ["Kopi Pagi", "Mulai hari dengan kopi", "Kopi segar setiap pagi.", "Roti Panggang", "Roti hangat untuk sarapan.", "Rp19.000", "--primary:#123456"]) {
      expect(previewHtml).toContain(text);
    }
    expect(previewHtml).not.toContain("https://wa.me/");
    expect(screen.getByTestId("preview-mode")).toHaveTextContent("Live preview");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(revise).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Salin HTML" }));
    expect(copyText).toHaveBeenCalledWith(previewHtml);
    await user.click(screen.getByRole("button", { name: /^download/i }));
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
    const downloadedState = download.mock.calls[0][0];
    expect(downloadedState.meta.businessName).toBe("Kopi Pagi");
    expect(downloadedState.hero.title).toBe("Mulai hari dengan kopi");
    expect(downloadedState.services[1]).toMatchObject({ name: "Roti Panggang", description: "Roti hangat untuk sarapan.", priceEstimate: "Rp19.000" });
    expect(downloadedState.theme.primaryColor).toBe("#123456");
    expect(downloadedState.contact.whatsappNumber).toBeNull();
    expect(download.mock.calls[0][1]).toBeUndefined();
  });

  it("holds export while a required manual field is blank", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /contoh usaha kopi/i }));
    await waitFor(() => expect(screen.getByTestId("preview-mode")).toHaveTextContent("Live preview"));
    await user.click(screen.getByText("Edit manual"));

    fireEvent.change(screen.getByLabelText("Nama item 1"), { target: { value: "   " } });
    expect(screen.getByRole("alert")).toHaveTextContent(/isi semua kolom/i);
    expect(screen.getByRole("button", { name: /^download/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salin HTML" })).toBeDisabled();
    expect(download).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText(/contoh:/i), "Ganti warna jadi biru");
    await user.click(screen.getByRole("button", { name: /kirim/i }));
    expect(revise).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/isi semua kolom edit manual/i);

    fireEvent.change(screen.getByLabelText("Nama item 1"), { target: { value: "Kopi Baru" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^download/i })).toBeEnabled();
  });

  it("applies an uploaded image only on request and keeps it out of LLM payloads", async () => {
    const user = userEvent.setup();
    render(<App />);
    const upload = screen.getByLabelText("Pilih gambar", { selector: "input" });
    expect(upload).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /contoh usaha kopi/i }));
    await waitFor(() => expect(upload).not.toBeDisabled());
    await user.upload(upload, new File(["image"], "foto.webp", { type: "image/webp" }));
    await waitFor(() => expect(processHeroImage).toHaveBeenCalledTimes(1));
    expect(screen.getByTitle("Website preview").getAttribute("srcdoc")).not.toContain(imageDataUrl);

    await user.click(screen.getByRole("button", { name: "Terapkan gambar" }));
    expect(screen.getByTitle("Website preview").getAttribute("srcdoc")).toContain(imageDataUrl);
    await user.click(screen.getByRole("button", { name: /ganti warna cokelat tua/i }));
    await waitFor(() => expect(revise).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(revise.mock.calls[0][0])).not.toContain(imageDataUrl);
    expect(screen.getByTitle("Website preview").getAttribute("srcdoc")).toContain(imageDataUrl);

    await user.click(screen.getByRole("button", { name: /salin html/i }));
    await waitFor(() => expect(copyText).toHaveBeenCalledWith(expect.stringContaining(imageDataUrl)));
    await user.click(screen.getByRole("button", { name: /^download/i }));
    await waitFor(() => expect(download).toHaveBeenCalledWith(expect.anything(), imageDataUrl));

    await user.click(screen.getByRole("button", { name: "Gunakan tanpa gambar" }));
    expect(screen.getByTitle("Website preview").getAttribute("srcdoc")).not.toContain(imageDataUrl);
    await user.click(screen.getByRole("button", { name: /^download/i }));
    await waitFor(() => expect(download).toHaveBeenLastCalledWith(expect.anything(), undefined));
  });

  it("keeps the previous preview when an image cannot be processed", async () => {
    processHeroImage.mockRejectedValue(new Error("Pilih gambar JPG, PNG, atau WebP yang valid."));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /contoh usaha kopi/i }));
    const previous = screen.getByTitle("Website preview").getAttribute("srcdoc");
    await user.upload(
      screen.getByLabelText("Pilih gambar", { selector: "input" }),
      new File(["invalid"], "bad.png", { type: "image/png" }),
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("gambar JPG, PNG, atau WebP yang valid"));
    expect(screen.getByTitle("Website preview").getAttribute("srcdoc")).toBe(previous);
  });

  it("explains how to activate WhatsApp when a draft has no number", async () => {
    generate.mockResolvedValue({
      state: {
        ...sampleWebsite,
        contact: { ...sampleWebsite.contact, whatsappNumber: null },
      },
      isFallback: false,
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /contoh usaha kopi/i }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("nomor WhatsApp belum tersedia");
    });
    expect(screen.getByText(/kirim nomor melalui chat untuk mengaktifkan tombol/i)).toBeInTheDocument();
    expect(screen.getByTitle("Website preview").getAttribute("srcdoc")).not.toContain("https://wa.me/");
  });

  it("checks the generate description length before calling the backend", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByPlaceholderText(/contoh:/i);

    fireEvent.change(input, { target: { value: "Kopi" } });
    await user.click(screen.getByRole("button", { name: /kirim/i }));
    expect(generate).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/10–4000 karakter/i);

    fireEvent.change(input, { target: { value: "a".repeat(4001) } });
    await user.click(screen.getByRole("button", { name: /kirim/i }));
    expect(generate).not.toHaveBeenCalled();
  });

  it("keeps the preview and reports when a revision was not applied", async () => {
    const user = userEvent.setup();
    revise.mockImplementation(async ({ currentState }) => ({
      state: currentState,
      isFallback: true,
      revisionApplied: false,
      fallbackReason: "REVISION_FAILED",
    }));
    render(<App />);
    await user.click(screen.getByRole("button", { name: /contoh usaha kopi/i }));
    await waitFor(() => expect(screen.getByTestId("preview-mode")).toHaveTextContent("Live preview"));
    const preview = screen.getByTitle("Website preview").getAttribute("srcdoc");

    await user.click(screen.getByRole("button", { name: /ganti warna cokelat tua/i }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Revisi tidak diterapkan"));
    expect(screen.getByTitle("Website preview").getAttribute("srcdoc")).toBe(preview);
  });

  it("shows stepwise progress while generating", async () => {
    let finishGenerate: ((value: unknown) => void) | undefined;
    generate.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishGenerate = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /contoh usaha kopi/i }));
    expect(await screen.findByTestId("progress-status")).toHaveTextContent(
      /menyusun hero section/i,
    );
    finishGenerate?.({
      state: {
        ...sampleWebsite,
        hero: { ...sampleWebsite.hero, title: "Draft pertama" },
      },
      isFallback: false,
    });
    await waitFor(() => {
      expect(screen.queryByTestId("progress-status")).not.toBeInTheDocument();
    });
  });

  it("copies standalone HTML as an export fallback", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Salin HTML" }));
    await waitFor(() => {
      expect(copyText).toHaveBeenCalledTimes(1);
    });
    expect(String(copyText.mock.calls[0][0])).toContain("Warung Kopi Sejahtera");
    expect(String(copyText.mock.calls[0][0])).toContain(
      "https://wa.me/628123456789",
    );
    expect(screen.getByRole("status")).toHaveTextContent(/disalin/i);
  });
});
