async function loadIncludes() {
  const nodes = Array.from(document.querySelectorAll('[data-include]'));
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const cache = isLocal ? 'no-cache' : 'force-cache';
  await Promise.all(nodes.map(async (node) => {
    const url = node.getAttribute('data-include');
    if (!url) return;
    const res = await fetch(url, { cache });
    if (!res.ok) throw new Error(`${url} yüklenemedi (${res.status})`);
    node.innerHTML = await res.text();
  }));
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadIncludes();
    if (typeof window.initApp === 'function') window.initApp();
  } catch (e) {
    const msg = document.createElement('pre');
    msg.style.whiteSpace = 'pre-wrap';
    msg.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace';
    msg.style.padding = '16px';
    msg.style.margin = '16px';
    msg.style.borderRadius = '12px';
    msg.style.background = '#111';
    msg.style.color = '#fff';
    msg.textContent = `Uygulama başlatılamadı.\n\n${String(e && e.message ? e.message : e)}`;
    document.body.appendChild(msg);
  }
});
