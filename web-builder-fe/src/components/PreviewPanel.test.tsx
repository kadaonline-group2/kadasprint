import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { withTemplate } from "../test/fixtures";
import type { TemplateId } from "../types";
import { PreviewPanel } from "./PreviewPanel";

describe("preview navigation", () => {
  it.each<TemplateId>(["template-fnb", "template-services", "template-retail"])(
    "keeps %s section links inside the preview",
    (templateId) => {
      render(
        <PreviewPanel
          website={withTemplate(templateId)}
          isSample={false}
          notice="Ready"
          viewport="desktop"
          isGenerating={false}
          isDownloading={false}
          hasInvalidManualFields={false}
          imageName={null}
          imageApplied={false}
          isProcessingImage={false}
          onViewportChange={vi.fn()}
          onTemplateChange={vi.fn()}
          onManualEdit={vi.fn()}
          onImageSelect={vi.fn()}
          onImageApply={vi.fn()}
          onImageRemove={vi.fn()}
          onDownload={vi.fn()}
          onCopyHtml={vi.fn()}
        />,
      );

      const frame = screen.getByTitle("Website preview") as HTMLIFrameElement;
      const previewDocument = frame.contentDocument!;
      const html = frame.getAttribute("srcdoc")!;
      previewDocument.body.innerHTML = new DOMParser().parseFromString(html, "text/html").body.innerHTML;
      fireEvent.load(frame);

      const links = previewDocument.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        const section = previewDocument.getElementById(link.getAttribute("href")!.slice(1));
        expect(section).not.toBeNull();
        const scrollIntoView = vi.fn();
        Object.defineProperty(section, "scrollIntoView", { configurable: true, value: scrollIntoView });

        const click = new MouseEvent("click", { bubbles: true, cancelable: true });
        expect((link.firstElementChild ?? link).dispatchEvent(click)).toBe(false);
        expect(scrollIntoView).toHaveBeenCalledOnce();
      }
    },
  );
});
