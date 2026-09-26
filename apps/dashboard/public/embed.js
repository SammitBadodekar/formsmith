(() => {
  if (window.Formsmith) {
    window.Formsmith.loadEmbeds();
    return;
  }
  const frames = new Map();
  function loadEmbeds() {
    for (const frame of document.querySelectorAll("iframe[data-formsmith-src]")) {
      if (frames.has(frame)) continue;
      try {
        const url = new URL(frame.dataset.formsmithSrc, document.baseURI);
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) continue;
        url.searchParams.set("embed", "1");
        frames.set(frame, url.origin);
        frame.title ||= "Form";
        frame.loading = "lazy";
        frame.width ||= "100%";
        frame.height ||= "650";
        frame.style.border = "0";
        frame.src = url.href;
      } catch {
        /* Ignore invalid embed URLs. */
      }
    }
  }
  window.addEventListener("message", (event) => {
    if (event.data?.type !== "formsmith:resize" || !Number.isFinite(event.data.height)) return;
    for (const [frame, origin] of frames) {
      if (!frame.isConnected) {
        frames.delete(frame);
        continue;
      }
      if (event.source !== frame.contentWindow || event.origin !== origin) continue;
      frame.height = String(Math.max(240, Math.min(100000, Math.ceil(event.data.height))));
    }
  });
  window.Formsmith = { loadEmbeds };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", loadEmbeds, { once: true });
  else loadEmbeds();
})();
