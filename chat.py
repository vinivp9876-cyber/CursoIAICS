import os
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

@app.route('/chat', methods=['POST'])
def chat():
    dados = request.json
    mensagem_usuario = dados.get('mensagem', '')

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
            "role": "user", 
            "content": mensagem_usuario
            }
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