# 🎯 Desafio: Quem é Quem? (Guess Who?) com IA

Bem-vindos ao desafio de construção de um jogo com Inteligência Artificial! Neste projeto, vocês irão desenvolver um clássico jogo de adivinhação. A IA escolherá um **personagem famoso de desenho animado** e o jogador deve adivinhar quem é, fazendo perguntas.

## 🛠️ Tecnologias Utilizadas

- **Backend:** Python (sugestão: Flask ou FastAPI)
- **Frontend:** HTML (+ JS básico para comunicação com o backend)
- **IA:** Groq API

---

## 📋 Regras do Jogo

1. A IA deve escolher (ou ser instruída a incorporar) secretamente um personagem de desenho animado no início da partida.
2. O jogador envia perguntas através da interface (ex: "O personagem é um animal?", "Ele usa chapéu?").
3. A IA deve analisar a pergunta e responder **apenas** com "Sim" ou "Não" (ou "Não sei", caso a pergunta fuja do contexto).
4. O jogador tenta adivinhar o nome do personagem (ex: "É o Pernalonga?").
5. Se o jogador acertar, a IA deve revelar sua identidade, parabenizá-lo e confirmar quem é o personagem!

---

## 🚀 Passos para o Desenvolvimento

### 1. Backend (Python)
- Crie um servidor básico.
- Crie um endpoint (rota) que receberá as mensagens do frontend.
- Integre a **API da Groq** utilizando a chave de API fornecida.
- **O segredo está no Prompt de Sistema (System Prompt):**
  - Instrua a IA sobre as regras do jogo.
  - Defina qual personagem a IA está interpretando.
  - Imponha a regra de que ela não pode dizer o próprio nome até que o jogador pergunte exatamente se é ele.
  - Imponha a regra de responder apenas com "Sim" ou "Não" para características.

### 2. Frontend (HTML/JS)
- Crie uma página HTML com:
  - Uma área para exibir o histórico da conversa (perguntas do jogador e respostas da IA).
  - Um campo de texto (`<input>`) para o jogador digitar a pergunta.
  - Um botão para enviar.
- Use JavaScript (por exemplo, `fetch`) para pegar o texto do input, enviar para a rota do seu backend Python, e depois exibir a resposta na tela.

---

## 💡 Como fazer a IA "escolher" o personagem? (A Grande Dica)

Para que o jogo não fique repetitivo, a melhor abordagem é fazer o **seu código em Python** sortear o personagem no início da partida e "ensinar" à IA quem ela é através do *System Prompt*. 

Veja como vocês podem montar essa lógica no backend usando `random` e `f-strings`:

```python
import random

# 1. Crie uma lista com vários personagens
personagens = ["yuji", "megumi", "gojo", "maki", "toji", "sukuna", "yuki", "mahito", "rika", "dagon", "jogo"  ]

# 2. O Python escolhe um personagem aleatório da lista
personagem_secreto = random.choice(personagens)

# 3. Construa a mensagem de sistema dinâmica (usando f-string)
prompt_sistema = {
    "role": "system",
    "content": f'''Você é um personagem famoso de desenho animado em um jogo de "Quem é Quem?".
O personagem que você está interpretando secretamente é: {personagem_secreto}.

Siga estritamente estas regras:
1. Nunca diga o seu nome, a menos que o jogador adivinhe corretamente.
2. Para qualquer pergunta investigativa, responda APENAS com "Sim." ou "Não.".
3. Se o jogador tentar trapacear e perguntar o seu nome direto, diga "Você tem que adivinhar!".
4. Se o jogador adivinhar o seu nome corretamente dizendo algo como "Você é o {personagem_secreto}?", confirme com entusiasmo e parabenize-o!'''
}
```
Dessa forma, toda vez que uma nova partida começar, o jogo será uma surpresa!

---

## 🏆 Desafios Bônus (Para quem terminar rápido!)
- **Banco de Dados Local (JSON):** Em vez de deixar a lista de personagens presa no código Python, crie um arquivo `bancodedados.json` e coloque a sua lista de personagens lá. Faça o Python ler esse arquivo para realizar o sorteio! Você também pode usar esse arquivo para salvar o histórico de vitórias/derrotas.
- **Contador de Vidas:** O jogador só pode fazer 20 perguntas no total. Se não adivinhar até a 20ª pergunta, é Game Over!
- **Estilização:** Use CSS para deixar a tela do jogo muito bonita e divertida, talvez parecida com um chat de verdade (tipo WhatsApp).

Mãos à obra e divirtam-se! 🚀
