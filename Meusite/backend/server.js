require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/+$/, "");
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

async function consultarSupabase(rota, opcoes = {}) {
    const resposta = await fetch(`${SUPABASE_URL}/${rota}`, {
        ...opcoes,
        headers: {
            apikey: SUPABASE_SECRET_KEY,
            Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
            ...opcoes.headers
        }
    });

    if (resposta.status === 204) {
        return [];
    }

    if (!resposta.ok) {
        const erro = await resposta.text();
        throw new Error(`Erro no Supabase (${resposta.status}): ${erro}`);
    }

    return resposta.json();
}

// LISTAR ALUNOS
app.get("/alunos", async (req, res) => {
    try {
        const alunos = await consultarSupabase("alunos?select=*");
        res.json(alunos);
    } catch (erro) {
        res.status(500).json({ mensagem: erro.message });
    }
});

// BUSCAR ALUNO POR NOME
app.get("/alunos/busca", async (req, res) => {
    try {
        const nome = (req.query.nome || "").trim();

        let rota = "alunos?select=*";
        if (nome !== "") {
            // ilike faz a busca ignorando maiúsculas e minúsculas
            rota += `&nome=ilike.*${encodeURIComponent(nome)}*`;
        }

        const alunos = await consultarSupabase(rota);
        res.json(alunos);
    } catch (erro) {
        res.status(500).json({ mensagem: erro.message });
    }
});

// CADASTRAR ALUNO
app.post("/alunos", async (req, res) => {
    try {
        const novoAluno = {
            nome: req.body.nome,
            idade: req.body.idade,
            nota1: req.body.nota1,
            nota2: req.body.nota2
        };

        const [aluno] = await consultarSupabase("alunos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Prefer: "return=representation"
            },
            body: JSON.stringify(novoAluno)
        });

        res.json({
            mensagem: "Aluno cadastrado com sucesso!",
            aluno
        });
    } catch (erro) {
        res.status(500).json({ mensagem: erro.message });
    }
});

// ALTERAR ALUNO
app.put("/alunos/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const dados = {};
        if (req.body.nome !== undefined) dados.nome = req.body.nome;
        if (req.body.idade !== undefined) dados.idade = req.body.idade;
        if (req.body.nota1 !== undefined) dados.nota1 = req.body.nota1;
        if (req.body.nota2 !== undefined) dados.nota2 = req.body.nota2;

        const [aluno] = await consultarSupabase(`alunos?id=eq.${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Prefer: "return=representation"
            },
            body: JSON.stringify(dados)
        });

        if (!aluno) {
            return res.status(404).json({
                mensagem: "Aluno não encontrado!"
            });
        }

        res.json({
            mensagem: "Aluno atualizado com sucesso!",
            aluno
        });
    } catch (erro) {
        res.status(500).json({ mensagem: erro.message });
    }
});

// DELETAR ALUNO
app.delete("/alunos/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const deletados = await consultarSupabase(`alunos?id=eq.${id}`, {
            method: "DELETE",
            headers: {
                Prefer: "return=representation"
            }
        });

        if (deletados.length === 0) {
            return res.status(404).json({
                mensagem: "Aluno não encontrado!"
            });
        }

        res.json({
            mensagem: "Aluno deletado com sucesso!"
        });
    } catch (erro) {
        res.status(500).json({ mensagem: erro.message });
    }
});

app.listen(3000, () => {
    console.log(
        "Backend rodando em http://localhost:3000"
    );
});