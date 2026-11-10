/**
 * =====================================================================
 *  AGENTE ANALISADOR DE CURRÍCULOS
 * ---------------------------------------------------------------------
 *  Usa o modelo openai/gpt-oss-20b (via API da NVIDIA, definida em
 *  agentes/agentes.js) para analisar os currículos dos candidatos,
 *  dar nota de 0 a 100 e decidir quem é APROVADO ou REJEITADO.
 *
 *  Execução:  node agentesAnalisador.js
 * =====================================================================
 */

import { API_KEY, API_URL, MODEL, vaga, curriculos } from "./agentes/agentes.js";

// ---------------------------------------------------------------------
// Cores para deixar o resultado no terminal mais claro
// ---------------------------------------------------------------------
const cor = {
  verde: (t) => `\x1b[32m${t}\x1b[0m`,
  vermelho: (t) => `\x1b[31m${t}\x1b[0m`,
  amarelo: (t) => `\x1b[33m${t}\x1b[0m`,
  ciano: (t) => `\x1b[36m${t}\x1b[0m`,
  negrito: (t) => `\x1b[1m${t}\x1b[0m`,
  cinza: (t) => `\x1b[90m${t}\x1b[0m`,
};

// ---------------------------------------------------------------------
// Monta as mensagens (prompt) enviadas ao modelo para cada candidato
// ---------------------------------------------------------------------
function montarMensagens(candidato) {
  const requisitos = vaga.requisitos.map((r, i) => `  ${i + 1}. ${r}`).join("\n");

  const mensagemSistema = `Você é um agente especialista em Recrutamento e Seleção de pessoal (RH).
Sua tarefa é analisar o currículo de um candidato, dar uma NOTA de 0 a 100 sobre a adequação dele à vaga e decidir se ele deve ser APROVADO ou REJEITADO.

Critérios de análise e de pontuação:
- Experiência mínima exigida pela vaga (o candidato possui? quanto tempo de experiência relevante?)
- Atendimento aos requisitos listados da vaga
- Formação acadêmica exigida

Regras de pontuação:
- A nota 0 a 100 representa o quanto o candidato se encaixa na vaga específica.
- Candidato que atende todos os critérios: nota alta (80 a 100).
- Candidato que atende parcialmente: nota intermediária (40 a 79).
- Candidato que não atende os critérios principais: nota baixa (0 a 39).
- Seja rigoroso mas justo: só aprove (aprovado = true) quem realmente atende aos critérios principais.

Responda SOMENTE com um JSON válido, sem nenhum texto extra, no exato formato:
{
  "aprovado": true ou false,
  "pontuacao": número inteiro de 0 a 100,
  "motivo": "resumo curto (1 a 2 frases) explicando a decisão",
  "criterios": [
    {"nome": "Experiência mínima", "nota": número de 0 a 100, "observacao": "avaliação curta da experiência do candidato"},
    {"nome": "Requisitos da vaga", "nota": número de 0 a 100, "observacao": "avaliação curta dos requisitos atendidos"},
    {"nome": "Formação acadêmica", "nota": número de 0 a 100, "observacao": "avaliação curta da formação"}
  ],
  "caracteristicas": ["característica 1 do candidato", "característica 2"],
  "pontos_fortes": ["ponto forte 1", "ponto forte 2"],
  "pontos_fracos": ["ponto fraco 1"]
}

As "caracteristicas" devem descrever o perfil do candidato (experiência, formação, habilidades e área de atuação).`;

  const mensagemUsuario = `VAGA:
  Título: ${vaga.titulo}
  Experiência mínima: ${vaga.experiencia_minima}
  Requisitos:
${requisitos}

CANDIDATO:
  Nome: ${candidato.nome}
  Currículo: ${candidato.descricao}

Analise o currículo deste candidato para a vaga acima e responda apenas com o JSON.`;

  return [
    { role: "system", content: mensagemSistema },
    { role: "user", content: mensagemUsuario },
  ];
}

// ---------------------------------------------------------------------
// Extrai o JSON da resposta do modelo (com defesa contra texto extra)
// ---------------------------------------------------------------------
function extrairJson(texto) {
  const semBlocoCodigo = texto.replace(/```json|```/gi, "");
  const inicio = semBlocoCodigo.indexOf("{");
  const fim = semBlocoCodigo.lastIndexOf("}");
  if (inicio === -1 || fim === -1) {
    throw new Error("O modelo não retornou um JSON válido");
  }
  return JSON.parse(semBlocoCodigo.slice(inicio, fim + 1));
}

