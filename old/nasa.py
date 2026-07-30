import requests

data = '2004-11-01' # Substitua por sua data de nascimento no formato AAAA-MM-DD

resultado = requests.get('https://api.nasa.gov/planetary/apod?api_key=at0iv3xwtoNBADvagvcueIyvNV0RVjPHM6n0rRKd&date={}'.format(data))
print(resultado.status_code)
print(resultado.json())