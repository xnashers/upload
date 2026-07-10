export default async function handler(req, res) {
  // CORS Headers - Set early
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
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
    return res.status(500).json({ error: 'Server configuration error (missing token)' });
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `uploads/${Date.now()}-${safeFilename}`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Uploader'
        },
        body: JSON.stringify({
          message: message || `Upload ${filename}`,
          content: content,
          branch: 'main'
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data.message || 'GitHub API error' });
    }

    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${path}`;

    res.status(200).json({
      success: true,
      url: rawUrl,
      path: path
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
