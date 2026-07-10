import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, pin, action } = req.body;
  if (!username || !pin) return res.status(400).json({ error: 'Username and PIN required' });

  const cleanUsername = username.toLowerCase().trim();

  if (action === 'register') {
    const { data: existing } = await supabase.from('pocketfarm_saves').select('username').eq('username', cleanUsername).single();
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    await supabase.from('pocketfarm_saves').insert({ username: cleanUsername, pin, game_data: {} });
    return res.json({ success: true });
  } 
  else if (action === 'login') {
    const { data, error } = await supabase.from('pocketfarm_saves').select('game_data').eq('username', cleanUsername).eq('pin', pin).single();
    if (error || !data) return res.status(401).json({ error: 'Invalid username or PIN' });
    return res.json({ success: true, gameData: data.game_data });
  }
  res.status(400).json({ error: 'Invalid action' });
}