require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const supabaseKey = (process.env.SUPABASE_SECRET_KEY || '').trim();

const supabaseConfigurado =
  !!supabaseUrl && !!supabaseKey &&
  !/^SUA_|_AQUI$/i.test(supabaseUrl) &&
  !/^SUA_|_AQUI$/i.test(supabaseKey);

const supabase = supabaseConfigurado ? createClient(supabaseUrl, supabaseKey) : null;

if (!supabaseConfigurado) {
  console.warn('Aviso: Supabase não configurado. Usando armazenamento em memória (os dados são perdidos ao reiniciar).');
}

const memoria = [];

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
    if (supabase) {
      const { error } = await supabase
        .from('gestos_registrados')
        .insert([{ gesto, confianca: confianca || null }]);
      if (error) throw error;
    } else {
      memoria.push({ gesto, confianca: confianca || null, data_hora: new Date().toISOString() });
      if (memoria.length > 100) memoria.shift();
    }
    res.status(201).json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao registrar gesto' });
  }
});

app.get('/api/gestos', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('gestos_registrados')
        .select('*')
        .order('data_hora', { ascending: false })
        .limit(10);
      if (error) throw error;
      return res.json(data || []);
    }
    res.json(memoria.slice(-10).reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
