/* ============ CONFIGURAÇÃO DAS FAIXAS ============ */
const FAIXAS = [
  { pct: 10, min: 0, cond: 'Em qualquer compra (sem mínimo)' },
  { pct: 15, min: 300, cond: 'Em compras acima de R$ 300' },
  { pct: 20, min: 1000, cond: 'Em compras acima de R$ 1.000' }
];

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const inCodigo = document.getElementById('in-codigo');
const outProduto = document.getElementById('out-produto');
const outDescricao = document.getElementById('out-descricao');
const outPreco = document.getElementById('out-preco');
const outMelhor = document.getElementById('out-melhor');
const outDestaque = document.getElementById('out-destaque');

/* Variável de memória do Preço (como removemos o input da barra) */
let precoAtual = 0;

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

/* ============ BANCO DE DADOS LOCAL VIA CSV ============ */
let baseProdutos = {};

const inputFileCsv = document.getElementById('in-csv');
const lblCsv = document.getElementById('lbl-csv');
const txtCsv = document.getElementById('txt-csv');

if (inputFileCsv) {
  inputFileCsv.addEventListener('change', function(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = function(evento) {
      const conteudo = evento.target.result;
      const linhas = conteudo.split(/\r\n|\n/);
      
      baseProdutos = {};
      
      if (linhas.length === 0) return;
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
          let codigo = colunas[idxCodigo].trim().replace(/"/g, '');
          let descricao = colunas[idxDescricao].trim().replace(/"/g, '');
          let venda = colunas[idxVenda].trim().replace(/"/g, '').replace(',', '.');
          
          if (codigo) {
            baseProdutos[codigo] = {
              nome: descricao,
              preco: venda
            };
            totalCarregado++;
          }
        }
      }

      // Atualiza visualmente o botão de upload de CSV
      lblCsv.classList.add('carregado');
      txtCsv.textContent = `CSV Pronto (${totalCarregado} itens)`;

      if (inCodigo) inCodigo.focus();
    };

    leitor.readAsText(arquivo, 'ISO-8859-1');
  });
}

/* ============ EVENTO DE BIPAGEM / DIGITAÇÃO ============ */
if (inCodigo) {
  inCodigo.addEventListener('input', function() {
    let codigoBipado = inCodigo.value.trim();
    
    if (baseProdutos[codigoBipado]) {
      let prod = baseProdutos[codigoBipado];
      
      // Atualiza visualmente na folha A4
      outProduto.textContent = prod.nome;
      outDescricao.textContent = "Cód: " + codigoBipado;
      
      precoAtual = parsePreco(prod.preco);
      
      calcular();
      salvarDados();
      
      // Limpa o input do leitor de imediato para o próximo bip
      setTimeout(() => {
        inCodigo.value = '';
        inCodigo.focus();
      }, 50);
    }
  });
}

/* ============ LOCALSTORAGE (PERSISTÊNCIA) ============ */
function salvarDados() {
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

  salvarDados();
}

/* ============ EVENTO EDICAO DIRETA ============ */
document.querySelectorAll('.edit').forEach(el => {
  el.addEventListener('input', salvarDados);
});

/* ============ BOTÃO RESETAR / LIMPAR TUDO ============ */
const btnReset = document.getElementById('btn-reset');
if (btnReset) {
  btnReset.addEventListener('click', function () {
    if (confirm('Deseja realmente limpar todas as informações e restaurar os padrões?')) {
      localStorage.clear();
      location.reload();
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