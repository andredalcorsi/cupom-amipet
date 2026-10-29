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
const outPreco = document.getElementById('out-preco');
const outMelhor = document.getElementById('out-melhor');
const outDestaque = document.getElementById('out-destaque');

let precoAtual = 0;
let baseProdutos = {}; // Dicionário por código normalizado
let listaProdutosArray = []; // Array para busca por nome

/* Normalização avançada: remove acentos, cedilhas, caracteres especiais e converte para minúsculas */
function normalizarTexto(str) {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");    // Remove símbolos especiais (mantém apenas letras, números e espaços)
}

/* Normalização de código de barras: remove zeros à esquerda e traços */
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

/* ============ BANCO DE DADOS LOCAL VIA CSV ============ */
const inputFileCsv = document.getElementById('in-csv');
const lblCsv = document.getElementById('lbl-csv');
const txtCsv = document.getElementById('txt-csv');
const btnSubstituir = document.getElementById('btn-substituir');

function processarConteudoCsv(conteudo) {
  const linhas = conteudo.split(/\r\n|\n/);
  baseProdutos = {};
  listaProdutosArray = [];
  
  if (linhas.length === 0) return 0;
  let cabecalho = linhas[0].split(';');
  
  let idxCodigo = cabecalho.indexOf('"Código Barra Principal"');
  if (idxCodigo === -1) idxCodigo = cabecalho.indexOf('Código Barra Principal');
  if (idxCodigo === -1) idxCodigo = 1;

  let idxDescricao = cabecalho.indexOf('"Descrição"');
  if (idxDescricao === -1) idxDescricao = cabecalho.indexOf('Descrição');
  if (idxDescricao === -1) idxDescricao = 3;

  let idxVenda = cabecalho.indexOf('"Venda"');
  if (idxVenda === -1) idxVenda = cabecalho.indexOf('Venda');
  if (idxVenda === -1) idxVenda = 51;

  let totalCarregado = 0;

  for (let i = 1; i < linhas.length; i++) {
    let linha = linhas[i].trim();
    if (!linha) continue;
    
    let colunas = linha.split(';');
    if (colunas.length > Math.max(idxCodigo, idxDescricao, idxVenda)) {
      let codigoBruto = colunas[idxCodigo].trim().replace(/"/g, '');
      let descricao = colunas[idxDescricao].trim().replace(/"/g, '');
      let venda = colunas[idxVenda].trim().replace(/"/g, '').replace(',', '.');
      
      let codigoNormalizado = normalizarCodigo(codigoBruto);
      
      if (codigoNormalizado && descricao) {
        let item = {
          codigoOriginal: codigoBruto,
          codigoNorm: codigoNormalizado,
          nome: descricao,
          nomeNorm: normalizarTexto(descricao), // Versão limpa para busca instantânea
          preco: venda
        };
        baseProdutos[codigoNormalizado] = item;
        listaProdutosArray.push(item);
        totalCarregado++;
      }
    }
  }
  return totalCarregado;
}

if (inputFileCsv) {
  inputFileCsv.addEventListener('change', function(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = function(evento) {
      const conteudo = evento.target.result;
      const total = processarConteudoCsv(conteudo);

      if (lblCsv && txtCsv) {
        lblCsv.classList.add('carregado');
        txtCsv.textContent = `✓ CSV Ativo (${total} itens)`;
      }

      if (btnSubstituir) {
        btnSubstituir.style.display = 'inline-block';
      }

      if (inCodigo) inCodigo.focus();
    };

    leitor.readAsText(arquivo, 'ISO-8859-1');
  });
}

if (btnSubstituir) {
  btnSubstituir.addEventListener('click', function() {
    baseProdutos = {};
    listaProdutosArray = [];
    if (lblCsv && txtCsv) {
      lblCsv.classList.remove('carregado');
      txtCsv.textContent = 'Carregar CSV';
    }
    btnSubstituir.style.display = 'none';
    if (inputFileCsv) inputFileCsv.value = '';
    
    alert('Base CSV removida. Pode selecionar um novo ficheiro.');
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

/* ============ PESQUISA POR NOME INTELIGENTE E SEM RESTRIÇÕES ============ */
function normalizarTexto(str) {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase(); // Mantém espaços, números, letras e símbolos para não quebrar buscas parciais
}

if (inBusca && listaSugestoes) {
  inBusca.addEventListener('input', function() {
    let termoBruto = inBusca.value.trim();
    listaSugestoes.innerHTML = '';

    // Basta 1 único caractere para já começar a listar os produtos
    if (termoBruto.length < 1) {
      listaSugestoes.style.display = 'none';
      return;
    }

    // Normaliza o termo digitado
    let termosBusca = normalizarTexto(termoBruto).split(/\s+/).filter(t => t.length > 0);

    if (termosBusca.length === 0) {
      listaSugestoes.style.display = 'none';
      return;
    }

    // Busca produtos onde CADA pedaço digitado esteja presente no nome
    let resultados = listaProdutosArray.filter(p => {
      let nomeTratado = normalizarTexto(p.nome);
      return termosBusca.every(termo => nomeTratado.includes(termo));
    }).slice(0, 30); // Aumentado para exibir até 30 resultados de uma vez

    if (resultados.length === 0) {
      listaSugestoes.style.display = 'none';
      return;
    }

    resultados.forEach(prod => {
      let div = document.createElement('div');
      div.className = 'sugestao-item';
      div.innerHTML = `<strong>${prod.nome}</strong><span class="sug-codigo">Cód: ${prod.codigoOriginal} | R$ ${prod.preco}</span>`;
      
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

  // Fecha o menu ao clicar fora
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

  outPreco.textContent = valido ? brl.format(preco) : 'R$ 0,00';

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
    if (confirm('Deseja limpar o produto atual da tela? (A sua base CSV continuará ativa na memória).')) {
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
  if (inCodigo) {
    inCodigo.focus();
  }
});