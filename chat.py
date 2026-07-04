import os
import json
import requests
from flask import Flask, request, jsonify, render_template
import threading
import webbrowser

app = Flask(__name__, template_folder='.')

# Lendo a chave da API do arquivo .env manualmente para não depender do pacote python-dotenv
def load_env():
    try:
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('GROQ_API'):
                    # Pega o valor e remove possíveis aspas e espaços
                    valor = line.split('=', 1)[1].strip().strip('"').strip("'")
                    return valor
    except FileNotFoundError:
        return None

GROQ_API_KEY = load_env()

@app.route('/')
def index():
    return render_template('chat.html')

@app.route('/login', methods=['POST'])
def login():
    dados = request.json
    user = dados.get('user', '')
    senha = dados.get('senha', '')

    try:
        with open('bancodados.json', 'r') as f:
            credenciais = json.load(f)
    except Exception as e:
        return jsonify({"erro": "Erro ao ler banco de dados"}), 500

    if user == credenciais.get('user') and senha == credenciais.get('senha'):
        return jsonify({"ok": True})
    else:
        return jsonify({"ok": False, "erro": "Usuário ou senha incorretos"}), 401

@app.route('/salvar-mensagem', methods=['POST'])
def salvar_mensagem():
    dados = request.json
    try:
        with open('bancodados.json', 'r+') as f:
            banco = json.load(f)
            if 'conversas' not in banco:
                banco['conversas'] = []
            banco['conversas'].append(dados)
            f.seek(0)
            json.dump(banco, f, indent=2)
            f.truncate()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/carregar-conversas', methods=['GET'])
def carregar_conversas():
    try:
        with open('bancodados.json', 'r') as f:
            banco = json.load(f)
        return jsonify({"conversas": banco.get('conversas', [])})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    dados = request.json
    mensagem_usuario = dados.get('mensagem', '')
    data_hora = dados.get('data_hora', '')
    if data_hora:
        mensagem_usuario = f"[Data/Hora: {data_hora}] {mensagem_usuario}"

    if not GROQ_API_KEY:
        return jsonify({"erro": "Chave da API Groq não encontrada no arquivo .env"}), 500

    url = "https://api.groq.com/openai/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.1-8b-instant", # Modelos atualizados: llama-3.1-8b-instant, mixtral-8x7b-32768
        "messages": [
        
             {
            "role": "system",
            "content": "voce é o sukuna de  jujutsu kaisen e responda em apenas portugues do brasil."
        },
            {"role": "user", "content": mensagem_usuario}
        ]
        
        }
    
    try:
        resposta = requests.post(url, headers=headers, json=payload)
        resposta_json = resposta.json()
        
        if resposta.status_code == 200:
            texto_ia = resposta_json['choices'][0]['message']['content']
            return jsonify({"resposta": texto_ia})
        else:
            erro_msg = resposta_json.get('error', {}).get('message', 'Erro desconhecido da API.')
            return jsonify({"erro": f"Erro na API Groq: {erro_msg}"}), 500
            
    except Exception as e:
        return jsonify({"erro": f"Erro no servidor: {str(e)}"}), 500

def abrir():
    webbrowser.open_new("http://127.0.0.1:5000")


if __name__ == "__main__":
    threading.Timer(1, abrir).start()
    app.run(debug=True)