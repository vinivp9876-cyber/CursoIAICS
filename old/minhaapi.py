from flask import Flask, render_template, request
import requests

app = Flask(__name__, template_folder='.')

@app.route('/')
def home():
    
    data = request.args.get('data_escolhida', '1998-05-27')
    
    url = f'https://api.nasa.gov/planetary/apod?api_key=at0iv3xwtoNBADvagvcueIyvNV0RVjPHM6n0rRKd&date={data}'
    
    resultado = requests.get(url)
    
    try:
        dados_nasa = resultado.json()
        if 'code' in dados_nasa and 'msg' in dados_nasa:
            # Caso a API retorne um erro mapeado
            dados_nasa['title'] = 'Erro da API'
            dados_nasa['explanation'] = dados_nasa['msg']
            dados_nasa['url'] = ''
    except Exception:
        dados_nasa = {
            'title': f'Erro na API (Status {resultado.status_code})',
            'date': data,
            'explanation': 'Não foi possível carregar os dados. A API da NASA pode estar fora do ar ou o limite de requisições foi atingido.',
            'url': '',
            'media_type': 'image'
        }
    
    return render_template('nasa.html', info=dados_nasa, data_atual=data)


if __name__ == '__main__':
    app.run(debug=True)