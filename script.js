/* ============ LINK DA PLANILHA DO GOOGLE SHEETS ============ */
const URL_GOOGLE_SHEETS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRevLhxFgtDJ68wC4_GpPgLBnPsaWQNYfM8a6Ioh7AKcpycoziL56wxyggBT4SSZ82r7oQZoloL-Qrq/pub?output=csv";

/* ============ CONFIGURAÇÃO DAS FAIXAS ============ */
const FAIXAS = [
  { pct: 10, min: 0, cond: 'Em qualquer compra (sem mínimo)' },
  { pct: 15, min: 300, cond: 'Em compras acima de R$ 300' },
  { pct: 20, min: 1000, cond: 'Em compras acima de R$ 1.000' }
];

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const inCodigo = document.getElementById('in-codigo');
const inBusca = document.getElementById('in-busca');
const listaSugestoes = document.getElementById('lista-sugestoes');
const outProduto = document.getElementById('out-produto');
const outDescricao = document.getElementById('out-descricao');
const outPrecoOferta = document.getElementById('out-preco-oferta');
const outPrecoOriginal = document.getElementById('out-preco-original');
const outMelhor = document.getElementById('out-melhor');
const outDestaque = document.getElementById('out-destaque');

const lblCsv = document.getElementById('lbl-csv');
const txtCsv = document.getElementById('txt-csv');

let precoAtual = 0;
let baseProdutos = {};
let listaProdutosArray = [];

