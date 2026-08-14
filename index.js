const express = require('express');
const path = require('path');
const app = express();

require('dotenv').config();
const session = require('express-session');

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 30,
    httpOnly: true,
    secure: false
  }
}));

app.use(express.static(path.join(__dirname, 'public')));


function exigeLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({ erro: 'faça login para continuar' });
  }
  next();
}


app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body;
  const credenciaisValidas =
    usuario === process.env.ADMIN_USERNAME &&
    senha === process.env.ADMIN_PASSWORD;
  if (!credenciaisValidas) {
    return res.status(401).json({ erro: 'usuário ou senha inválidos' });
  }
  req.session.usuario = usuario;
  req.session.logadoEm = new Date().toISOString();
  req.session.acessosPerfil = 0;

  res.status(200).json({ mensagem: `Bem-vindeee, ${usuario}!, contador: ${req.session.acessosPerfil}` });
});

app.get('/api/test/login', (req, res) => {
  res.status(200).json({ mensagem: 'Login bem-sucedido!' });
});

app.get('/api/perfil', exigeLogin, (req, res) => {
  req.session.acessosPerfil = (req.session.acessosPerfil || 0) + 1;
  res.status(200).json({
    usuario: req.session.usuario,
    logadoEm: req.session.logadoEm,
    acessosPerfil: req.session.acessosPerfil,
    mensagem: `Você acessou o perfil ${req.session.acessosPerfil} vezes.`
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ erro: 'erro ao encerrar sessão' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ mensagem: 'sessão encerrada' });
  });
});

let series = [
  { id: 1, name: 'Dr. House', episodes: 150 },
  { id: 2, name: 'Better Call Saul', episodes: 68 },
  { id: 3, name: 'Nossa Bandeira é a morte', episodes: 24 },
  { id: 4, name: 'Good Ommns', episodes: 13 },
  { id: 5, name: 'Loki', episodes: 12 },
];

app.get('/', (res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/series/:id/csv', (req, res) => {
  const id = Number(req.params.id);
  const serie = series.find((p) => p.id === id);

  if (!serie) {
    return res.status(404).json({ erro: 'Série não encontrada' });
  }

  res.set('Content-Type', 'text/csv');
  res.send(`${serie.id},${serie.name},${serie.episodes}`);
});

app.get('/api/debug/headers', (req, res) => {
  const userAgent = req.headers['user-agent'];
  const auth = req.get('Authorization');

  res.status(200).json({
    contentType: req.get('Content-Type'),
    userAgent,
    autenticado: Boolean(auth),
  });
});


// GET - Listar todas as séries
app.get('/api/series', (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(200).json(series);
  }

  const filtrados = series.filter((p) =>
    p.name.toLowerCase().includes(name.toLowerCase())
  );
  res.status(200).json(filtrados);
});

// GET - Buscar série por ID
app.get('/api/series/:id', (req, res) => {
  const id = Number(req.params.id);
  const serie = series.find((p) => p.id === id);

  if (!serie) {
    return res.status(404).json({ erro: 'Série não encontrada' });
  }

  res.status(200).json(serie);
});

// POST - Criar nova série
app.post('/api/series', (req, res) => {
  const { name, episodes } = req.body;

  if (!name || typeof episodes !== 'number') {
    return res.status(400).json({
      erro: 'name (texto) e episodes (número) são obrigatórios',
    });
  }

  const newSerie = {
    id: series.length + 1,
    name,
    episodes,
  };

  series.push(newSerie);
  res.status(201).json(newSerie);
});

// PUT - Atualizar série existente
app.put('/api/series/:id', exigeLogin, (req, res) => {
  const id = Number(req.params.id);
  const { name, episodes } = req.body;

  const serie = series.find((p) => p.id === id);
  if (!serie) {
    return res.status(404).json({ erro: 'Série não encontrada' });
  }

  if (!name || typeof episodes !== 'number') {
    return res.status(400).json({ erro: 'Dados inválidos' });
  }

  serie.name = name;
  serie.episodes = episodes;

  res.status(200).json(serie);
});

// DELETE - Remover série
app.delete('/api/series/:id', exigeLogin,(req, res) => {
  const id = Number(req.params.id);
  const index = series.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ erro: 'Série não encontrada' });
  }

  series.splice(index, 1);
  res.status(204).send();
});

app.use((err, req, res, next) => {
  try {
    const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    console.log(`[${dataHora}] ${req.method} ${req.url}`);
    console.error('Erro:', err.message);
    console.error('Stack trace:', err.stack);

    if (['POST', 'PUT'].includes(req.method)) {
        console.log('Corpo da requisição:', req.body);
    }
  } catch (error) {
    console.error('Erro ao processar erro:', error);
    next();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));

