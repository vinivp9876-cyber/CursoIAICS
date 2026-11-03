# Desafio: Sistema de Achados e Perdidos

## 1. Objetivo

Criar um sistema web para resolver um problema comum em escolas: organizar objetos encontrados e permitir que as pessoas consultem o que foi encontrado.

O sistema deverá utilizar:

- **Frontend:** HTML, CSS e JavaScript
- **Backend:** Node.js e Express
- **Banco de dados:** Supabase / PostgreSQL
- **Comunicação:** API HTTP usando `fetch()`

> **Importante:** neste desafio não vamos trabalhar com login, JWT ou RLS. O objetivo é aprender a integração entre frontend, backend, API e banco de dados.

---

# 2. Problema

Na escola, muitas vezes alunos encontram objetos perdidos, como:

- celulares
- chaves
- mochilas
- documentos
- casacos
- fones de ouvido
- materiais escolares

O problema é que não existe uma maneira organizada de registrar e consultar esses objetos.

### Desafio

Criar um sistema web de **Achados e Perdidos** que permita:

1. Cadastrar um objeto encontrado.
2. Listar os objetos encontrados.
3. Pesquisar objetos.
4. Alterar o status de um objeto para `retirado`.

---

# 3. Arquitetura do sistema

O projeto deverá ter frontend e backend separados.

```text
sistema-achados-perdidos/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── backend/
    ├── server.js
    ├── package.json
    ├── package-lock.json
    └── .env
```

A comunicação será:

```text
┌──────────────────────────┐
│        FRONTEND          │
│                          │
│ HTML + CSS + JavaScript  │
└────────────┬─────────────┘
             │
             │ HTTP / JSON
             ↓
┌──────────────────────────┐
│         BACKEND          │
│                          │
│ Node.js + Express        │
└────────────┬─────────────┘
             │
             │ Supabase API
             ↓
┌──────────────────────────┐
│        SUPABASE          │
│                          │
│ PostgreSQL               │
│                          │
│ tabela: objetos          │
└──────────────────────────┘
```

O frontend **não deve acessar o Supabase diretamente**.

O fluxo deverá ser:

```text
Usuário
   ↓
Frontend
   ↓
fetch()
   ↓
Node.js / Express
   ↓
Supabase
   ↓
PostgreSQL
```

---

# 4. Banco de dados

O banco será criado no Supabase.

A tabela principal será:

```text
objetos
```

Ela terá os seguintes campos:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | bigint | Identificador do objeto |
| `nome` | text | Nome do objeto |
| `descricao` | text | Descrição do objeto |
| `local_encontrado` | text | Onde o objeto foi encontrado |
| `data_encontrado` | date | Data em que foi encontrado |
| `status` | text | Situação do objeto |
| `created_at` | timestamptz | Data de cadastro |

---

# 5. Criando a tabela no Supabase

Entre no seu projeto no Supabase.

No menu lateral, procure:

```text
SQL Editor
```

Clique em:

```text
New query
```

Cole o SQL abaixo:

```sql
CREATE TABLE public.objetos (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nome TEXT NOT NULL,

    descricao TEXT,

    local_encontrado TEXT NOT NULL,

    data_encontrado DATE NOT NULL,

    status TEXT NOT NULL DEFAULT 'disponivel',

    created_at TIMESTAMPTZ DEFAULT NOW()

);
```

Depois clique em **Run**.

A tabela `objetos` deverá ser criada.

---

# 6. Testando a tabela

Podemos inserir alguns objetos de teste:

```sql
INSERT INTO public.objetos
    (nome, descricao, local_encontrado, data_encontrado)
VALUES
    ('Fone de ouvido', 'Fone preto JBL', 'Sala 12', '2026-08-28'),
    ('Chave', 'Chave com chaveiro azul', 'Pátio', '2026-08-29'),
    ('Mochila', 'Mochila preta', 'Biblioteca', '2026-08-29');
```

Para consultar:

```sql
SELECT * FROM public.objetos;
```

O banco deverá conter algo semelhante a:

```text
id | nome            | descricao          | local | data       | status
---+-----------------+--------------------+-------+------------+----------
1  | Fone de ouvido  | Fone preto JBL     | Sala  | 2026-08-28 | disponivel
2  | Chave           | Chave azul         | Pátio | 2026-08-29 | disponivel
3  | Mochila         | Mochila preta      | Bib.  | 2026-08-29 | disponivel
```

---

# 7. Como conseguir a URL e a chave do Supabase

## Passo 1: entrar no Supabase

Acesse:

https://supabase.com/

Entre na sua conta e abra o projeto criado para o trabalho.

---

## Passo 2: encontrar a URL do projeto

No projeto, procure a área:

```text
Settings
```

Depois:

```text
API
```

Dependendo da interface atual do Supabase, essas informações também podem aparecer no **Connect dialog**.