// ---------------------------------------------------------------------
// Envia o currículo para o modelo e retorna a análise
// ---------------------------------------------------------------------
async function chamarAPI(mensagens) {
  const controlador = new AbortController();
  const tempoLimite = setTimeout(() => controlador.abort(), 180_000); // 3 min por requisição

  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      signal: controlador.signal,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: mensagens,
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new Error(`API retornou status ${resposta.status}: ${detalhe}`);
    }

    const dados = await resposta.json();
    const texto = dados.choices?.[0]?.message?.content ?? "";
    return extrairJson(texto);
  } finally {
    clearTimeout(tempoLimite);
  }
}

// Tenta analisar o currículo, com uma nova tentativa em caso de falha
async function analisarCurriculo(candidato) {
  let ultimoErro;

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const analise = await chamarAPI(montarMensagens(candidato));
      return {
        nome: candidato.nome,
        aprovado: Boolean(analise.aprovado),
        pontuacao: Number.isFinite(Number(analise.pontuacao))
          ? Math.max(0, Math.min(100, Math.round(Number(analise.pontuacao))))
          : null,
        motivo: analise.motivo ?? "Motivo não informado pelo modelo.",
        criterios: analise.criterios ?? [],
        caracteristicas: analise.caracteristicas ?? [],
        pontosFortes: analise.pontos_fortes ?? [],
        pontosFracos: analise.pontos_fracos ?? [],
      };
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa < 2) {
        console.log(cor.cinza(`    (tentativa ${tentativa} falhou para ${candidato.nome}, tentando de novo: ${erro.message})`));
      }
    }
  }

  throw ultimoErro;
}

// ---------------------------------------------------------------------
// Barra visual da pontuação (ex: ████████░░ 85/100)
// ---------------------------------------------------------------------
function corDaPontuacao(pontuacao) {
  if (pontuacao === null) return cor.cinza;
  if (pontuacao >= 80) return cor.verde;
  if (pontuacao >= 40) return cor.amarelo;
  return cor.vermelho;
}

function barraPontuacao(pontuacao) {
  if (pontuacao === null) return cor.cinza("—/100 (sem pontuação)");
  const preenchido = Math.round(pontuacao / 10);
  const barra = "█".repeat(preenchido) + "░".repeat(10 - preenchido);
  return corDaPontuacao(pontuacao)(`${barra} ${String(pontuacao).padStart(3)}/100`);
}

// Ordena do maior para o menor score (quem não tem pontuação vai para o fim)
function porPontuacao(a, b) {
  if (a.pontuacao === null) return 1;
  if (b.pontuacao === null) return -1;
  return b.pontuacao - a.pontuacao;
}

