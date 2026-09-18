const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { google } = require('googleapis');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Planilha1';

app.use(express.json());
app.use(express.static(__dirname));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const MOCK_DRIVERS = [
  {
    id: 'D001',
    cpf: '12345678900',
    rg: '1234567',
    nome: 'João da Silva',
    placa: 'ABC-1234',
    appStatus: 'OK',
    cnhStatus: 'Válida'
  },
  {
    id: 'D002',
    cpf: '98765432100',
    rg: '7654321',
    nome: 'Maria Oliveira',
    placa: 'XYZ-9876',
    appStatus: 'OK',
    cnhStatus: 'Válida'
  }
];

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function buildDriverFromRow(row, headers) {
  const map = {};
  headers.forEach((header, index) => {
    map[header] = row[index] ?? '';
  });

  return {
    id: map.id || map['driver id'] || map.codigo || row[0] || '',
    cpf: map.cpf || row[1] || '',
    rg: map.rg || row[2] || '',
    nome: map.nome || map['nome do motorista'] || map.motorista || map['driver name'] || row[1] || 'Não informado',
    placa: map.placa || map['placa cadastrada'] || map['license plate'] || row[4] || 'Não informada',
    appStatus: map['status app'] || map['app status'] || map.app || map['spx status'] || row[5] || 'OK',
    cnhStatus: map['status cnh'] || map.cnh || map.habilitacao || map['habilitação'] || map['driver license expire date'] || row[6] || 'Válida'
  };
}

function getGoogleAuth() {
  const rawJson = process.env.GOOGLE_CREDENTIALS_JSON;
  const jsonPath = process.env.GOOGLE_CREDENTIALS_PATH;

  try {
    if (rawJson) {
      const credentials = JSON.parse(rawJson);
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    }

    if (jsonPath && fs.existsSync(jsonPath)) {
      const fileContent = fs.readFileSync(jsonPath, 'utf8');
      const credentials = JSON.parse(fileContent);
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    }

    return null;
  } catch (error) {
    console.error('Credenciais do Google inválidas:', error.message);
    return null;
  }
}

async function resolveSheetName(sheetsApi) {
  const configuredName = SHEET_NAME && SHEET_NAME.trim();

  if (configuredName) {
    try {
      const meta = await sheetsApi.spreadsheets.get({
        spreadsheetId: SHEET_ID,
        fields: 'sheets/properties/title'
      });

      const titles = (meta.data.sheets || []).map((sheet) => sheet.properties.title);
      if (titles.includes(configuredName)) {
        return configuredName;
      }
    } catch (error) {
      console.warn('Não foi possível validar SHEET_NAME; usando o valor configurado.', error.message);
    }
  }

  try {
    const meta = await sheetsApi.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      fields: 'sheets/properties/title'
    });

    const title = (meta.data.sheets || [])[0]?.properties?.title;
    return title || configuredName || 'Planilha1';
  } catch (error) {
    console.error('Erro ao resolver nome da aba:', error.message);
    return configuredName || 'Planilha1';
  }
}

async function readDriverFromGoogleSheets(term) {
  if (!SHEET_ID) return null;

  const auth = getGoogleAuth();
  if (!auth) return null;

  const sheets = google.sheets({ version: 'v4', auth });
  const activeSheetName = await resolveSheetName(sheets);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${activeSheetName}!A:Z`
  });

  const rows = response.data.values || [];
  if (!rows.length) return null;

  const headers = rows[0].map((header) => normalizeText(header));

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || !row.some((cell) => cell !== '')) continue;

    const data = buildDriverFromRow(row, headers);
    const normalizedTerm = normalizeText(term);
    const matches = [
      normalizeText(data.id),
      normalizeText(data.cpf),
      normalizeText(data.rg)
    ];

    if (matches.includes(normalizedTerm)) {
      return {
        sucesso: true,
        ...data
      };
    }
  }

  return null;
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Servidor funcionando',
    configured: Boolean(SHEET_ID)
  });
});

app.post('/api/checkins', async (req, res) => {
  try {
    const dadosCheckin = req.body;

    if (!dadosCheckin || !dadosCheckin.driverId || !dadosCheckin.operador) {
      return res.status(400).json({ sucesso: false, mensagem: 'Dados do check-in incompletos.' });
    }

    if (!SHEET_ID) {
      return res.json({ sucesso: true, mensagem: 'Check-in simulado com sucesso. Configure SHEET_ID para gravar no Google Sheets.' });
    }

    const auth = getGoogleAuth();
    if (!auth) {
      return res.status(500).json({ sucesso: false, mensagem: 'Credenciais do Google não configuradas.' });
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const activeSheetName = await resolveSheetName(sheets);
    const agora = new Date();
    const row = [
      agora.toISOString(),
      dadosCheckin.operador,
      dadosCheckin.driverId,
      dadosCheckin.driverNome,
      dadosCheckin.driverCpf,
      dadosCheckin.driverRg,
      dadosCheckin.placaStatus,
      dadosCheckin.ocorrencia || 'Nenhuma',
      dadosCheckin.qtdAjudantes || 0,
      dadosCheckin.nomesAjudantes || 'N/A',
      dadosCheckin.docsAjudantes || 'N/A'
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${activeSheetName}!A:K`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row]
      }
    });

    return res.json({ sucesso: true });
  } catch (error) {
    console.error('Erro ao gravar check-in:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao gravar check-in.' });
  }
});

app.get('/api/drivers', async (req, res) => {
  const term = String(req.query.term || '').trim();

  if (!term) {
    return res.status(400).json({ sucesso: false, mensagem: 'Informe um ID, CPF ou RG.' });
  }

  try {
    const fromSheets = await readDriverFromGoogleSheets(term);
    if (fromSheets) {
      return res.json(fromSheets);
    }

    const found = MOCK_DRIVERS.find((driver) => {
      return [driver.id, driver.cpf, driver.rg].some((value) => normalizeText(value) === normalizeText(term));
    });

    if (found) {
      return res.json({ sucesso: true, ...found });
    }

    return res.json({ sucesso: false, mensagem: 'Driver não encontrado na base de dados.' });
  } catch (error) {
    console.error('Erro ao consultar motorista:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao consultar motorista.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
