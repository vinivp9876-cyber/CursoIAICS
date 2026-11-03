require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL e SUPABASE_SECRET_KEY devem estar definidos no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const GESTOS_PERMITIDOS = ['aberta', 'fechada', 'positivo'];

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.post('/api/gestos', async (req, res) => {
  try {
    const { gesto, confianca } = req.body;
    if (!gesto || !GESTOS_PERMITIDOS.includes(gesto)) {
      return res.status(400).json({ erro: 'Gesto inválido' });
    }
    const { data, error } = await supabase
      .from('gestos_registrados')
      .insert([{ gesto, confianca: confianca || null }]);
    if (error) throw error;
    res.status(201).json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao registrar gesto' });
  }
});

app.get('/api/gestos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('gestos_registrados')
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(10);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
