import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });

try {
  const { createWebsiteApi, apiPaths } = await vite.ssrLoadModule("/src/api.ts");
  const { renderWebsite } = await vite.ssrLoadModule("/src/renderer.ts");
  if (!URL.canParse(apiPaths.generate) ||
    !["localhost", "127.0.0.1"].includes(new URL(apiPaths.generate).hostname)) {
    throw new Error("Set VITE_API_BASE_URL to the local integration backend URL");
  }

  const api = createWebsiteApi({ mode: "real", fetchImpl: fetch });
  const coffee = await api.generate({
    businessDescription: "Warung Kopi Sejahtera, jual kopi tubruk dan roti bakar di Surabaya, wa 08123456789",
  });
  assert.equal(coffee.state.templateId, "template-fnb");

  const barber = await api.generate({
    businessDescription: "Barbershop Ganteng, jasa potong rambut pria di Bandung, wa 08123456789",
  });
  assert.equal(barber.state.templateId, "template-services");
  assert.equal(barber.state.meta.businessName, "Barbershop Ganteng");

  const withoutNumber = await api.generate({
    businessDescription: "Warung kopi tanpa nomor WhatsApp di Surabaya",
  });
  assert.equal(withoutNumber.state.contact.whatsappNumber, null);
  assert.doesNotMatch(renderWebsite(withoutNumber.state), /https:\/\/wa\.me\//);

  const withNumber = await api.revise({
    currentState: withoutNumber.state,
    instruction: "Ganti nomor WhatsApp menjadi 0813 2222-3333",
  });
  assert.equal(withNumber.state.contact.whatsappNumber, "6281322223333");
  assert.match(renderWebsite(withNumber.state), /https:\/\/wa\.me\/6281322223333/);

  const removedNumber = await api.revise({
    currentState: withNumber.state,
    instruction: "Hapus nomor WhatsApp",
  });
  assert.equal(removedNumber.state.contact.whatsappNumber, null);
  assert.doesNotMatch(renderWebsite(removedNumber.state), /https:\/\/wa\.me\//);

  const colored = await api.revise({
    currentState: coffee.state,
    instruction: "Ganti nuansa warna jadi cokelat tua klasik",
  });
  assert.equal(colored.revisionApplied, true);
  assert.equal(colored.state.theme.primaryColor, "#4A2C20");
  assert.deepEqual(colored.state.services, coffee.state.services);

  const added = await api.revise({
    currentState: colored.state,
    instruction: "Tambahkan menu baru: Pisang Goreng Keju harga 15 ribu",
  });
  assert.equal(added.state.services.length, 4);
  assert.deepEqual(added.state.contact, coffee.state.contact);

  const fallback = await api.revise({
    currentState: added.state,
    instruction: "simulasi gagal",
  });
  assert.equal(fallback.revisionApplied, false);
  assert.deepEqual(fallback.state, added.state);

  let unsupportedCode;
  try {
    await api.revise({ currentState: added.state, instruction: "hapus testimoni" });
  } catch (error) {
    unsupportedCode = error.code;
  }
  assert.equal(unsupportedCode, "UNSUPPORTED_REVISION");

  let downloadedBlob;
  let downloadedName;
  URL.createObjectURL = (blob) => {
    downloadedBlob = blob;
    return "blob:integration";
  };
  URL.revokeObjectURL = () => {};
  globalThis.document = {
    createElement: () => ({
      set href(_value) {},
      set download(value) { downloadedName = value; },
      click() {},
    }),
  };
  await api.download(added.state);
  assert.equal(downloadedName, "website.zip");
  const signature = Buffer.from(await downloadedBlob.arrayBuffer()).subarray(0, 4).toString("hex");
  assert.equal(signature, "504b0304");

  process.stdout.write("FE real API client -> BE integration: passed\n");
} finally {
  await vite.close();
}
