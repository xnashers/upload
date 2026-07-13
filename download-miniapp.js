(async () => {
  const files = [
    'index.html',
    'styles.css',
    'main.js',
    'admin-panel.js',
    'roster-store.js',
    'online-config.js',
    'online-service.js',
    'supabase-schema.json',
    'locales/en.json',
    'miniapp.i18n.json'
  ];

  const loadJsZip = () => new Promise((resolve, reject) => {
    if (window.JSZip) {
      resolve(window.JSZip);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    script.onload = () => resolve(window.JSZip);
    script.onerror = () => reject(new Error('Could not load JSZip.'));
    document.head.appendChild(script);
  });

  try {
    const JSZip = await loadJsZip();
    const zip = new JSZip();
    const folder = zip.folder('hudas-clan-recruitment');
    let ok = 0;

    for (const path of files) {
      try {
        const response = await fetch(path, { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }

        folder.file(path, await response.text());
        ok += 1;
      } catch (error) {
        console.warn(`Skip: ${path}`, error);
      }
    }

    if (!ok) {
      throw new Error('No files could be added to the ZIP.');
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = 'miniapps.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    console.log(`✅ Downloaded ${ok}/${files.length} files`);
  } catch (error) {
    console.error('❌ ZIP download failed:', error);
  }
})();
