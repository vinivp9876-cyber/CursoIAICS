async function cadastrarAluno() {

    // Pegando os valores dos campos

    const nome = document.getElementById("nome").value;
    const idade = Number(
        document.getElementById("idade").value
    );

    const nota1Campo = document.getElementById("nota1").value;
    const nota2Campo = document.getElementById("nota2").value;
    const nota1 = Number(nota1Campo);
    const nota2 = Number(nota2Campo);

    // Verificando se os campos foram preenchidos
    if (nome === "" || idade === 0 || nota1Campo === "" || nota2Campo === "") {
        alert("Preencha todos os campos!");
        return;
    }
    // Enviando os dados para o backend
    const resposta = await fetch(
        "http://localhost:3000/alunos",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome: nome,
                idade: idade,
                nota1: nota1,
                nota2: nota2
            })
        }
    );

    const resultado = await resposta.json();
    alert(resultado.mensagem);

    // Limpar os campos

    document.getElementById("nome").value = "";
    document.getElementById("idade").value = "";
    document.getElementById("nota1").value = "";
    document.getElementById("nota2").value = "";
    // Atualizar a lista
    buscarAlunos();
}

async function buscarAlunos() {
    const termo = document.getElementById("busca").value;
    let url = "http://localhost:3000/alunos";

    // Se tiver algo no campo de busca, filtra pelo nome
    if (termo !== "") {
        url += "/busca?nome=" + encodeURIComponent(termo);
    }

    const resposta = await fetch(url);
    const alunos = await resposta.json();
    const lista = document.getElementById("listaAlunos");

    lista.innerHTML = "";
    if (alunos.length === 0) {
        lista.innerHTML =
            "<p>Nenhum aluno encontrado.</p>";
        return;
    }

    alunos.forEach(aluno => {
        const media = (aluno.nota1 + aluno.nota2) / 2;
        const situacao = media >= 6 ? "Aprovado" : "Reprovado";
        const classe = media >= 6 ? "aprovado" : "reprovado";

        lista.innerHTML += `
            <div class="aluno">
                <strong>${aluno.nome}</strong>
                <p>Idade: ${aluno.idade}</p>
                <p>Nota 1: ${aluno.nota1} | Nota 2: ${aluno.nota2}</p>
                <p>Média: ${media}</p>
                <p class="${classe}">${situacao}</p>
                <div class="botoes-aluno">
                    <button class="btn-editar" onclick="editarAluno(${aluno.id})">
                        Editar
                    </button>
                    <button class="btn-deletar" onclick="deletarAluno(${aluno.id})">
                        Deletar
                    </button>
                </div>
                <div class="editar" id="editar-${aluno.id}" style="display: none;">
                    <input
                        type="text"
                        id="novoNome-${aluno.id}"
                        placeholder="Nome"
                        value="${aluno.nome}"
                    >
                    <input
                        type="number"
                        id="novaIdade-${aluno.id}"
                        placeholder="Idade"
                        value="${aluno.idade}"
                    >
                    <input
                        type="number"
                        id="novaNota1-${aluno.id}"
                        placeholder="Nota 1"
                        step="0.1"
                        min="0"
                        max="10"
                        value="${aluno.nota1}"
                    >
                    <input
                        type="number"
                        id="novaNota2-${aluno.id}"
                        placeholder="Nota 2"
                        step="0.1"
                        min="0"
                        max="10"
                        value="${aluno.nota2}"
                    >
                    <button class="btn-salvar" onclick="salvarAluno(${aluno.id})">
                        Salvar
                    </button>
                </div>
            </div>
        `;
    });
}

function editarAluno(id) {
    const div = document.getElementById("editar-" + id);
    div.style.display =
        div.style.display === "none" ? "block" : "none";
}

async function salvarAluno(id) {
    const nome = document.getElementById("novoNome-" + id).value;
    const idade = Number(document.getElementById("novaIdade-" + id).value);
    const nota1 = Number(document.getElementById("novaNota1-" + id).value);
    const nota2 = Number(document.getElementById("novaNota2-" + id).value);

    if (nome === "" || idade === 0) {
        alert("Preencha nome e idade!");
        return;
    }

    const resposta = await fetch(
        "http://localhost:3000/alunos/" + id,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome: nome,
                idade: idade,
                nota1: nota1,
                nota2: nota2
            })
        }
    );

    const resultado = await resposta.json();
    alert(resultado.mensagem);
    buscarAlunos();
}

async function deletarAluno(id) {
    if (!confirm("Tem certeza que deseja deletar este aluno?")) {
        return;
    }

    const resposta = await fetch(
        "http://localhost:3000/alunos/" + id,
        {
            method: "DELETE"
        }
    );

    const resultado = await resposta.json();
    alert(resultado.mensagem);
    buscarAlunos();
}

// Buscar os alunos quando a página abrir
buscarAlunos();