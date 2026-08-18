from flask import Flask, jsonify, send_file, request
import requests
import os
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

app = Flask(__name__)

FIPE_API = "https://parallelum.com.br/fipe/api/v1/carros/marcas/25"

_modelos_cache = None
_modelos_cache_id = None

HONDA_CARS = {
    "Civic": {
        "imagem": "/static/cars/civic.jpg",
        "ano": "1972-Presente",
        "genero": "Sedan compacto / Hatchback",
        "motorizacoes": ["1.0 Turbo 3 cil.", "1.5 Turbo 4 cil.","1.8 i-vtec 16v", "2.0 4 cil."],
        "potencia": "128 cv a 320 cv",
        "cambio": "CVT / Manual 5 e 6 marchas",
        "combustivel": "Gasolina / Flex / Híbrido"
    },
    "CR-V": {
        "imagem": "/static/cars/crv.jpg",
        "ano": "1995-Presente",
        "genero": "SUV",
        "motorizacoes": ["1.5 Turbo 4 cil.", "2.0 Híbrido (e:HEV)"],
        "potencia": "193 cv a 207 cv",
        "cambio": "CVT",
        "combustivel": "Gasolina / Flex / Híbrido"
    },
    "HR-V": {
        "imagem": "/static/cars/hrv.jpg",
        "ano": "1999-Presente",
        "genero": "SUV compacto",
        "motorizacoes": ["1.5 Turbo 4 cil.", "1.5 e:HEV Híbrido"],
        "potencia": "126 cv a 152 cv",
        "cambio": "CVT",
        "combustivel": "Gasolina / Flex / Híbrido"
    },
    "Fit": {
        "imagem": "/static/cars/fit.jpg",
        "ano": "2001-2024",
        "genero": "Hatchback / Mini-MPV",
        "motorizacoes": ["1.5 i-VTEC 4 cil.", "1.5 i-VTEC + Motor Elétrico"],
        "potencia": "116 cv a 152 cv",
        "cambio": "CVT / Manual 5 marchas",
        "combustivel": "Gasolina / Flex / Híbrido"
    },
    "City": {
        "imagem": "/static/cars/city.jpg",
        "ano": "1981-Presente",
        "genero": "Sedan compacto",
        "motorizacoes": ["1.5 i-VTEC 4 cil."],
        "potencia": "126 cv",
        "cambio": "CVT",
        "combustivel": "Gasolina / Flex"
    },
    "Accord": {
        "imagem": "/static/cars/accord.jpg",
        "ano": "1976-Presente",
        "genero": "Sedan médio",
        "motorizacoes": ["1.5 Turbo 4 cil.", "2.0 Híbrido (e:HEV)"],
        "potencia": "194 cv a 204 cv",
        "cambio": "CVT / E-CVT",
        "combustivel": "Gasolina / Flex / Híbrido"
    },
    "ZR-V": {
        "imagem": "/static/cars/zrv.jpg",
        "ano": "2023-Presente",
        "genero": "SUV",
        "motorizacoes": ["1.5 Turbo 4 cil.", "2.0 e:HEV Híbrido"],
        "potencia": "178 cv a 207 cv",
        "cambio": "CVT",
        "combustivel": "Gasolina / Flex / Híbrido"
    },
    "WR-V": {
        "imagem": "/static/cars/wrv.jpg",
        "ano": "2017-Presente",
        "genero": "SUV subcompacto",
        "motorizacoes": ["1.5 i-VTEC 4 cil."],
        "potencia": "126 cv",
        "cambio": "CVT",
        "combustivel": "Gasolina / Flex"
    },
    "Civic Type R": {
        "imagem": "/static/cars/civic-type-r.jpg",
        "ano": "1997-Presente",
        "genero": "Hatchback esportivo",
        "motorizacoes": ["2.0 Turbo VTEC 4 cil."],
        "potencia": "320 cv",
        "cambio": "Manual 6 marchas",
        "combustivel": "Gasolina"
    }
}


