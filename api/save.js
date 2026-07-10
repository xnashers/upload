import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, gameData } = req.body;
  if (!username || !gameData) return res.status(400).json({ error: 'Missing data' });

  const { error } = await supabase
    .from('pocketfarm_saves')
    .update({ game_data: gameData, updated_at: new Date().toISOString() })
    .eq('username', username.toLowerCase().trim());

  if (error) return res.status(500).json({ error: 'Save failed' });
  res.json({ success: true });
}