import type { WebsiteState } from "../types";
import { wrapDocument, escapeHtml } from "./html";
import { renderHeroImage } from "./hero-image";
import { iconGlyph } from "./icons";
import {
  instagramHandle,
  instagramUrl,
  whatsappAction,
} from "./links";
import { rootCss } from "./theme";

const css = `
${""}
.page{min-height:100vh;background:#f4f1eb;color:#20221f}
.site-header{margin:auto;display:flex;max-width:1100px;align-items:center;justify-content:space-between;padding:24px 32px}
.brand{font-size:14px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;text-decoration:none}
.nav{display:none;align-items:center;gap:32px;font-size:14px}
.nav a{text-decoration:none}
.nav-cta{border-radius:999px;background:var(--ink);color:var(--paper);padding:10px 20px}
.hero{margin:auto;display:grid;max-width:1100px;gap:48px;padding:80px 32px 96px}
.eyebrow{margin:0 0 24px;font-size:11px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:var(--accent)}
.hero h1{margin:0;max-width:18ch;font-size:clamp(42px,8vw,92px);font-weight:500;line-height:.98;letter-spacing:-.05em}
.hero-copy p{margin:0 0 32px;font-size:18px;line-height:1.7;color:var(--muted)}
.hero-media{grid-column:1/-1;aspect-ratio:16/9;overflow:hidden;background:var(--primary)}
.hero-upload{display:block;width:100%;height:100%;object-fit:cover}
.text-link{display:inline-flex;gap:8px;border-bottom:1px solid var(--ink);padding-bottom:6px;font-size:14px;font-weight:700;text-decoration:none}
.about{border-block:1px solid #d8d3c9;background:#e9e4db}
.about-grid,.services-wrap,.quotes,.contact-grid,.site-footer{margin:auto;max-width:1100px;padding:72px 32px}
.about-grid{display:grid;gap:40px}
.about h2{margin:0;font-size:clamp(28px,4vw,48px);font-weight:500;letter-spacing:-.03em}
.about .story{margin:32px 0 0;max-width:640px;color:var(--muted)}
.highlights{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.highlight{border:1px solid #d8d3c9;border-radius:999px;padding:8px 14px;color:var(--primary);font-size:13px;font-weight:700}
.services-head{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:36px}
.services-head h2{margin:0;font-size:clamp(32px,5vw,52px);font-weight:500;letter-spacing:-.04em}
.service-list{border-block:1px solid #d8d3c9}
.service{display:grid;gap:8px;padding:28px 0;border-bottom:1px solid #d8d3c9}
.service:last-child{border-bottom:0}
.service-index{color:var(--accent);font-size:13px}
.service h3{margin:0;font-size:24px;font-weight:500}
.service p{margin:0;color:var(--muted);font-size:14px}
.price{color:var(--primary);font-weight:700}
.quotes h2{margin:8px 0 28px;font-size:clamp(28px,4vw,44px);font-weight:500}
.quote-grid{display:grid;gap:24px}
.quote{margin:0;border-top:1px solid #d8d3c9;padding-top:20px}
.quote p{margin:0;font-size:20px}
.quote cite{display:block;margin-top:12px;color:var(--muted);font-style:normal}
.contact{background:var(--ink);color:var(--paper)}
.contact-grid{display:grid;gap:48px}
.contact h2{margin:0;max-width:16ch;font-size:clamp(32px,5vw,64px);font-weight:500;letter-spacing:-.04em}
.contact p,.contact a{color:#b8bab2}
.wa-link{display:inline-block;border-bottom:1px solid var(--accent);padding-bottom:6px;color:var(--accent)!important;text-decoration:none}
.site-footer{display:flex;justify-content:space-between;gap:16px;border-top:1px solid #444640;padding-top:24px;padding-bottom:24px;color:#8e9188;font-size:12px}
@media (min-width:760px){
  .nav{display:flex}
  .hero{grid-template-columns:1.1fr .9fr;align-items:end}
  .about-grid{grid-template-columns:.75fr 1.25fr}
  .service{grid-template-columns:72px 1.1fr 1.3fr auto;align-items:center}
  .quote-grid{grid-template-columns:1fr 1fr}
  .contact-grid{grid-template-columns:1fr 1fr}
}
@media (max-width:759px){
  .hero,.about-grid,.services-wrap,.quotes,.contact-grid,.site-footer{padding-left:20px;padding-right:20px}
}
`;

