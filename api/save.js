import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, gameData } = req.body;
  if (!username || !gameData) return res.status(400).json({ error: 'Missing data' });

  try {
    await kv.set(`pocketfarm:${username}`, gameData, { ex: 2592000 });
    res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Save failed' });
  }
}