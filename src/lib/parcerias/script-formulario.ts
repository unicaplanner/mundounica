// Codigo do Apps Script que a Lari cola na planilha de respostas do Google
// Forms de permuta. Cada resposta nova vai sozinha pro Mundo da Unica.
export function scriptFormulario(urlWebhook: string) {
  return `// Mundo da Unica: manda cada resposta do formulário de permuta pro sistema.
const URL_MUNDO = "${urlWebhook}";

// Gatilho "Ao enviar o formulário" chama esta função.
function aoEnviarFormulario(e) {
  const linha = e.range.getRow();
  const quando = e.range.getSheet().getRange(linha, 1).getValue();
  enviarResposta(e.namedValues, quando instanceof Date ? quando : new Date());
}

function enviarResposta(respostas, quando) {
  const r = UrlFetchApp.fetch(URL_MUNDO, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ respostas: respostas, enviadaEm: quando.toISOString() }),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 200) {
    throw new Error("Mundo da Unica respondeu " + r.getResponseCode() + ": " + r.getContentText());
  }
}

// Rode uma vez pra mandar as respostas que já estão na planilha.
// (Pode rodar de novo sem medo: o sistema ignora as repetidas.)
function enviarTodasAsRespostas() {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const linhas = aba.getDataRange().getValues();
  const perguntas = linhas[0];
  for (let i = 1; i < linhas.length; i++) {
    const respostas = {};
    perguntas.forEach(function (p, j) {
      respostas[p] = [String(linhas[i][j])];
    });
    const quando = linhas[i][0] instanceof Date ? linhas[i][0] : new Date();
    enviarResposta(respostas, quando);
  }
}
`;
}