Procure por algo semelhante a:

```text
Project URL
```

A URL terá um formato parecido com:

```text
https://xxxxxxxxxxxx.supabase.co
```

Copie essa URL.

---

# 8. Como conseguir a Secret Key

No projeto do Supabase, vá para:

```text
Settings
    ↓
API Keys
```

Procure a seção:

```text
Publishable and secret API keys
```

Para este projeto, como o acesso ao Supabase será feito pelo **backend Node.js**, vamos utilizar a:

```text
Secret Key
```

Ela começa normalmente com:

```text
sb_secret_
```

Exemplo fictício:

```text
sb_secret_123456789abcdefghijkl
```

> **Não copie o exemplo acima.** Use a chave gerada pelo seu próprio projeto.

A documentação atual do Supabase diferencia as novas **Publishable Keys** (`sb_publishable_...`) das **Secret Keys** (`sb_secret_...`). As antigas chaves `anon` e `service_role` fazem parte do sistema legado de chaves e estão sendo substituídas.

---

# 9. ATENÇÃO com a Secret Key

A Secret Key possui permissões elevadas.

Neste projeto, ela ficará **somente no backend**.

NÃO coloque a Secret Key em:

- `index.html`
- `style.css`
- `script.js`
- código JavaScript executado no navegador
- GitHub
- arquivos enviados publicamente

A chave deverá ficar em um arquivo `.env` dentro do backend.

---

# 10. Criando o arquivo .env

Dentro da pasta `backend`, crie:

```text
.env
```

Estrutura:

```text
backend/
│
├── server.js
├── package.json
├── package-lock.json
└── .env
```

Dentro do `.env`:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_SUA_CHAVE_AQUI
```

Substitua os valores pelos dados do seu projeto.

Exemplo fictício:

```env
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_SECRET_KEY=sb_secret_123456789
```

---

# 11. Instalar as bibliotecas do backend

Abra o terminal dentro da pasta `backend`.

Execute:

```bash
npm init -y
```

Depois:

```bash
npm install express cors dotenv @supabase/supabase-js
```

Essas bibliotecas serão utilizadas para:

| Biblioteca | Função |
|---|---|
| `express` | Criar o servidor e a API |
| `cors` | Permitir comunicação entre frontend e backend durante o desenvolvimento |
| `dotenv` | Ler as variáveis do arquivo `.env` |
| `@supabase/supabase-js` | Conectar o Node.js ao Supabase |

---

# 12. API obrigatória

O backend deverá possuir pelo menos estas operações:

## Listar objetos

```http
GET /objetos
```

Deverá retornar todos os objetos cadastrados.

---

## Cadastrar objeto

```http
POST /objetos
```

Deverá receber:

```json
{
    "nome": "Fone de ouvido",
    "descricao": "Fone preto JBL",
    "local_encontrado": "Sala 12",
    "data_encontrado": "2026-08-28"
}
```

---

## Alterar status

```http
PUT /objetos/:id
```

Deverá permitir alterar o status para:

```text
disponivel
```

ou:

```text
retirado
```

---

## Excluir objeto

Como desafio adicional:

```http
DELETE /objetos/:id
```

---

# 13. Frontend obrigatório

O frontend deverá possuir um formulário semelhante a:

```text
╔══════════════════════════════════════╗
║       🔎 ACHADOS E PERDIDOS          ║
╠══════════════════════════════════════╣
║                                      ║
║ Objeto:                              ║
║ [____________________________]       ║
║                                      ║
║ Descrição:                           ║
║ [____________________________]       ║
║                                      ║
║ Local encontrado:                    ║
║ [____________________________]       ║
║                                      ║
║ Data:                                ║
║ [____________________________]       ║
║                                      ║
║        [ CADASTRAR ]                 ║
╚══════════════════════════════════════╝
```

Abaixo deverá existir uma lista:

```text
Objetos encontrados

🎧 Fone de ouvido
Fone preto JBL
Sala 12
28/08/2026

[ MARCAR COMO RETIRADO ]
```

---

# 14. Requisitos obrigatórios

O sistema precisa ter:

### Frontend

- [ ] HTML
- [ ] CSS
- [ ] JavaScript
- [ ] Formulário de cadastro
- [ ] Lista de objetos
- [ ] Campo de pesquisa
- [ ] Botão para marcar objeto como retirado

### Backend

- [ ] Node.js
- [ ] Express
- [ ] API REST
- [ ] `GET`
- [ ] `POST`
- [ ] `PUT`

### Banco

- [ ] Supabase
- [ ] PostgreSQL
- [ ] Tabela `objetos`
- [ ] Dados persistidos no banco

### Comunicação

O frontend deve utilizar:

```javascript
fetch()
```

para conversar com o backend.

O frontend **não deve acessar o Supabase diretamente**.

---

# 15. Pesquisa

O usuário deverá conseguir pesquisar objetos.

Por exemplo:

```text
Pesquisar:

[ fone                     ] [ 🔍 ]
```

O sistema deverá encontrar objetos relacionados ao termo pesquisado.

Pode ser implementado inicialmente no frontend ou através de uma rota específica da API.

---

# 16. Status dos objetos

Cada objeto terá um status.

Inicialmente:

```text
disponivel
```

Quando alguém retirar:

```text
retirado
```

Exemplo:

```text
Fone de ouvido
Status: 🟢 Disponível
```

Depois:

```text
Fone de ouvido
Status: 🔴 Retirado
```

Objetos retirados não devem aparecer como disponíveis.

---

# 17. CRUD

O projeto pode ser utilizado para praticar CRUD:

```text
C = Create
R = Read
U = Update
D = Delete
```

No nosso sistema:

```text
CREATE → cadastrar objeto
READ   → listar objetos
UPDATE → marcar como retirado
DELETE → excluir objeto
```

---

# 18. Desafios extras

Depois de terminar os requisitos obrigatórios, escolha alguns desafios.

## Desafio 1: Categorias

Adicionar uma categoria:

```text
Eletrônico
Material escolar
Documento
Roupa
Chave
Outro
```

Será necessário alterar o banco e o frontend.

---

## Desafio 2: Filtro

Criar filtros:

```text
[ Todos ] [ Disponíveis ] [ Retirados ]
```

---

## Desafio 3: Estatísticas

Criar uma área mostrando:

```text
Objetos encontrados: 35

Disponíveis: 21

Retirados: 14
```

---

## Desafio 4: Edição

Permitir editar:

- nome
- descrição
- local
- data

---

## Desafio 5: Imagem

Permitir adicionar uma foto do objeto.

Este desafio pode ser feito posteriormente utilizando o **Supabase Storage**.

---

# 19. Outras ideias de sistemas

Se o grupo não quiser fazer Achados e Perdidos, pode escolher outro problema.

### 1. Sistema de pedidos da cantina

Cadastrar produtos e pedidos.

### 2. Reserva de quadras

Alunos podem consultar e reservar horários.

### 3. Empréstimo de livros

Cadastrar livros e controlar empréstimos.

### 4. Cadastro de animais para adoção

Cadastrar animais disponíveis para adoção.

### 5. Empréstimo de jogos

Controlar jogos disponíveis e emprestados.

### 6. Reserva de computadores

Permitir reservar computadores ou laboratórios.

### 7. Inscrição em eventos

Cadastrar alunos em eventos escolares.

### 8. Controle de estacionamento

Registrar veículos e horários.

### 9. Sistema de problemas da escola

Registrar problemas como:

- lâmpada quebrada
- computador com defeito
- ar-condicionado quebrado
- projetor com problema
- torneira com vazamento

---

# 20. O que será avaliado

Uma sugestão de avaliação:

| Critério | Pontos |
|---|---:|
| Frontend funcionando | 2,0 |
| Backend/API funcionando | 2,0 |
| Integração com Supabase | 2,0 |
| CRUD | 1,5 |
| Interface/UX | 1,0 |
| Organização do código | 0,5 |
| Criatividade | 1,0 |
| **Total** | **10,0** |

---

# 21. Entrega

O grupo deverá entregar:

```text
projeto/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
│
└── README.md
```

## IMPORTANTE

Não enviar a Secret Key real no projeto.

Em vez de enviar o `.env`, criar:

```text
.env.example
```

com:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

O professor poderá configurar as chaves localmente.

---

# 22. Resultado esperado

Ao final, o grupo deverá ter construído uma aplicação com esta arquitetura:

```text
                    USUÁRIO
                       │
                       ↓
              ┌─────────────────┐
              │    FRONTEND     │
              │                 │
              │ HTML            │
              │ CSS             │
              │ JavaScript      │
              └────────┬────────┘
                       │
                       │ fetch()
                       │ HTTP / JSON
                       ↓
              ┌─────────────────┐
              │     BACKEND     │
              │                 │
              │ Node.js         │
              │ Express         │
              └────────┬────────┘
                       │
                       │ Supabase
                       ↓
              ┌─────────────────┐
              │    SUPABASE     │
              │                 │
              │   PostgreSQL    │
              │                 │
              │    objetos      │
              └─────────────────┘
```

O objetivo principal não é apenas fazer uma página bonita. O objetivo é demonstrar que o grupo entende como **frontend, backend, API e banco de dados trabalham juntos para resolver um problema real**.

---

# Referências oficiais

- Supabase: https://supabase.com/
- Documentação de API Keys: https://supabase.com/docs/guides/getting-started/api-keys
- Migração para novas API Keys: https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- Supabase JavaScript: https://supabase.com/docs/reference/javascript/introduction