/* Normalização de texto */
function normalizarTexto(str) {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/* Normalização do código de barras */
function normalizarCodigo(codigo) {
  if (!codigo) return '';
  let limpo = String(codigo).trim().replace(/-/g, '');
  return limpo.replace(/^0+/, '');
}

function parsePreco(valor) {
  if (!valor) return NaN;
  let s = String(valor).replace(/[^\d,.-]/g, '');
  if (s.indexOf(',') > -1) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(s);
  return (isNaN(n) || n <= 0) ? NaN : n;
}

/* ============ PROCESSAMENTO DA NUVEM (GOOGLE SHEETS) ============ */
function processarConteudoCsv(conteudo) {
  const linhas = conteudo.split(/\r\n|\n/);
  baseProdutos = {};
  listaProdutosArray = [];
  
  if (linhas.length === 0) return 0;

  let separador = linhas[0].includes(';') ? ';' : ',';
  let cabecalho = linhas[0].split(separador).map(c => c.trim().replace(/^"|"$/g, ''));
  
  let idxCodigo = cabecalho.indexOf('Código Barra Principal');
  if (idxCodigo === -1) idxCodigo = cabecalho.indexOf('Código de Barras');
  if (idxCodigo === -1) idxCodigo = cabecalho.findIndex(c => c.toLowerCase().includes('barra'));

  let idxDescricao = cabecalho.indexOf('Descrição');
  if (idxDescricao === -1) idxDescricao = cabecalho.indexOf('Descrição Completa');
  if (idxDescricao === -1) idxDescricao = cabecalho.findIndex(c => c.toLowerCase().includes('descri'));

  let idxVenda = cabecalho.indexOf('Venda');
  if (idxVenda === -1) idxVenda = cabecalho.findIndex(c => c.trim().toLowerCase() === 'venda');

  let totalCarregado = 0;

  for (let i = 1; i < linhas.length; i++) {
    let linha = linhas[i].trim();
    if (!linha) continue;
    
    // Regex segura para separar respeitando campos com aspas e vírgulas internas
    let colunas = linha.match(/(".*?"|[^";,]+)(?=\s*[,;]|\s*$)/g) || linha.split(separador);
    colunas = colunas.map(c => c.trim().replace(/^"|"$/g, ''));

    if (colunas.length > Math.max(idxCodigo, idxDescricao, idxVenda)) {
      let codigoBruto = colunas[idxCodigo] || '';
      let descricao = colunas[idxDescricao] || '';
      let vendaRaw = colunas[idxVenda] || '0';
      
      let codigoNormalizado = normalizarCodigo(codigoBruto);
      
      if (codigoNormalizado && descricao) {
        let item = {
          codigoOriginal: codigoBruto,
          codigoNorm: codigoNormalizado,
          nome: descricao,
          nomeNorm: normalizarTexto(descricao),
          preco: vendaRaw
        };
        baseProdutos[codigoNormalizado] = item;
        listaProdutosArray.push(item);
        totalCarregado++;
      }
    }
  }
  return totalCarregado;
}

/* Função que busca automaticamente a planilha na nuvem */
function carregarBaseNuvem() {
  if (!URL_GOOGLE_SHEETS || URL_GOOGLE_SHEETS.includes('COLE_SEU_LINK')) {
    if (txtCsv) txtCsv.textContent = 'Aguardando Link Google Sheets';
    return;
  }

  if (txtCsv) txtCsv.textContent = 'Sincronizando Nuvem...';

  fetch(URL_GOOGLE_SHEETS)
    .then(resposta => resposta.text())
    .then(conteudo => {
      const total = processarConteudoCsv(conteudo);
      if (lblCsv && txtCsv) {
        lblCsv.classList.add('carregado');
        txtCsv.textContent = `Sincronizado`;
      }
    })
    .catch(erro => {
      console.error('Erro ao conectar com Google Sheets:', erro);
      if (txtCsv) txtCsv.textContent = 'Erro ao Sincronizar';
    });
}

/* ============ SELECIONAR PRODUTO ============ */
function carregarProdutoNaTela(prod) {
  outProduto.textContent = prod.nome;
  outDescricao.textContent = "Cód: " + prod.codigoOriginal;
  
  precoAtual = parsePreco(prod.preco);
  
  calcular();
  salvarDadosTela();
}

/* ============ BIPAGEM VIA CÓDIGO DE BARRAS (ENTER) ============ */
if (inCodigo) {
  inCodigo.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      let codigoBipado = normalizarCodigo(inCodigo.value);
      
      if (baseProdutos[codigoBipado]) {
        carregarProdutoNaTela(baseProdutos[codigoBipado]);
        inCodigo.value = '';
        inCodigo.focus();
      } else {
        alert('Código não encontrado na base de dados!');
        inCodigo.select();
      }
    }
  });
}

/* ============ PESQUISA POR NOME INTELIGENTE ============ */
if (inBusca && listaSugestoes) {
  inBusca.addEventListener('input', function() {
    let termoBruto = inBusca.value.trim();
    listaSugestoes.innerHTML = '';

    if (termoBruto.length < 1) {
      listaSugestoes.style.display = 'none';
      return;
    }

    let termosBusca = normalizarTexto(termoBruto).split(/\s+/).filter(t => t.length > 0);

    if (termosBusca.length === 0) {
      listaSugestoes.style.display = 'none';
      return;
    }

    let resultados = listaProdutosArray.filter(p => {
      let nomeTratado = normalizarTexto(p.nome);
      return termosBusca.every(termo => nomeTratado.includes(termo));
    }).slice(0, 30);

    if (resultados.length === 0) {
      listaSugestoes.style.display = 'none';
      return;
    }

resultados.forEach(prod => {
  let div = document.createElement('div');
  div.className = 'sugestao-item';
  
  let pNum = parsePreco(prod.preco);
  let precoTexto = (!isNaN(pNum) && pNum > 0) ? brl.format(pNum) : '0,00';

  div.innerHTML = `<strong>${prod.nome}</strong><span class="sug-codigo">Cód: ${prod.codigoOriginal} | ${precoTexto}</span>`;
  
  div.addEventListener('click', function() {
    carregarProdutoNaTela(prod);
    inBusca.value = '';
    listaSugestoes.style.display = 'none';
    if (inCodigo) inCodigo.focus();
  });

  listaSugestoes.appendChild(div);
});

    listaSugestoes.style.display = 'block';
  });

  document.addEventListener('click', function(e) {
    if (!inBusca.contains(e.target) && !listaSugestoes.contains(e.target)) {
      listaSugestoes.style.display = 'none';
    }
  });
}

/* ============ LOCALSTORAGE ============ */
function salvarDadosTela() {
  localStorage.setItem('amipet_out_produto', outProduto.textContent);
  localStorage.setItem('amipet_out_descricao', outDescricao.textContent);
  localStorage.setItem('amipet_preco_atual', precoAtual);

  document.querySelectorAll('.edit').forEach(el => {
    const key = el.getAttribute('data-key');
    if (key) {
      localStorage.setItem('amipet_text_' + key, el.innerHTML);
    }
  });
}

function carregarDados() {
  // Garante a renovação dos seletores visuais
  localStorage.removeItem('amipet_text_rot-melhor');
  localStorage.removeItem('amipet_text_txt-selo');

  if (localStorage.getItem('amipet_out_produto')) {
    outProduto.textContent = localStorage.getItem('amipet_out_produto');
  }
  if (localStorage.getItem('amipet_out_descricao')) {
    outDescricao.textContent = localStorage.getItem('amipet_out_descricao');
  }
  if (localStorage.getItem('amipet_preco_atual')) {
    precoAtual = parseFloat(localStorage.getItem('amipet_preco_atual')) || 0;
  }

  document.querySelectorAll('.edit').forEach(el => {
    const key = el.getAttribute('data-key');
    if (key && localStorage.getItem('amipet_text_' + key)) {
      el.innerHTML = localStorage.getItem('amipet_text_' + key);
    }
  });
}

/* ============ CÁLCULO PRINCIPAL ============ */
function calcular() {
  const preco = precoAtual;
  const valido = !isNaN(preco) && preco > 0;

  if (valido) {
    const descontoMaximo = (preco * 20) / 100;
    const finalMaximo = preco - descontoMaximo;
    
    if (outPrecoOferta) outPrecoOferta.textContent = brl.format(finalMaximo);
    if (outPrecoOriginal) outPrecoOriginal.textContent = 'Preço original: ' + brl.format(preco);
  } else {
    if (outPrecoOferta) outPrecoOferta.textContent = 'R$ 0,00';
    if (outPrecoOriginal) outPrecoOriginal.textContent = 'Preço original: R$ —';
  }

  FAIXAS.forEach(function (f) {
    const elDesc = document.getElementById('desc-' + f.pct);
    const elFinal = document.getElementById('final-' + f.pct);
    const elTag = document.getElementById('tag-' + f.pct);

    if (elFinal) elFinal.classList.remove('aplicavel');

    if (!valido) {
      if (elDesc) elDesc.textContent = 'Desconto: —';
      if (elFinal) elFinal.textContent = 'Valor final do produto: —';
      if (elTag) {
        elTag.textContent = '';
        elTag.className = 'tag';
      }
      return;
    }

    const desconto = (preco * f.pct) / 100;
    const final = preco - desconto;

    if (elDesc) elDesc.textContent = 'Desconto: ' + brl.format(desconto);
    if (elFinal) elFinal.textContent = 'Valor final do produto: ' + brl.format(final);

    const alcancou = preco >= f.min;

    if (alcancou) {
      if (elTag) {
        elTag.textContent = (f.pct === 10) ? 'Válido para qualquer compra' : 'Este item já se aplica';
        elTag.className = 'tag positivo';
      }
      if (elFinal) elFinal.classList.add('aplicavel');
    } else {
      const falta = f.min - preco;
      if (elTag) {
        elTag.textContent = 'Faltam ' + brl.format(falta) + ' para esta faixa';
        elTag.className = 'tag alerta';
      }
    }
  });

  if (valido) {
    const descontoMaximo = (preco * 20) / 100;
    const finalMaximo = preco - descontoMaximo;
    if (outDestaque) outDestaque.textContent = brl.format(finalMaximo);
    if (outMelhor) outMelhor.textContent = 'Com 20% de desconto: ' + brl.format(finalMaximo);
  } else {
    if (outDestaque) outDestaque.textContent = '—';
    if (outMelhor) outMelhor.textContent = 'Informe o preço para calcular';
  }

  salvarDadosTela();
}

document.querySelectorAll('.edit').forEach(el => {
  el.addEventListener('input', salvarDadosTela);
});

/* ============ BOTÃO APAGAR INFORMAÇÕES ============ */
const btnReset = document.getElementById('btn-reset');
if (btnReset) {
  btnReset.addEventListener('click', function () {
    if (confirm('Deseja limpar o produto atual da tela?')) {
      localStorage.removeItem('amipet_out_produto');
      localStorage.removeItem('amipet_out_descricao');
      localStorage.removeItem('amipet_preco_atual');
      
      outProduto.textContent = "Informe o nome do produto";
      outDescricao.textContent = "Informe o código do produto";
      precoAtual = 0;
      calcular();
      
      if (inCodigo) {
        inCodigo.value = '';
        inCodigo.focus();
      }
    }
  });
}

/* ============ IMPRESSÃO ============ */
const btnImprimir = document.getElementById('btn-imprimir');
if (btnImprimir) {
  btnImprimir.addEventListener('click', function () {
    window.print();
  });
}

/* ============ GERAR QR CODE DO LINKTREE ============ */
function gerarQRCode() {
  const containerQr = document.getElementById('qrcode');
  if (containerQr && typeof QRCode !== 'undefined') {
    containerQr.innerHTML = "";
    new QRCode(containerQr, {
      text: "https://linktr.ee/amipetgrupo",
      width: 60,
      height: 60,
      colorDark: "#1E2A2E",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }
}

/* ============ INICIALIZAÇÃO ============ */
document.addEventListener('DOMContentLoaded', function () {
  carregarDados();
  calcular();
  gerarQRCode();
  carregarBaseNuvem(); // Sincroniza com a nuvem automaticamente
  if (inCodigo) {
    inCodigo.focus();
  }
});