async function uploadImage() {
  const file = fileInput.files[0];
  if (!file) return alert("Select an image first");

  status.textContent = "Uploading...";

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(',')[1];

    try {
      const res = await fetch('https://YOUR-VERCEL-URL.vercel.app/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content: base64,
          message: `Upload ${file.name}`
        })
      });

      console.log("Response status:", res.status);
      const text = await res.text();
      console.log("Raw response:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { error: text };
      }

      if (res.ok) {
        status.innerHTML = `✅ Success!<br><a href="${data.url}" target="_blank">${data.url}</a>`;
      } else {
        status.textContent = `❌ ${data.error || res.status}`;
      }
    } catch (err) {
      status.textContent = "❌ Network error";
      console.error(err);
    }
  };
  reader.readAsDataURL(file);
}
