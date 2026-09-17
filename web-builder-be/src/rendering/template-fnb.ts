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
.page{overflow:hidden;background:var(--paper);color:var(--ink)}
.navbar{margin:auto;display:flex;max-width:1360px;align-items:center;gap:32px;padding:24px 5vw;position:relative}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none}
.brand-mark{display:grid;width:37px;height:37px;place-items:center;border:1px solid var(--accent);border-radius:50%;color:var(--accent);font-size:12px}
.brand small{display:block;margin-top:6px;color:var(--muted);font-size:8px;letter-spacing:.18em}
.nav-links{display:none;gap:24px;margin-left:auto;color:var(--muted);font-size:12px}
.nav-links a,.nav-cta,.text-link{text-decoration:none}
.nav-cta{display:flex;align-items:center;gap:6px;margin-left:auto;border-bottom:1px solid var(--ink);padding-bottom:4px;font-size:12px}
.hero{margin:auto;display:grid;max-width:1360px;gap:48px;padding:40px 5vw 90px}
.eyebrow{margin:0 0 22px;color:var(--accent);font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
h1,h2{margin:0;font-weight:400;letter-spacing:-.06em;line-height:.95}
h1{font-size:clamp(48px,7vw,88px);color:var(--primary)}
h2{font-size:clamp(36px,5vw,72px);color:var(--primary)}
.hero-intro{max-width:380px;margin:28px 0;color:var(--muted);font-size:14px;line-height:1.7}
.hero-actions{display:flex;flex-wrap:wrap;align-items:center;gap:20px;margin-bottom:36px}
.button{display:inline-flex;align-items:center;gap:10px;padding:14px 18px;background:var(--primary);color:var(--on-primary);font-size:12px;text-decoration:none}
.text-link{border-bottom:1px solid currentColor;padding-bottom:4px;font-size:12px}
.hero-art{min-height:360px;position:relative;background:linear-gradient(145deg,var(--accent),var(--primary));overflow:hidden}
.hero-upload{display:block;width:100%;height:360px;object-fit:cover}
.hero-art:after{content:"";position:absolute;inset:18% 12%;border:1px solid rgba(255,250,243,.35);border-radius:50%}
.image-stamp{position:absolute;left:18px;bottom:24px;width:96px;height:96px;display:grid;place-items:center;border-radius:50%;background:var(--accent);color:var(--on-accent);text-align:center;font-size:11px;transform:rotate(-12deg)}
.marquee{display:flex;flex-wrap:wrap;justify-content:center;gap:28px;border-block:1px solid #d9cbbd;padding:18px 5vw;color:var(--muted);font-size:10px;letter-spacing:.22em;text-transform:uppercase}
.story{margin:auto;display:grid;max-width:1360px;gap:32px;padding:90px 5vw}
.story-copy{max-width:460px;color:var(--muted);font-size:14px;line-height:1.8}
.menu-section{background:var(--primary);color:var(--on-primary);padding:90px 5vw}
.menu-heading{margin:auto;display:flex;max-width:1200px;flex-wrap:wrap;justify-content:space-between;gap:24px;margin-bottom:48px}
.menu-heading h2{color:var(--on-primary)}
.menu-heading .eyebrow{color:var(--accent)}
.menu-grid{margin:auto;display:grid;max-width:1200px;gap:14px}
.menu-card{display:flex;min-height:300px;flex-direction:column;justify-content:space-between;padding:20px;background:rgba(255,255,255,.08)}
.menu-card-top,.menu-card-bottom{display:flex;justify-content:space-between;align-items:center}
.menu-icon{font-size:28px}
.menu-index{opacity:.7;font-size:10px}
.menu-card h3{margin:12px 0 8px;font-size:22px}
.menu-card p{margin:0;color:#d6c8be;font-size:12px}
.menu-card-bottom{border-top:1px solid rgba(255,255,255,.2);padding-top:16px}
.quote-section{margin:auto;max-width:1200px;padding:90px 5vw}
.quote-list{display:grid;gap:40px}
blockquote{margin:0}
blockquote p{max-width:430px;margin:18px 0 20px;font-size:22px;line-height:1.35}
blockquote footer{color:var(--muted);font-size:12px}
.contact-section{display:grid;gap:32px;padding:72px 7vw;background:var(--accent);color:var(--on-accent)}
.contact-section h2{color:var(--on-accent)}
.contact-item{margin-bottom:18px;font-size:14px}
.contact-item a{text-decoration:underline}
.footer{margin:auto;display:flex;max-width:1200px;flex-wrap:wrap;justify-content:space-between;gap:16px;padding:24px 5vw;color:var(--muted);font-size:11px}
@media (min-width:801px){
  .nav-links{display:flex}
  .hero{grid-template-columns:.88fr 1.12fr;align-items:center}
  .story{grid-template-columns:.9fr 1.1fr}
  .menu-grid{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
  .quote-list{grid-template-columns:1fr 1fr}
  .contact-section{grid-template-columns:1fr 1fr}
}
@media (max-width:800px){
  .navbar,.hero,.story,.menu-section,.quote-section,.footer{padding-left:7vw;padding-right:7vw}
}
`;

export function renderFnbTemplate(state: WebsiteState, heroImageDataUrl?: string): string {
  const wa = (label: string, className?: string, ariaLabel?: string) =>
    whatsappAction(state.contact.whatsappNumber, state.hero.ctaWhatsappMessage, label, className, ariaLabel);
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
<main class="page template-fnb">
  <nav class="navbar" aria-label="Navigasi utama">
    <a class="brand" href="#home">
      <span class="brand-mark">${escapeHtml(initials || "UM")}</span>
      <span>${escapeHtml(state.meta.businessName)}<small>${escapeHtml(state.meta.tagline)}</small></span>
    </a>
    <div class="nav-links">
      <a href="#cerita">Cerita kami</a>
      <a href="#menu">Menu</a>
      <a href="#suara">Kata mereka</a>
      <a href="#kontak">Lokasi</a>
    </div>
    ${wa(`${state.hero.ctaText} ↗`, "nav-cta")}
  </nav>
  <section class="hero" id="home">
    <div>
      <p class="eyebrow">${escapeHtml(state.meta.category)} · ${escapeHtml(state.meta.tagline)}</p>
      <h1>${escapeHtml(state.hero.title)}</h1>
      <p class="hero-intro">${escapeHtml(state.hero.subtitle)}</p>
      <div class="hero-actions">
        <a class="button" href="#menu">Lihat menu ↗</a>
        <a class="text-link" href="#cerita">Kenal lebih dekat →</a>
      </div>
    </div>
    <div class="hero-art"${heroImage ? "" : ' aria-hidden="true"'}>${heroImage || `<div class="image-stamp">${escapeHtml(iconGlyph(state.services[0]?.iconKeyword))}<br />Unggulan</div>`}</div>
  </section>
  <section class="marquee">${highlights.map((item) => `<span>${escapeHtml(item)}</span>`).join("<i>✦</i>")}</section>
  <section class="story" id="cerita">
    <div>
      <p class="eyebrow">Cerita kami</p>
      <h2>${escapeHtml(state.meta.businessName)}</h2>
    </div>
    <div class="story-copy">
      <p>${escapeHtml(state.about.story)}</p>
      <a class="text-link" href="#kontak">Lihat lokasi →</a>
    </div>
  </section>
  <section class="menu-section" id="menu">
    <div class="menu-heading">
      <div>
        <p class="eyebrow">Pilihan utama</p>
        <h2>Menu favorit<br />untukmu.</h2>
      </div>
      <p>${escapeHtml(state.meta.tagline)}</p>
    </div>
    <div class="menu-grid">
      ${state.services
        .map(
          (item, index) => `
        <article class="menu-card">
          <div class="menu-card-top">
            <span class="menu-icon">${escapeHtml(iconGlyph(item.iconKeyword))}</span>
            <span class="menu-index">${String(index + 1).padStart(2, "0")}</span>
          </div>
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.description)}</p>
          </div>
          <div class="menu-card-bottom">
            <strong>${escapeHtml(item.priceEstimate)}</strong>
            ${wa("↗", undefined, `Pesan ${item.name}`)}
          </div>
        </article>`,
        )
        .join("")}
    </div>
  </section>
  <section class="quote-section" id="suara">
    <p class="eyebrow">Kata mereka</p>
    <div class="quote-list">
      ${state.testimonials
        .map(
          (item) => `
        <blockquote>
          <p>“${escapeHtml(item.review)}”</p>
          <footer>${escapeHtml(item.customerName)}</footer>
        </blockquote>`,
        )
        .join("")}
    </div>
  </section>
  <section class="contact-section" id="kontak">
    <div>
      <p class="eyebrow">Mari mampir</p>
      <h2>${escapeHtml(state.hero.ctaText)}</h2>
    </div>
    <div>
      <div class="contact-item"><strong>Datang langsung</strong><br />${escapeHtml(state.contact.address)}</div>
      <div class="contact-item"><strong>Pesan via WhatsApp</strong><br />${wa(state.contact.whatsappNumber ?? "Nomor WhatsApp belum tersedia")}</div>
      ${
        instagram
          ? `<div class="contact-item"><strong>Ikuti kami</strong><br /><a href="${instagramUrl(instagram)}" target="_blank" rel="noopener noreferrer">@${escapeHtml(instagram)}</a></div>`
          : ""
      }
    </div>
  </section>
  <footer class="footer">
    <strong>${escapeHtml(state.meta.businessName)}</strong>
    <span>${escapeHtml(state.meta.tagline)}</span>
  </footer>
</main>`;
  return wrapDocument(state.meta.businessName, rootCss(state) + css, body);
}
