import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    const data = await kv.get(`pocketfarm:${username}`);
    res.status(200).json(data || null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Database error' });
  }
}