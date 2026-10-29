/* ============ CONFIGURAÇÃO DAS FAIXAS ============ */
const FAIXAS = [
  { pct: 10, min: 0, cond: 'Em qualquer compra (sem mínimo)' },
  { pct: 15, min: 300, cond: 'Em compras acima de R$ 300' },
  { pct: 20, min: 1000, cond: 'Em compras acima de R$ 1.000' }
];

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const inProduto = document.getElementById('in-produto');
const inDescricao = document.getElementById('in-descricao');
const inPreco = document.getElementById('in-preco');
const outProduto = document.getElementById('out-produto');
const outDescricao = document.getElementById('out-descricao');
const outPreco = document.getElementById('out-preco');
const outMelhor = document.getElementById('out-melhor');
const outDestaque = document.getElementById('out-destaque');

/* Textos padrões iniciais para limpar ao clicar */
const DEFAULT_PRODUTO = "Informe o nome do produto";
const DEFAULT_DESCRICAO = "Informe o código do produto";

inProduto.addEventListener('focus', function() {
  if (inProduto.value === DEFAULT_PRODUTO) {
    inProduto.value = '';
  }
});

inProduto.addEventListener('blur', function() {
  if (inProduto.value.trim() === '') {
    inProduto.value = DEFAULT_PRODUTO;
    outProduto.textContent = DEFAULT_PRODUTO;
    salvarDados();
  }
});

inDescricao.addEventListener('focus', function() {
  if (inDescricao.value === DEFAULT_DESCRICAO) {
    inDescricao.value = '';
  }
});

inDescricao.addEventListener('blur', function() {
  if (inDescricao.value.trim() === '') {
    inDescricao.value = DEFAULT_DESCRICAO;
    outDescricao.textContent = DEFAULT_DESCRICAO;
    salvarDados();
  }
});

const DEFAULT_PRECO = "0,00";

inPreco.addEventListener('focus', function() {
  if (inPreco.value === DEFAULT_PRECO || inPreco.value === "0,00") {
    inPreco.value = '';
  }
});

inPreco.addEventListener('blur', function() {
  if (inPreco.value.trim() === '') {
    inPreco.value = DEFAULT_PRECO;
    calcular();
  }
});

/* Converte "1.234,56" em número */
function parsePreco(valor) {
  if (!valor) return NaN;
  let s = String(valor).replace(/[^\d,.-]/g, '');
  if (s.indexOf(',') > -1) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(s);
  return (isNaN(n) || n <= 0) ? NaN : n;
}

/* ============ LOCALSTORAGE (PERSISTÊNCIA) ============ */
function salvarDados() {
  localStorage.setItem('amipet_produto', inProduto.value);
  localStorage.setItem('amipet_descricao', inDescricao.value);
  localStorage.setItem('amipet_preco', inPreco.value);

  document.querySelectorAll('.edit').forEach(el => {
    const key = el.getAttribute('data-key');
    if (key) {
      localStorage.setItem('amipet_text_' + key, el.innerHTML);
    }
  });

  const logoImg = document.getElementById('logo-img');
  if (logoImg.src && logoImg.src.startsWith('data:image')) {
    localStorage.setItem('amipet_logo', logoImg.src);
  }
}

function carregarDados() {
  if (localStorage.getItem('amipet_produto')) {
    inProduto.value = localStorage.getItem('amipet_produto');
    outProduto.textContent = inProduto.value;
  }
  if (localStorage.getItem('amipet_descricao')) {
    inDescricao.value = localStorage.getItem('amipet_descricao');
    outDescricao.textContent = inDescricao.value;
  }
  if (localStorage.getItem('amipet_preco')) {
    inPreco.value = localStorage.getItem('amipet_preco');
  }

  document.querySelectorAll('.edit').forEach(el => {
    const key = el.getAttribute('data-key');
    if (key && localStorage.getItem('amipet_text_' + key)) {
      el.innerHTML = localStorage.getItem('amipet_text_' + key);
    }
  });

  const salvouLogo = localStorage.getItem('amipet_logo');
  if (salvouLogo) {
    document.getElementById('logo-img').src = salvouLogo;
  }
}

/* ============ CÁLCULO PRINCIPAL ============ */
function calcular() {
  const preco = parsePreco(inPreco.value);
  const valido = !isNaN(preco);

  outPreco.textContent = valido ? brl.format(preco) : 'R$ —';

  let melhorPct = null;
  let melhorFinal = null;

  FAIXAS.forEach(function (f) {
    const elDesc = document.getElementById('desc-' + f.pct);
    const elFinal = document.getElementById('final-' + f.pct);
    const elTag = document.getElementById('tag-' + f.pct);

    elFinal.classList.remove('aplicavel');

    if (!valido) {
      elDesc.textContent = 'Desconto: —';
      elFinal.textContent = 'Valor final do produto: —';
      elTag.textContent = '';
      elTag.className = 'tag';
      return;
    }

    const desconto = (preco * f.pct) / 100;
    const final = preco - desconto;

    elDesc.textContent = 'Desconto: ' + brl.format(desconto);
    elFinal.textContent = 'Valor final do produto: ' + brl.format(final);

    const alcancou = preco >= f.min;

    if (alcancou) {
      elTag.textContent = (f.pct === 10) ? 'Válido para qualquer compra' : 'Este item já se aplica';
      elTag.className = 'tag positivo';
      melhorPct = f.pct;
      melhorFinal = final;
      elFinal.classList.add('aplicavel');
    } else {
      const falta = f.min - preco;
      elTag.textContent = 'Faltam ' + brl.format(falta) + ' para esta faixa';
      elTag.className = 'tag alerta';
    }
  });

 // Sempre calcula o preço com 20% de desconto para o destaque superior
  if (valido) {
    const descontoMaximo = (preco * 20) / 100;
    const finalMaximo = preco - descontoMaximo;
    outDestaque.textContent = brl.format(finalMaximo);
    outMelhor.textContent = 'Com 20% de desconto: ' + brl.format(finalMaximo);
  } else {
    outDestaque.textContent = '—';
    outMelhor.textContent = 'Informe o preço para calcular';
  }

  salvarDados();
}

/* ============ EVENTOS DE INPUT ============ */
inProduto.addEventListener('input', function () {
  outProduto.textContent = inProduto.value;
  salvarDados();
});

inDescricao.addEventListener('input', function () {
  outDescricao.textContent = inDescricao.value;
  salvarDados();
});

inPreco.addEventListener('input', calcular);

document.querySelectorAll('.edit').forEach(el => {
  el.addEventListener('input', salvarDados);
});

/* ============ BOTÃO RESETAR / LIMPAR TUDO ============ */
document.getElementById('btn-reset').addEventListener('click', function () {
  if (confirm('Deseja realmente limpar todas as informações e restaurar os padrões?')) {
    localStorage.clear();
    location.reload();
  }
});

/* ============ IMPRESSÃO ============ */
document.getElementById('btn-imprimir').addEventListener('click', function () {
  window.print();
});

/* ============ INICIALIZAÇÃO ============ */
document.addEventListener('DOMContentLoaded', function () {
  carregarDados();
  calcular();
});

/* ============ GERAR QR CODE DO LINKTREE ============ */
document.addEventListener('DOMContentLoaded', function () {
  // Limpa caso já exista e gera um novo QR Code
  const containerQr = document.getElementById('qrcode');
  if (containerQr) {
    containerQr.innerHTML = "";
    new QRCode(containerQr, {
      text: "https://linktr.ee/amipetgrupo",
      width: 75,  // Tamanho ideal para o rodapé A4 paisagem
      height: 75,
      colorDark: "#1E2A2E",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }
});