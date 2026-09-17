import { describe, expect, it } from "vitest";
import { escapeHtml } from "./rendering/html";
import { renderWebsite, templatePalettes } from "./renderer";
import { sampleWebsite, withTemplate } from "./test/fixtures";
import type { WebsiteState } from "./types";

const forbiddenReferenceFacts = [
  "Dapur Senja",
  "Nusa Goods",
  "unsplash.com",
  "hero-food.png",
  "Gratis ongkir",
  "4.9/5",
  "10.00—21.00",
  "Sejak 2019",
];

function requiredBindings(html: string, state: WebsiteState) {
  const text = [
    state.meta.businessName,
    state.meta.category,
    state.meta.tagline,
    state.hero.title,
    state.hero.subtitle,
    state.hero.ctaText,
    state.about.story,
    state.contact.address,
    state.contact.whatsappNumber,
    ...(state.about.highlights ?? []),
    ...state.services.flatMap((service) => [
      service.name,
      service.description,
      service.priceEstimate,
    ]),
    ...state.testimonials.flatMap((testimonial) => [
      testimonial.customerName,
      testimonial.review,
    ]),
  ];
  for (const value of text.filter((value): value is string => value !== null)) {
    expect(html).toContain(escapeHtml(value));
  }
}

describe("renderWebsite", () => {
  it("dispatches to a distinctive layout per template id", () => {
    const services = renderWebsite(withTemplate("template-services"));
    const fnb = renderWebsite(withTemplate("template-fnb"));
    const retail = renderWebsite(withTemplate("template-retail"));

    expect(services).toContain('class="page template-services"');
    expect(fnb).toContain('class="page template-fnb"');
    expect(retail).toContain('class="page template-retail"');
    expect(services).toContain("Yang kami tawarkan");
    expect(fnb).toContain("Menu favorit");
    expect(retail).toContain("Yang sering dipilih");
  });

  it.each([
    "template-services",
    "template-fnb",
    "template-retail",
  ] as const)("binds every required WebsiteState field for %s", (templateId) => {
    const state = withTemplate(templateId);
    const html = renderWebsite(state);
    requiredBindings(html, state);
    expect(html).toContain(state.theme.primaryColor);
    expect(html).toContain(state.theme.accentColor);
  });

  it("renders every extra service and testimonial without dropping earlier items", () => {
    const state = withTemplate("template-fnb", {
      services: [
        ...sampleWebsite.services,
        {
          name: "Pisang Goreng Keju",
          description: "Pisang goreng hangat dengan keju.",
          priceEstimate: "Rp15.000",
        },
      ],
      testimonials: [
        ...sampleWebsite.testimonials,
        {
          customerName: "Sinta",
          review: "Porsinya pas dan rasanya konsisten.",
        },
      ],
    });
    const html = renderWebsite(state);
    requiredBindings(html, state);
  });

  it("escapes hostile copy instead of injecting markup", () => {
    const html = renderWebsite(
      withTemplate("template-services", {
        hero: {
          ...sampleWebsite.hero,
          title: `<script>alert(1)</script>`,
        },
      }),
    );
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("falls back to the template palette when a color is invalid", () => {
    const html = renderWebsite(
      withTemplate("template-retail", {
        theme: {
          primaryColor: "not-a-color",
          accentColor: "#ZZZZZZ",
          fontFamily: "sans",
        },
      }),
    );
    expect(html).toContain(templatePalettes["template-retail"].primaryColor);
    expect(html).toContain(templatePalettes["template-retail"].accentColor);
  });

  it.each(["template-services", "template-fnb", "template-retail"] as const)(
    "renders an optional uploaded hero image in %s",
    (templateId) => {
      const state = withTemplate(templateId);
      const original = renderWebsite(state);
      const image = renderWebsite(state, "data:image/webp;base64,AQID");
      expect(original).not.toContain('class="hero-upload"');
      expect(image).toContain('src="data:image/webp;base64,AQID"');
      expect(image).toContain(`alt="Foto utama ${state.meta.businessName}"`);
      expect(renderWebsite(state, 'javascript:alert("bad")')).not.toContain('class="hero-upload"');
    },
  );

  it.each(["template-services", "template-fnb", "template-retail"] as const)(
    "provides foreground colors for extreme backgrounds in %s",
    (templateId) => {
      const html = renderWebsite(withTemplate(templateId, {
        theme: { primaryColor: "#FFFFFF", accentColor: "#000000", fontFamily: "sans" },
      }));
      expect(html).toContain("--on-primary:#000;--on-accent:#fff");
    },
  );

  it("encodes the WhatsApp CTA from number and message", () => {
    const html = renderWebsite(sampleWebsite);
    expect(html).toContain(
      "https://wa.me/628123456789?text=Halo%2C%20saya%20mau%20pesan%20kopi",
    );
  });

  it.each(["template-services", "template-fnb", "template-retail"] as const)(
    "disables all WhatsApp actions when %s has no number",
    (templateId) => {
      const state = withTemplate(templateId, {
        contact: { ...sampleWebsite.contact, whatsappNumber: null },
      });
      const html = renderWebsite(state);
      expect(html).toContain("Nomor WhatsApp belum tersedia");
      expect(html).toContain('aria-disabled="true"');
      expect(html).not.toContain("https://wa.me/");
      expect(html).not.toContain('href="null"');
    },
  );

  it("does not keep unsupported reference-only business facts or remote images", () => {
    for (const templateId of [
      "template-services",
      "template-fnb",
      "template-retail",
    ] as const) {
      const html = renderWebsite(withTemplate(templateId));
      for (const fact of forbiddenReferenceFacts) {
        expect(html).not.toContain(fact);
      }
      expect(html).not.toMatch(/https?:\/\/(?!wa\.me|instagram\.com)/);
    }
  });

  it("includes responsive rules and reduced-motion handling", () => {
    const html = renderWebsite(sampleWebsite);
    expect(html).toContain("@media (max-width:");
    expect(html).toContain("prefers-reduced-motion");
  });
});
