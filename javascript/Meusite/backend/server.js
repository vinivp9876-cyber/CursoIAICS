const express = require("express");
const cors = require("cors");
const fs = require("fs");
const app = express();

app.use(cors());
app.use(express.json());


function lerBanco() {
    const dados = fs.readFileSync("banco.json");
    return JSON.parse(dados);
}

function salvarBanco(banco) {
    fs.writeFileSync(
        "banco.json",
        JSON.stringify(banco, null, 4)
    );
}

// LISTAR ALUNOS
app.get("/alunos", (req, res) => {
    const banco = lerBanco();
    res.json(banco.alunos);
});

// BUSCAR ALUNO POR NOME
app.get("/alunos/busca", (req, res) => {
    const nome = (req.query.nome || "").toLowerCase();
    const banco = lerBanco();

    const resultados = banco.alunos.filter(aluno =>
        aluno.nome.toLowerCase().includes(nome)
    );

    res.json(resultados);
});

// CADASTRAR ALUNO
app.post("/alunos", (req, res) => {
    const banco = lerBanco();
    const novoAluno = {
        id: Date.now(),
        nome: req.body.nome,
        idade: req.body.idade,
        nota1: req.body.nota1,
        nota2: req.body.nota2
    };

    banco.alunos.push(novoAluno);
    salvarBanco(banco);

    res.json({
        mensagem: "Aluno cadastrado com sucesso!"
    });
});

// ALTERAR ALUNO
app.put("/alunos/:id", (req, res) => {
    const banco = lerBanco();
    const id = Number(req.params.id);
    const aluno = banco.alunos.find(a => a.id === id);

    if (!aluno) {
        return res.status(404).json({
            mensagem: "Aluno não encontrado!"
        });
    }

    if (req.body.nome !== undefined) aluno.nome = req.body.nome;
    if (req.body.idade !== undefined) aluno.idade = req.body.idade;
    if (req.body.nota1 !== undefined) aluno.nota1 = req.body.nota1;
    if (req.body.nota2 !== undefined) aluno.nota2 = req.body.nota2;

    salvarBanco(banco);

    res.json({
        mensagem: "Aluno atualizado com sucesso!",
        aluno
    });
});

// DELETAR ALUNO
app.delete("/alunos/:id", (req, res) => {
    const banco = lerBanco();
    const id = Number(req.params.id);
    const index = banco.alunos.findIndex(a => a.id === id);

    if (index === -1) {
        return res.status(404).json({
            mensagem: "Aluno não encontrado!"
        });
    }

    banco.alunos.splice(index, 1);
    salvarBanco(banco);

    res.json({
        mensagem: "Aluno deletado com sucesso!"
    });
});

app.listen(3000, () => {
    console.log(
        "Backend rodando em http://localhost:3000"
    );
});