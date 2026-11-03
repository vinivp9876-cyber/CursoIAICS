require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

app.get("/objetos", async (req, res) => {
  const { data, error } = await supabase
    .from("objetos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.post("/objetos", async (req, res) => {
  const { nome, descricao, local_encontrado, data_encontrado } = req.body;

  if (!nome || !local_encontrado || !data_encontrado) {
    return res
      .status(400)
      .json({ error: "nome, local_encontrado e data_encontrado são obrigatórios" });
  }

  const { data, error } = await supabase
    .from("objetos")
    .insert({ nome, descricao, local_encontrado, data_encontrado })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

app.put("/objetos/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== "disponivel" && status !== "retirado") {
    return res
      .status(400)
      .json({ error: "status deve ser 'disponivel' ou 'retirado'" });
  }

  const { data, error } = await supabase
    .from("objetos")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.delete("/objetos/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("objetos").delete().eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});