@app.route("/")
def index():
    return send_file("car.html")


@app.route("/api/carros")
def get_carros():
    carros = []
    for nome, dados in HONDA_CARS.items():
        carros.append({
            "nome": nome,
            "imagem": dados["imagem"],
            "ano": dados["ano"],
            "genero": dados["genero"],
            "motorizacoes": dados["motorizacoes"],
            "potencia": dados["potencia"],
            "cambio": dados["cambio"],
            "combustivel": dados["combustivel"]
        })
    return jsonify(carros)


@app.route("/api/fipe/<nome_carro>")
def get_fipe(nome_carro):
    try:
        global _modelos_cache
        if _modelos_cache is None:
            resp_modelos = requests.get(FIPE_API + "/modelos", timeout=10)
            _modelos_cache = resp_modelos.json().get("modelos", [])
        modelos = _modelos_cache

        nome_lower = nome_carro.lower().replace(" type r", "").replace(" ", "")
        modelos_encontrados = []

        for m in modelos:
            m_lower = m["nome"].lower().replace(" ", "")
            if nome_lower in m_lower or m_lower in nome_lower:
                modelos_encontrados.append(m)

        if not modelos_encontrados:
            for m in modelos:
                if nome_carro.lower() in m["nome"].lower():
                    modelos_encontrados.append(m)

        if not modelos_encontrados:
            return jsonify({"erro": "Modelo não encontrado na tabela FIPE"}), 404

        def buscar_modelo(modelo):
            modelo_id = modelo["codigo"]
            try:
                resp_anos = requests.get(
                    f"{FIPE_API}/modelos/{modelo_id}/anos", timeout=10
                )
                anos = resp_anos.json()

                ano_mais_recente = None
                for ano in anos:
                    try:
                        ano_num = int(ano["codigo"].split("-")[0])
                    except (ValueError, IndexError):
                        continue
                    if ano_mais_recente is None or ano_num > int(ano_mais_recente["codigo"].split("-")[0]):
                        ano_mais_recente = ano

                if ano_mais_recente:
                    resp_preco = requests.get(
                        f"{FIPE_API}/modelos/{modelo_id}/anos/{ano_mais_recente['codigo']}",
                        timeout=10,
                    )
                    return resp_preco.json()
            except Exception:
                pass
            return None

        with ThreadPoolExecutor(max_workers=10) as executor:
            resultados = list(filter(None, executor.map(buscar_modelo, modelos_encontrados)))

        resultados.sort(key=lambda x: (x.get("Modelo", ""), x.get("AnoModelo", 0)))

        return jsonify({
            "modelo": nome_carro,
            "fipe": resultados
        })

    except requests.RequestException as e:
        return jsonify({"erro": f"Erro ao consultar FIPE: {str(e)}"}), 500


GROQ_API_KEY = os.getenv("GROQ_APIKEY")


@app.route("/api/chat", methods=["POST"])
def chat():
    dados = request.json
    mensagem = dados.get("mensagem", "")

    if not GROQ_API_KEY:
        return jsonify({"erro": "Chave da API não configurada"}), 500

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {
                "role": "system",
                "content": "Você é um assistente virtual da Honda do Brasil. Responda apenas em português do Brasil, de forma educada e útil, tirando dúvidas sobre carros Honda, tabela FIPE, concessionárias, etc."
            },
            {"role": "user", "content": mensagem}
        ]
    }

    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        data = resp.json()
        if resp.status_code == 200:
            return jsonify({"resposta": data["choices"][0]["message"]["content"]})
        else:
            erro = data.get("error", {}).get("message", "Erro desconhecido")
            return jsonify({"erro": f"Erro na API: {erro}"}), 500
    except Exception as e:
        return jsonify({"erro": f"Erro no servidor: {str(e)}"}), 500


if __name__ == "__main__":
    import webbrowser
    webbrowser.open("http://localhost:5000")
    app.run(debug=True, port=5000)
