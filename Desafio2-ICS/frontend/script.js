const API_URL = "http://localhost:3000";

const formObjeto = document.getElementById("formObjeto");
const nome = document.getElementById("nome");
const descricao = document.getElementById("descricao");
const localEncontrado = document.getElementById("local_encontrado");
const dataEncontrado = document.getElementById("data_encontrado");
const busca = document.getElementById("busca");
const btnBusca = document.getElementById("btnBusca");
const listaObjetos = document.getElementById("listaObjetos");
const semResultados = document.getElementById("semResultados");
const statsDiv = document.getElementById("stats");

let objetos = [];

async function carregarObjetos() {
  try {
    const res = await fetch(`${API_URL}/objetos`);
    if (!res.ok) throw new Error("Erro ao buscar objetos");
    objetos = await res.json();
    renderizarObjetos();
    renderizarStats();
  } catch (err) {
    alert(`Não foi possível carregar os objetos: ${err.message}`);
  }
}

function formatarData(data) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function filtrarObjetos() {
  const termo = busca.value.trim().toLowerCase();
  if (!termo) return objetos;
  return objetos.filter((obj) => {
    const texto = `${obj.nome} ${obj.descricao || ""} ${obj.local_encontrado}`.toLowerCase();
    return texto.includes(termo);
  });
}

function renderizarStats() {
  const total = objetos.length;
  const disponiveis = objetos.filter((o) => o.status === "disponivel").length;
  const retirados = objetos.filter((o) => o.status === "retirado").length;

  statsDiv.innerHTML = `
    <div class="stat"><strong>${total}</strong>Encontrados</div>
    <div class="stat green"><strong>${disponiveis}</strong>Disponíveis</div>
    <div class="stat red"><strong>${retirados}</strong>Retirados</div>
  `;
}

function renderizarObjetos() {
  const lista = filtrarObjetos();

  if (lista.length === 0) {
    listaObjetos.innerHTML = "";
    semResultados.hidden = false;
    return;
  }

  semResultados.hidden = true;

  listaObjetos.innerHTML = lista
    .map((obj) => {
      const retirado = obj.status === "retirado";
      return `
        <div class="item ${retirado ? "retirado" : ""}">
          <div class="item-header">
            <div>
              <h3>${obj.nome}</h3>
              ${obj.descricao ? `<p class="descricao">${obj.descricao}</p>` : ""}
              <p class="meta">📍 ${obj.local_encontrado}</p>
              <p class="meta">📅 ${formatarData(obj.data_encontrado)}</p>
            </div>
            <span class="status ${retirado ? "retirado" : "disponivel"}">
              ${retirado ? "🔴 Retirado" : "🟢 Disponível"}
            </span>
          </div>
          <div class="item-actions">
            <button class="btn btn-small btn-retirar" data-id="${obj.id}">
              ${retirado ? "Reativar" : "Marcar como retirado"}
            </button>
            <button class="btn btn-small btn-delete" data-delete="${obj.id}">Excluir</button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function alterarStatus(id, novoStatus) {
  try {
    const res = await fetch(`${API_URL}/objetos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    if (!res.ok) throw new Error("Erro ao alterar status");
    await carregarObjetos();
  } catch (err) {
    alert(`Erro ao alterar status: ${err.message}`);
  }
}

async function excluirObjeto(id) {
  if (!confirm("Tem certeza que deseja excluir este objeto?")) return;
  try {
    const res = await fetch(`${API_URL}/objetos/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir objeto");
    await carregarObjetos();
  } catch (err) {
    alert(`Erro ao excluir objeto: ${err.message}`);
  }
}

formObjeto.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    nome: nome.value.trim(),
    descricao: descricao.value.trim(),
    local_encontrado: localEncontrado.value.trim(),
    data_encontrado: dataEncontrado.value,
  };

  try {
    const res = await fetch(`${API_URL}/objetos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Erro ao cadastrar objeto");
    formObjeto.reset();
    await carregarObjetos();
  } catch (err) {
    alert(`Erro ao cadastrar: ${err.message}`);
  }
});

listaObjetos.addEventListener("click", (event) => {
  const btnRetirar = event.target.closest(".btn-retirar");
  const btnDelete = event.target.closest(".btn-delete");

  if (btnRetirar) {
    const id = btnRetirar.dataset.id;
    const obj = objetos.find((o) => String(o.id) === String(id));
    const novoStatus = obj.status === "retirado" ? "disponivel" : "retirado";
    alterarStatus(id, novoStatus);
  }

  if (btnDelete) {
    excluirObjeto(btnDelete.dataset.delete);
  }
});

btnBusca.addEventListener("click", renderizarObjetos);
busca.addEventListener("input", renderizarObjetos);

carregarObjetos();

/* ===== Intro: caixa que abre conforme o scroll ===== */
(function () {
  const intro = document.getElementById("intro");
  const stage = document.getElementById("stage");
  const hint = document.getElementById("hint");
  const caixa = document.getElementById("caixa3d");
  const tampa = document.getElementById("tampa");
  const brilho = document.getElementById("brilho");
  const flash = document.getElementById("flash");
  let terminado = false;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function atualizar() {
    if (terminado) return;

    const total = stage.getBoundingClientRect().height - innerHeight;
    let p = total > 0 ? scrollY / total : 1;
    p = clamp(p, 0, 1);

    const abre = clamp(p / 0.45, 0, 1);
    const zoom = clamp((p - 0.45) / 0.35, 0, 1);
    const entra = clamp((p - 0.8) / 0.2, 0, 1);

    tampa.style.transform = `rotateX(${-(14 + 74 * abre)}deg)`;
    tampa.style.opacity = 1 - 0.75 * abre;

    caixa.style.transform = `scale(${1 + 1.7 * zoom})`;

    brilho.style.opacity = abre * (0.15 + 0.85 * zoom + entra);
    flash.style.opacity = entra;

    hint.style.opacity = 1 - 1.6 * p;

    if (p >= 1) {
      terminado = true;
      intro.classList.add("fim");
      stage.remove();
      document.body.classList.add("entrou");
      window.scrollTo(0, 0);
    }
  }

  window.addEventListener("scroll", atualizar, { passive: true });
  window.addEventListener("resize", atualizar);
  atualizar();
})();