// ---------------------------------------------------------------------
// Função principal: analisa todos os currículos e imprime o resultado
// ---------------------------------------------------------------------
async function main() {
  console.log("\n" + cor.negrito(cor.ciano("====================================================================")));
  console.log(cor.negrito(cor.ciano("          AGENTE ANALISADOR DE CURRÍCULOS (RH)")));
  console.log(cor.negrito(cor.ciano("====================================================================")));
  console.log(`${cor.negrito("Modelo:")} ${MODEL}`);
  console.log(`${cor.negrito("Vaga:")}   ${vaga.titulo}`);
  console.log(`${cor.negrito("Experiência mínima:")} ${vaga.experiencia_minima}`);
  console.log(`${cor.negrito("Candidatos:")} ${curriculos.length}`);
  console.log(cor.ciano("====================================================================") + "\n");

  const aprovados = [];
  const rejeitados = [];

  console.log(cor.amarelo(`Analisando ${curriculos.length} currículos em paralelo, isso pode levar alguns minutos...\n`));

  const promessas = curriculos.map((candidato) => analisarCurriculo(candidato));
  const resultadosBrutos = await Promise.allSettled(promessas);

  for (const [indice, candidato] of curriculos.entries()) {
    const resultado = resultadosBrutos[indice];

    if (resultado.status === "fulfilled") {
      const analise = resultado.value;
      if (analise.aprovado) {
        aprovados.push(analise);
        console.log(
          `[${indice + 1}/${curriculos.length}] ${cor.negrito(candidato.nome)}: ${cor.verde("✔ APROVADO")} — ${barraPontuacao(analise.pontuacao)} — ${analise.motivo}`
        );
      } else {
        rejeitados.push(analise);
        console.log(
          `[${indice + 1}/${curriculos.length}] ${cor.negrito(candidato.nome)}: ${cor.vermelho("✘ REJEITADO")} — ${barraPontuacao(analise.pontuacao)} — ${analise.motivo}`
        );
      }
    } else {
      const falha = {
        nome: candidato.nome,
        aprovado: false,
        pontuacao: null,
        motivo: `Erro na análise: ${resultado.reason?.message ?? resultado.reason}`,
        criterios: [],
        caracteristicas: [],
        pontosFortes: [],
        pontosFracos: [],
      };
      rejeitados.push(falha);
      console.log(`[${indice + 1}/${curriculos.length}] ${cor.negrito(candidato.nome)}: ${cor.vermelho("✘ ERRO")} — ${falha.motivo}`);
    }
  }

  // -----------------------------------------------------------------
  // Resultado final no terminal (ordenado por pontuação)
  // -----------------------------------------------------------------
  aprovados.sort(porPontuacao);
  rejeitados.sort(porPontuacao);

  console.log(cor.negrito(cor.ciano("====================================================================")));
  console.log(cor.negrito(cor.ciano("                      RESULTADO FINAL")));
  console.log(cor.negrito(cor.ciano("====================================================================")) + "\n");

  console.log(cor.negrito(cor.verde(`✔ APROVADOS PARA O CARGO (${aprovados.length}):`)));
  if (aprovados.length === 0) {
    console.log(cor.cinza("  Nenhum candidato foi aprovado."));
  }
  for (const candidato of aprovados) {
    imprimirCandidato(candidato, cor.verde("✔"));
  }

  console.log(`\n${cor.negrito(cor.vermelho(`✘ REJEITADOS (${rejeitados.length}):`))}`);
  if (rejeitados.length === 0) {
    console.log(cor.cinza("  Nenhum candidato foi rejeitado."));
  }
  for (const candidato of rejeitados) {
    imprimirCandidato(candidato, cor.vermelho("✘"));
  }

  // Ranking geral por pontuação
  console.log(`\n${cor.negrito(cor.ciano("RANKING GERAL (adequação à vaga, 0 a 100):"))}`);
  const ranking = [...aprovados, ...rejeitados].sort(porPontuacao);
  for (const [indice, candidato] of ranking.entries()) {
    const situacao = candidato.aprovado
      ? cor.verde("APROVADO")
      : candidato.pontuacao === null
        ? cor.vermelho("ERRO")
        : cor.vermelho("REJEITADO");
    console.log(
      `  ${String(indice + 1).padStart(2)}. ${candidato.nome.padEnd(20)} ${barraPontuacao(candidato.pontuacao)}  ${situacao}`
    );
  }

  console.log("\n" + cor.negrito(cor.ciano("====================================================================")));
  console.log(
    `  Resumo: ${cor.verde(`${aprovados.length} aprovado(s)`)} | ${cor.vermelho(`${rejeitados.length} rejeitado(s)`)} de ${curriculos.length} candidatos`
  );
  console.log(cor.negrito(cor.ciano("====================================================================")) + "\n");
}

// Imprime os detalhes de um candidato (pontuação, características, critérios)
function imprimirCandidato(candidato, icone) {
  console.log(`\n  ${icone} ${cor.negrito(candidato.nome)}  ${barraPontuacao(candidato.pontuacao)}`);
  console.log(`      Motivo: ${candidato.motivo}`);

  if (candidato.caracteristicas.length > 0) {
    console.log(`      Características: ${candidato.caracteristicas.join("; ")}`);
  }

  if (candidato.criterios.length > 0) {
    console.log(`      Nota por critério:`);
    for (const criterio of candidato.criterios) {
      const nota = Number(criterio.nota);
      const notaTexto = Number.isFinite(nota)
        ? corDaPontuacao(nota)(`${String(Math.max(0, Math.min(100, Math.round(nota)))).padStart(3)}/100`)
        : "—";
      console.log(`        - ${criterio.nome}: ${notaTexto} — ${criterio.observacao ?? ""}`);
    }
  }

  if (candidato.pontosFortes.length > 0) {
    console.log(`      Pontos fortes: ${candidato.pontosFortes.join("; ")}`);
  }
  if (candidato.pontosFracos.length > 0) {
    console.log(`      Pontos fracos: ${candidato.pontosFracos.join("; ")}`);
  }
}

main().catch((erro) => {
  console.error(cor.vermelho(`\nErro fatal ao executar o agente: ${erro.message}\n`));
  process.exit(1);
});
