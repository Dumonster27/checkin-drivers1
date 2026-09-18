function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Check-in de Driver - Shopee Logística')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function normalizarValor(valor) {
  if (valor === null || valor === undefined) return '';
  return valor.toString().trim().toLowerCase();
}

function localizarIndicesColunas(cabecalho) {
  var indices = {
    id: 0,
    cpf: 1,
    rg: 2,
    nome: 3,
    placa: 4,
    appStatus: 5,
    cnhStatus: 6
  };

  if (!cabecalho || !cabecalho.length) {
    return { indices: indices, temCabecalho: false };
  }

  var mapa = {};
  for (var i = 0; i < cabecalho.length; i++) {
    if (!cabecalho[i]) continue;
    var chave = cabecalho[i].toString().trim().toLowerCase();
    mapa[chave] = i;
  }

  var campos = {
    id: ['id', 'identificacao', 'codigo', 'driver id'],
    cpf: ['cpf'],
    rg: ['rg'],
    nome: ['nome', 'nome do motorista', 'motorista'],
    placa: ['placa', 'placa cadastrada'],
    appStatus: ['status app', 'app status', 'app'],
    cnhStatus: ['status cnh', 'cnh', 'habilitacao', 'habilitação']
  };

  for (var nomeCampo in campos) {
    for (var j = 0; j < campos[nomeCampo].length; j++) {
      if (mapa[campos[nomeCampo][j]] !== undefined) {
        indices[nomeCampo] = mapa[campos[nomeCampo][j]];
        break;
      }
    }
  }

  return { indices: indices, temCabecalho: true };
}

// Função para buscar dados do motorista na planilha pelo ID, CPF ou RG
function buscarMotorista(termoBusca) {
  var debug = {
    termo: termoBusca,
    abas: []
  };

  try {
    var sheetId = '1IIiRiVRvaHudtMY2K71OCNV-WUV5ZHT1d8dVQlenA5s';
    var ss = SpreadsheetApp.openById(sheetId);
    var abas = ss.getSheets();
    var termo = normalizarValor(termoBusca);

    if (!termo) {
      return { sucesso: false, mensagem: 'Digite o ID, CPF ou RG para consultar.', debug: debug };
    }

    for (var a = 0; a < abas.length; a++) {
      var abaDados = abas[a];
      var dados = abaDados.getDataRange().getValues();

      if (!dados || !dados.length) {
        debug.abas.push({ nome: abaDados.getName(), linhas: 0, cabecalho: [] });
        continue;
      }

      var configuracao = localizarIndicesColunas(dados[0]);
      debug.abas.push({
        nome: abaDados.getName(),
        linhas: dados.length,
        cabecalho: dados[0],
        indices: configuracao.indices
      });

      var indiceInicio = configuracao.temCabecalho ? 1 : 0;
      var idx = configuracao.indices;

      for (var i = indiceInicio; i < dados.length; i++) {
        var linha = dados[i];
        if (!linha || !linha.some(function(valor) { return valor !== '' && valor !== null && valor !== undefined; })) {
          continue;
        }

        var id = normalizarValor(linha[idx.id] !== undefined ? linha[idx.id] : linha[0]);
        var cpf = normalizarValor(linha[idx.cpf] !== undefined ? linha[idx.cpf] : linha[1]);
        var rg = normalizarValor(linha[idx.rg] !== undefined ? linha[idx.rg] : linha[2]);

        if (id === termo || cpf === termo || rg === termo) {
          console.log('Motorista encontrado na aba:', abaDados.getName());
          console.log('Linha correspondente:', linha);
          return {
            sucesso: true,
            id: linha[idx.id] !== undefined ? linha[idx.id] : (linha[0] || ''),
            cpf: linha[idx.cpf] !== undefined ? linha[idx.cpf] : (linha[1] || ''),
            rg: linha[idx.rg] !== undefined ? linha[idx.rg] : (linha[2] || ''),
            nome: linha[idx.nome] !== undefined ? linha[idx.nome] : (linha[3] || 'Não informado'),
            placa: linha[idx.placa] !== undefined ? linha[idx.placa] : (linha[4] || 'Não informada'),
            appStatus: linha[idx.appStatus] !== undefined ? linha[idx.appStatus] : (linha[5] || 'OK'),
            cnhStatus: linha[idx.cnhStatus] !== undefined ? linha[idx.cnhStatus] : (linha[6] || 'Válida'),
            debug: debug
          };
        }
      }
    }

    console.log('Busca finalizada sem resultado. Debug:', debug);
    return { sucesso: false, mensagem: 'Driver não encontrado na base de dados.', debug: debug };
  } catch (e) {
    console.error('Erro em buscarMotorista:', e);
    return { sucesso: false, mensagem: 'Erro ao consultar a planilha: ' + e.message, debug: debug };
  }
}

// Função para registrar o Check-in concluído na planilha
function salvarCheckin(dadosCheckin) {
  var sheetId = '1IIiRiVRvaHudtMY2K71OCNV-WUV5ZHT1d8dVQlenA5s';
  var ss = SpreadsheetApp.openById(sheetId);
  var abaCheckin = ss.getSheetByName('Check-in de Driver');
  
  // Se a aba não existir, cria automaticamente com os cabeçalhos
  if (!abaCheckin) {
    abaCheckin = ss.insertSheet('Check-in de Driver');
    abaCheckin.appendRow([
      'Data/Hora', 
      'Segurança Responsável', 
      'ID Driver', 
      'Nome Driver', 
      'CPF', 
      'RG', 
      'Placa Confere?', 
      'Avarias/Ocorrência', 
      'Qtd Ajudantes', 
      'Nome(s) Ajudante(s)', 
      'Doc(s) Ajudante(s)'
    ]);
  }
  
  var agora = new Date();
  var dataFormatada = Utilities.formatDate(agora, "GMT-3", "dd/MM/yyyy HH:mm:ss");
  
  abaCheckin.appendRow([
    dataFormatada,
    dadosCheckin.operador,
    dadosCheckin.driverId,
    dadosCheckin.driverNome,
    dadosCheckin.driverCpf,
    dadosCheckin.driverRg,
    dadosCheckin.placaStatus,
    dadosCheckin.ocorrencia || 'Nenhuma',
    dadosCheckin.qtdAjudantes,
    dadosCheckin.nomesAjudantes || 'N/A',
    dadosCheckin.docsAjudantes || 'N/A'
  ]);
  
  return { sucesso: true };
}