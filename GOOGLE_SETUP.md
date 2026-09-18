# Configuração do Google Sheets para a PWA

## 1) Criar projeto no Google Cloud

1. Acesse: https://console.cloud.google.com/
2. Crie um projeto novo, por exemplo: `checkin-drivers`
3. Confirme o projeto ativo

## 2) Ativar a API do Google Sheets

1. Acesse `APIs e serviços` > `Biblioteca`
2. Procure por `Google Sheets API`
3. Clique em `Ativar`

## 3) Criar conta de serviço

1. Acesse `APIs e serviços` > `Credenciais`
2. Clique em `Criar credenciais` > `Conta de serviço`
3. Nome: `checkin-drivers-sheet`
4. Clique em `Criar e continuar`
5. Não precisa preencher permissões extras
6. Clique em `Concluir`

## 4) Gerar chave JSON

1. Na conta de serviço criada, entre em `Chaves`
2. Clique em `Adicionar chave` > `Criar nova chave`
3. Escolha `JSON`
4. Faça o download do arquivo
5. Esse arquivo contém o JSON da conta de serviço

## 5) Compartilhar a planilha com a conta de serviço

1. Abra a planilha do link:
   https://docs.google.com/spreadsheets/d/1IIiRiVRvaHudtMY2K71OCNV-WUV5ZHT1d8dVQlenA5s/edit?usp=sharing
2. Clique em `Compartilhar`
3. Adicione o e-mail da conta de serviço no formato:
   `nome-da-conta@projeto.iam.gserviceaccount.com`
4. Dê permissão de `Editor`

## 6) Configurar o arquivo .env

Abra o arquivo `.env` e preencha com dados reais:

```env
PORT=3000
SHEET_ID=1IIiRiVRvaHudtMY2K71OCNV-WUV5ZHT1d8dVQlenA5s
SHEET_NAME=Planilha1
GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@...iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/..."}
```

> O conteúdo da variável `GOOGLE_CREDENTIALS_JSON` deve ser o JSON inteiro, em uma linha só, com aspas e escapes corretamente.

## 7) Reiniciar o servidor

Se o backend estiver rodando na porta 3000, pare o processo anterior e execute:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\Eduardo\OneDrive\Desktop\Check-in de Draivers\server.js'
```

## 8) Testar

Abra no navegador:

```text
http://localhost:3000
```

Se tudo estiver correto, a app consegue consultar a planilha e salvar check-ins.