export function renderServicesTemplate(state: WebsiteState, heroImageDataUrl?: string): string {
  const wa = (label: string, className?: string) =>
    whatsappAction(state.contact.whatsappNumber, state.hero.ctaWhatsappMessage, label, className);
  const instagram = instagramHandle(state.contact.instagram ?? "");
  const highlights = state.about.highlights ?? [];
  const heroImage = renderHeroImage(heroImageDataUrl, state.meta.businessName);
  const body = `
<main class="page template-services">
  <header class="site-header">
    <a class="brand" href="#top">${escapeHtml(state.meta.businessName)}</a>
    <nav class="nav" aria-label="Navigasi utama">
      <a href="#tentang">Tentang</a>
      <a href="#layanan">Layanan</a>
      ${wa("Hubungi Kami", "nav-cta")}
    </nav>
  </header>
  <section class="hero" id="top">
    <div>
      <p class="eyebrow">${escapeHtml(state.meta.tagline)}</p>
      <h1>${escapeHtml(state.hero.title)}</h1>
    </div>
    <div class="hero-copy">
      <p>${escapeHtml(state.hero.subtitle)}</p>
      ${wa(`${state.hero.ctaText} ↗`, "text-link")}
    </div>
    ${heroImage ? `<div class="hero-media">${heroImage}</div>` : ""}
  </section>
  <section class="about" id="tentang">
    <div class="about-grid">
      <p class="eyebrow">${escapeHtml(state.meta.category)}</p>
      <div>
        <h2>${escapeHtml(state.meta.businessName)}</h2>
        <p class="story">${escapeHtml(state.about.story)}</p>
        <div class="highlights">${highlights.map((item) => `<span class="highlight">${escapeHtml(item)}</span>`).join("")}</div>
      </div>
    </div>
  </section>
  <section class="services-wrap" id="layanan">
    <div class="services-head">
      <div>
        <p class="eyebrow">Layanan kami</p>
        <h2>Yang kami tawarkan.</h2>
      </div>
      <span class="eyebrow">${String(state.services.length).padStart(2, "0")} layanan</span>
    </div>
    <div class="service-list">
      ${state.services
        .map(
          (service, index) => `
        <article class="service">
          <span class="service-index">${String(index + 1).padStart(2, "0")} ${escapeHtml(iconGlyph(service.iconKeyword))}</span>
          <h3>${escapeHtml(service.name)}</h3>
          <p>${escapeHtml(service.description)}</p>
          <div class="price">${escapeHtml(service.priceEstimate)}</div>
        </article>`,
        )
        .join("")}
    </div>
  </section>
  <section class="quotes" id="ulasan">
    <p class="eyebrow">Kata pelanggan</p>
    <h2>Dipercaya karena hasilnya.</h2>
    <div class="quote-grid">
      ${state.testimonials
        .map(
          (item) => `
        <figure class="quote">
          <blockquote><p>“${escapeHtml(item.review)}”</p></blockquote>
          <cite>${escapeHtml(item.customerName)}</cite>
        </figure>`,
        )
        .join("")}
    </div>
  </section>
  <footer class="contact" id="kontak">
    <div class="contact-grid">
      <div>
        <p class="eyebrow">Ajakan bertindak</p>
        <h2>${escapeHtml(state.hero.ctaText)}</h2>
      </div>
      <div>
        <p>${escapeHtml(state.contact.address)}</p>
        <p>${wa(state.contact.whatsappNumber ? `${state.contact.whatsappNumber} ↗` : "Nomor WhatsApp belum tersedia", "wa-link")}</p>
        ${
          instagram
            ? `<p><a href="${instagramUrl(instagram)}" target="_blank" rel="noopener noreferrer">@${escapeHtml(instagram)}</a></p>`
            : ""
        }
      </div>
    </div>
    <div class="site-footer">
      <span>${escapeHtml(state.meta.businessName)}</span>
      <span>${escapeHtml(state.meta.tagline)}</span>
    </div>
  </footer>
</main>`;
  return wrapDocument(state.meta.businessName, rootCss(state) + css, body);
}
