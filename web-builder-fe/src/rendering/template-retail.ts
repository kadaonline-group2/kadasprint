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
.page{background:var(--paper);color:var(--ink)}
.announcement{padding:10px 24px;border-bottom:1px solid var(--ink);background:var(--accent);color:var(--on-accent);font-size:11px;font-weight:800;letter-spacing:.12em;text-align:center;text-transform:uppercase}
.nav{margin:auto;display:flex;width:min(1180px,calc(100% - 48px));min-height:72px;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(23,23,22,.18);gap:20px}
.brand{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:900;letter-spacing:.08em;text-decoration:none}
.brand span{display:grid;width:31px;height:31px;place-items:center;background:var(--ink);color:var(--accent);font-size:11px}
.nav-links{display:none;gap:28px;margin-left:auto;font-size:12px;font-weight:700}
.nav-links a,.button,.text-link,.product-order{text-decoration:none}
.nav-cta,.button{display:inline-flex;align-items:center;gap:10px;padding:12px 16px;border:1px solid var(--ink);font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
.hero{margin:auto;display:grid;width:min(1180px,calc(100% - 48px));gap:48px;min-height:560px;padding:56px 0 72px}
.eyebrow{margin:0 0 16px;color:var(--muted);font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
h1,h2{margin:0;font-weight:900;letter-spacing:-.06em;line-height:.88}
h1{font-size:clamp(48px,8vw,104px)}
h2{font-size:clamp(40px,6vw,84px)}
.hero-text{max-width:420px;margin:28px 0 24px;color:#55534e;font-size:15px}
.hero-actions{display:flex;flex-wrap:wrap;align-items:center;gap:20px;margin-bottom:32px}
.button-dark{background:var(--ink);color:var(--paper);border:0}
.text-link{display:inline-flex;border-bottom:1px solid currentColor;padding-bottom:4px;font-size:11px;font-weight:900;text-transform:uppercase}
.hero-art{position:relative;height:440px;background:linear-gradient(135deg,#bdc6ba,var(--accent));overflow:hidden}
.hero-upload{display:block;width:100%;height:100%;object-fit:cover}
.art-label{position:absolute;top:20px;left:20px;font-size:10px;font-weight:900;letter-spacing:.12em}
.ticker{overflow:hidden;border-block:1px solid var(--ink);background:var(--accent);color:var(--on-accent);padding:12px 0;white-space:nowrap;font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
.ticker div{display:inline-block;padding:0 24px}
.section{margin:auto;width:min(1180px,calc(100% - 48px));padding:88px 0}
.section-head{display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:20px;margin-bottom:40px}
.product-grid{display:grid;gap:18px}
.product-card{border:1px solid rgba(23,23,22,.18);background:rgba(255,255,255,.22)}
.product-image{position:relative;height:220px;background:#d8d0c5}
.product-mark{position:absolute;inset:0;display:grid;place-items:center;font-size:48px}
.product-info{display:flex;justify-content:space-between;gap:12px;padding:18px 16px}
.product-info h3{margin:0 0 6px;font-size:14px}
.product-info p{margin:0;color:var(--muted);font-size:11px}
.product-order{display:flex;justify-content:space-between;border-top:1px solid rgba(23,23,22,.18);padding:12px 16px;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.story{padding:80px 0;background:var(--ink);color:var(--paper)}
.story-grid{margin:auto;display:grid;width:min(1180px,calc(100% - 48px));gap:28px}
.story-copy{max-width:420px;color:#b4b1a7}
.review-grid{display:grid;gap:18px}
blockquote{margin:0;border-top:2px solid var(--ink);padding:20px 0;font-size:17px;font-weight:700}
cite{display:block;margin-top:20px;color:var(--muted);font-size:11px;font-style:normal;font-weight:400}
.footer{padding-top:48px;background:#242421;color:var(--paper)}
.footer-top,.footer-bottom{margin:auto;display:flex;width:min(1180px,calc(100% - 48px));flex-wrap:wrap;justify-content:space-between;gap:24px}
.footer-top{padding-bottom:48px}
.footer-bottom{border-top:1px solid #4a4943;padding:16px 0;color:#8f8d85;font-size:10px}
.footer a{color:var(--accent)}
@media (min-width:761px){
  .nav-links{display:flex}
  .hero{grid-template-columns:.92fr 1.08fr;align-items:center}
  .product-grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
  .review-grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
  .story-grid{grid-template-columns:.8fr 1.2fr}
}
@media (max-width:760px){
  .nav,.hero,.section,.story-grid,.footer-top,.footer-bottom{width:min(100% - 32px,560px)}
}
`;

export function renderRetailTemplate(state: WebsiteState, heroImageDataUrl?: string): string {
  const wa = (label: string, className?: string) =>
    whatsappAction(state.contact.whatsappNumber, state.hero.ctaWhatsappMessage, label, className);
  const instagram = instagramHandle(state.contact.instagram ?? "");
  const initials = state.meta.businessName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  const highlights = state.about.highlights ?? [state.meta.tagline];
  const heroImage = renderHeroImage(heroImageDataUrl, state.meta.businessName);
  const body = `
<main class="page template-retail">
  <div class="announcement">${escapeHtml(state.meta.tagline)}</div>
  <nav class="nav" aria-label="Navigasi utama">
    <a class="brand" href="#beranda"><span>${escapeHtml(initials || "UM")}</span> ${escapeHtml(state.meta.businessName)}</a>
    <div class="nav-links">
      <a href="#koleksi">Koleksi</a>
      <a href="#cerita">Cerita Kami</a>
      <a href="#ulasan">Ulasan</a>
    </div>
    ${wa(`${state.hero.ctaText} ↗`, "nav-cta")}
  </nav>
  <section class="hero" id="beranda">
    <div>
      <p class="eyebrow">${escapeHtml(state.meta.category)}</p>
      <h1>${escapeHtml(state.hero.title)}</h1>
      <p class="hero-text">${escapeHtml(state.hero.subtitle)}</p>
      <div class="hero-actions">
        <a class="button button-dark" href="#koleksi">Lihat koleksi ↓</a>
        ${wa("Langsung pesan ↗", "text-link")}
      </div>
    </div>
    <div class="hero-art"${heroImage ? "" : ' aria-hidden="true"'}>${heroImage || `<div class="art-label">${escapeHtml(state.meta.category)}<br /><strong>${escapeHtml(iconGlyph(state.services[0]?.iconKeyword))}</strong></div>`}</div>
  </section>
  <section class="ticker"><div>${highlights.map((item) => escapeHtml(item)).join(" ✦ ")}</div></section>
  <section class="section" id="koleksi">
    <div class="section-head">
      <div>
        <p class="eyebrow">Pilihan utama</p>
        <h2>Yang sering dipilih.</h2>
      </div>
      ${wa("Pesan via WA ↗", "text-link")}
    </div>
    <div class="product-grid">
      ${state.services
        .map(
          (item) => `
        <article class="product-card">
          <div class="product-image"><span class="product-mark">${escapeHtml(iconGlyph(item.iconKeyword))}</span></div>
          <div class="product-info">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <p>${escapeHtml(item.description)}</p>
            </div>
            <strong>${escapeHtml(item.priceEstimate)}</strong>
          </div>
          ${wa("Tambah ke pesanan ↗", "product-order")}
        </article>`,
        )
        .join("")}
    </div>
  </section>
  <section class="story" id="cerita">
    <div class="story-grid">
      <p class="eyebrow">${escapeHtml(state.meta.businessName)}</p>
      <div class="story-copy">
        <h2>${escapeHtml(state.meta.tagline)}</h2>
        <p>${escapeHtml(state.about.story)}</p>
      </div>
    </div>
  </section>
  <section class="section" id="ulasan">
    <div class="section-head">
      <div>
        <p class="eyebrow">Kata mereka</p>
        <h2>Dipakai. Disukai.</h2>
      </div>
    </div>
    <div class="review-grid">
      ${state.testimonials
        .map(
          (item) => `
        <blockquote>“${escapeHtml(item.review)}”<cite>— ${escapeHtml(item.customerName)}</cite></blockquote>`,
        )
        .join("")}
    </div>
  </section>
  <footer class="footer">
    <div class="footer-top">
      <div>
        <a class="brand" href="#beranda"><span>${escapeHtml(initials || "UM")}</span> ${escapeHtml(state.meta.businessName)}</a>
        <p>${escapeHtml(state.contact.address)}</p>
      </div>
      <div>
        ${wa(state.contact.whatsappNumber ? `WhatsApp ${state.contact.whatsappNumber} ↗` : "Nomor WhatsApp belum tersedia")}
        ${
          instagram
            ? `<br /><a href="${instagramUrl(instagram)}" target="_blank" rel="noopener noreferrer">Instagram @${escapeHtml(instagram)} ↗</a>`
            : ""
        }
      </div>
    </div>
    <div class="footer-bottom">
      <span>${escapeHtml(state.meta.businessName)}</span>
      <span>${escapeHtml(state.meta.tagline)}</span>
    </div>
  </footer>
</main>`;
  return wrapDocument(state.meta.businessName, rootCss(state) + css, body);
}
