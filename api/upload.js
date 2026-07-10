export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, content, message } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = 'YOUR_USERNAME';
  const REPO_NAME = 'YOUR_REPO_NAME';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const path = `uploads/${Date.now()}-${filename}`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json'
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