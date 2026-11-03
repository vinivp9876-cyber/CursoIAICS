import os
import json
import random
import requests
import threading
import webbrowser
from flask import Flask, request, jsonify, render_template

app = Flask(__name__, template_folder='.')

MAX_VIDAS = 20

def load_env():
    try:
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('GROQ_API'):
                    valor = line.split('=', 1)[1].strip().strip('"').strip("'")
                    return valor
    except FileNotFoundError:
        return None

GROQ_API_KEY = load_env()

class JogoQuemEQuem:
    def __init__(self):
        self.personagens = []
        self.personagem_secreto = None
        self.vidas = MAX_VIDAS
        self.acertou = False
        self._carregar_personagens()
        self._sortear_personagem()

    def _carregar_personagens(self):
        try:
            with open('bancodedados.json', 'r', encoding='utf-8') as f:
                dados = json.load(f)
                self.personagens = dados.get('personagens', [])
        except Exception:
            self.personagens = [
                "Yuji Itadori", "Megumi Fushiguro", "Satoru Gojo",
                "Nobara Kugisaki", "Maki Zen'in", "Toji Fushiguro",
                "Ryomen Sukuna", "Yuta Okkotsu", "Mahito", "Jogo"
            ]

    def _sortear_personagem(self):
        if self.personagens:
            self.personagem_secreto = random.choice(self.personagens)
        else:
            self.personagem_secreto = "Satoru Gojo"
        self.vidas = MAX_VIDAS
        self.acertou = False

    def get_system_prompt(self):
        return {
            "role": "system",
            "content": f"""Você é um personagem de Jujutsu Kaisen em um jogo de "Quem é Quem?".
O personagem que você está interpretando secretamente é: {self.personagem_secreto}.

Siga estritamente estas regras:
1. Nunca diga o seu nome, a menos que o jogador adivinhe corretamente.
2. Para qualquer pergunta investigativa sobre características (cor de cabelo, roupa, poder, etc), responda APENAS com "Sim." ou "Não.".
3. Se o jogador perguntar algo fora do contexto do personagem, responda "Não sei.".
4. Se o jogador tentar trapacear e perguntar o seu nome direto, diga "Você tem que adivinhar!".
5. Se o jogador perguntar exatamente "Você é o {self.personagem_secreto}?" ou variações como "É o {self.personagem_secreto}?", responda com entusiasmo, parabenize e CONFIRME que você é o personagem.
6. Responda sempre em português do Brasil."""
        }

    def processar(self, pergunta):
        if self.acertou:
            return {"resposta": f"O jogo já acabou! O personagem era {self.personagem_secreto}. Use /novo-jogo para jogar novamente."}

        if not GROQ_API_KEY:
            return {"erro": "Chave da API Groq não encontrada no arquivo .env"}

        # Verifica se o jogador acertou antes de chamar a API
        pergunta_limpa = pergunta.strip().lower()

        # Padrões de acerto
        padroes_acerto = [
            f"você é o {self.personagem_secreto.lower()}",
            f"é o {self.personagem_secreto.lower()}",
            f"você é {self.personagem_secreto.lower()}",
            f"vc é o {self.personagem_secreto.lower()}",
            f"vc é {self.personagem_secreto.lower()}",
            f"o personagem é {self.personagem_secreto.lower()}",
        ]

        nome_sem_sobrenome = self.personagem_secreto.split()[0].lower()
        padroes_acerto.append(f"você é {nome_sem_sobrenome}")
        padroes_acerto.append(f"vc é {nome_sem_sobrenome}")
        padroes_acerto.append(f"é {nome_sem_sobrenome}")

        acertou_local = any(p in pergunta_limpa for p in padroes_acerto)

        if acertou_local or "?" in pergunta and self.personagem_secreto.lower() in pergunta_limpa:
            self.acertou = True
            return {
                "resposta": f"Parabéns! Você acertou! 🎉\n\nSim, eu sou o(a) {self.personagem_secreto}! Você é incrível!",
                "acertou": True,
                "personagem": self.personagem_secreto
            }

        self.vidas -= 1

        if self.vidas <= 0:
            return {
                "resposta": f"💀 Game Over! Você usou todas as suas {MAX_VIDAS} perguntas.\nO personagem era: {self.personagem_secreto}.\nDigite /novo-jogo para jogar novamente!",
                "game_over": True,
                "personagem": self.personagem_secreto
            }

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                self.get_system_prompt(),
                {"role": "user", "content": pergunta}
            ]
        }

        try:
            resposta = requests.post(url, headers=headers, json=payload)
            resposta_json = resposta.json()
            if resposta.status_code == 200:
                texto_ia = resposta_json['choices'][0]['message']['content']
                return {"resposta": texto_ia, "vidas_restantes": self.vidas}
            else:
                erro_msg = resposta_json.get('error', {}).get('message', 'Erro desconhecido')
                return {"erro": f"Erro na API Groq: {erro_msg}"}
        except Exception as e:
            return {"erro": f"Erro no servidor: {str(e)}"}

    def reiniciar(self):
        self._sortear_personagem()
        self.vidas = MAX_VIDAS
        self.acertou = False

jogo = JogoQuemEQuem()

@app.route('/')
def index():
    return render_template('jogo.html')

@app.route('/pergunta', methods=['POST'])
def pergunta():
    dados = request.json
    mensagem = dados.get('mensagem', '').strip()
    if not mensagem:
        return jsonify({"erro": "Digite uma pergunta!"})

    if mensagem.lower() == '/novo-jogo':
        jogo.reiniciar()
        return jsonify({
            "resposta": f"🆕 Novo jogo iniciado! O personagem foi sorteado.\nVocê tem {MAX_VIDAS} perguntas. Boa sorte!",
            "vidas_restantes": MAX_VIDAS,
            "novo_jogo": True
        })

    resultado = jogo.processar(mensagem)

    if resultado.get("acertou") or resultado.get("game_over"):
        # Atualiza estatísticas
        try:
            with open('bancodedados.json', 'r+', encoding='utf-8') as f:
                banco = json.load(f)
                banco['total_partidas'] += 1
                if resultado.get("acertou"):
                    banco['vitorias'] += 1
                else:
                    banco['derrotas'] += 1
                f.seek(0)
                json.dump(banco, f, indent=2)
                f.truncate()
        except Exception:
            pass

    return jsonify(resultado)

@app.route('/estatisticas', methods=['GET'])
def estatisticas():
    try:
        with open('bancodedados.json', 'r', encoding='utf-8') as f:
            banco = json.load(f)
        return jsonify({
            "vitorias": banco.get('vitorias', 0),
            "derrotas": banco.get('derrotas', 0),
            "total_partidas": banco.get('total_partidas', 0),
            "vidas_restantes": jogo.vidas,
            "max_vidas": MAX_VIDAS
        })
    except Exception as e:
        return jsonify({"erro": str(e)})

def abrir():
    webbrowser.open_new("http://127.0.0.1:5000")

if __name__ == "__main__":
    print("🎯 Iniciando Advinhe o Personagem - Jujutsu Kaisen!")
    print(f"🔑 API Key: {'Configurada' if GROQ_API_KEY else 'FALTANDO!'}")
    print(f"📊 {len(jogo.personagens)} personagens carregados")
    print(f"🎭 Personagem secreto: {jogo.personagem_secreto}")
    print("🌐 Abrindo http://127.0.0.1:5000 ...")
    threading.Timer(1, abrir).start()
    app.run(debug=True)
