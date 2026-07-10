// api/upload.js
export default async function handler(req, res) {
  // CORS Headers - Allow your frontend
  res.setHeader('Access-Control-Allow-Origin', 'https://upload-omega-green.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight (OPTIONS) request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, content, message } = req.body || {};

  if (!filename || !content) {
    return res.status(400).json({ error: 'Missing filename or content' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = 'xnashers';
  const REPO_NAME = 'upload';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Server is missing GITHUB_TOKEN' });
  }

  // Sanitize filename
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `uploads/${Date.now()}-${safeFilename}`;

  try {
    const githubResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Pocket-Farm-Uploader'
        },
        body: JSON.stringify({
          message: message || `Upload image: ${filename}`,
          content: content,
          branch: 'main'
        })
      }
    );

    const githubData = await githubResponse.json();

    if (!githubResponse.ok) {
      console.error("GitHub API Error:", githubData);
      return res.status(400).json({ 
        error: githubData.message || 'Failed to upload to GitHub' 
      });
    }

    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${path}`;

    res.status(200).json({
      success: true,
      url: rawUrl,
      path: path
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
