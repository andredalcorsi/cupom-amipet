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
  // Salva inputs da barra
  localStorage.setItem('amipet_produto', inProduto.value);
  localStorage.setItem('amipet_descricao', inDescricao.value);
  localStorage.setItem('amipet_preco', inPreco.value);

  // Salva textos editáveis da página (usando o data-key)
  document.querySelectorAll('.edit').forEach(el => {
    const key = el.getAttribute('data-key');
    if (key) {
      localStorage.setItem('amipet_text_' + key, el.innerHTML);
    }
  });

  // Salva imagem da logo se houver carregamento customizado
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

  // Carrega textos editáveis salvos
  document.querySelectorAll('.edit').forEach(el => {
    const key = el.getAttribute('data-key');
    if (key && localStorage.getItem('amipet_text_' + key)) {
      el.innerHTML = localStorage.getItem('amipet_text_' + key);
    }
  });

  // Carrega logo customizada salva
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
      elFinal.textContent = 'Final: —';
      elTag.textContent = '';
      elTag.className = 'tag';
      return;
    }

    const desconto = (preco * f.pct) / 100;
    const final = preco - desconto;

    elDesc.textContent = 'Desconto: ' + brl.format(desconto);
    elFinal.textContent = 'Final: ' + brl.format(final);

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

  if (valido && melhorPct !== null) {
    outMelhor.textContent = 'Com ' + melhorPct + '% de desconto: ' + brl.format(melhorFinal);
    outDestaque.textContent = brl.format(melhorFinal);
  } else {
    outMelhor.textContent = 'Informe o preço para calcular';
    outDestaque.textContent = '—';
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

// Salva sempre que o usuário altera algum texto editável na tela
document.querySelectorAll('.edit').forEach(el => {
  el.addEventListener('input', salvarDados);
});

/* ============ LOGO ============ */
const logoImg = document.getElementById('logo-img');
const inLogo = document.getElementById('in-logo');

document.getElementById('btn-logo').addEventListener('click', function () {
  inLogo.click();
});

inLogo.addEventListener('change', function () {
  const arquivo = inLogo.files && inLogo.files[0];
  if (!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = function (e) {
    logoImg.src = e.target.result;
    salvarDados();
  };
  leitor.readAsDataURL(arquivo);
});

document.getElementById('btn-limpar-logo').addEventListener('click', function () {
  logoImg.src = "LOGOS-ASSINATURAS-VARIADOS/Principal (2).png";
  localStorage.removeItem('amipet_logo');
  inLogo.value = '';
});

/* ============ BOTÃO RESETAR / LIMPAR TUDO ============ */
document.getElementById('btn-reset').addEventListener('click', function () {
  if (confirm('Deseja realmente limpar todas as alterações e restaurar os padrões?')) {
    localStorage.clear();
    location.reload();
  }
});

/* ============ EDIÇÃO DOS TEXTOS FIXOS ============ */
const btnEditar = document.getElementById('btn-editar');
let editando = false;

btnEditar.addEventListener('click', function () {
  editando = !editando;
  document.querySelectorAll('.edit').forEach(function (el) {
    if (editando) {
      el.setAttribute('contenteditable', 'true');
    } else {
      el.removeAttribute('contenteditable');
      salvarDados();
    }
  });
  btnEditar.textContent = editando ? 'Desativar edição' : 'Ativar edição';
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