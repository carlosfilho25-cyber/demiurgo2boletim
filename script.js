// =========================================
// DADOS FICTÍCIOS PADRONIZADOS - 9º ANO
// =========================================
// Array de objetos: cada objeto é uma disciplina.
const dadosDisciplinas = [
  { disciplina: "Língua Portuguesa", tri1: 78, tri2: "8,2", tri3: 8.6, faltas: [2, 2, 1] },
  { disciplina: "Matemática", tri1: 55, tri2: "5,4", tri3: null, faltas: [3, 2, 2] },
  { disciplina: "Ciências", tri1: 84, tri2: 7.9, tri3: "8,3", faltas: [1, 1, 1] },
  { disciplina: "História", tri1: "7,1", tri2: 82, tri3: null, faltas: [1, 2, 1] },
  { disciplina: "Geografia", tri1: 69, tri2: "7,5", tri3: 7.8, faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa", tri1: 88, tri2: 8.4, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Arte", tri1: "9,2", tri2: 87, tri3: 9.0, faltas: [1, 1, 0] },
  { disciplina: "Educação Física", tri1: 96, tri2: "9,3", tri3: null, faltas: [0, 1, 0] },
  { disciplina: "Educação Digital", tri1: 91, tri2: 8.9, tri3: "9,4", faltas: [1, 1, 0] },
  { disciplina: "Educação Financeira", tri1: 76, tri2: "7,2", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Rec. Aprend. Matemática", tri1: 58, tri2: "5,9", tri3: 6.2, faltas: [2, 2, 1] },
  { disciplina: "Leitura Rec. Aprend. Lingua Portuguesa", tri1: 72, tri2: "7,6", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico", tri1: 49, tri2: 5.5, tri3: "5,8", faltas: [2, 2, 2] },
  { disciplina: "Literatura Arte e Movimento", tri1: "8,0", tri2: 84, tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Práticas Experimentais", tri1: 64, tri2: "6,6", tri3: 7.0, faltas: [1, 1, 1] }
];

// =========================================
// FUNÇÃO: normalizarNota(valor)
// =========================================
// Converte qualquer formato de nota para a escala 0-10.
function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null; // nota ainda não lançada
  }

  // Troca vírgula por ponto e converte para número
  let numero = parseFloat(String(valor).replace(",", "."));

  if (isNaN(numero)) return null; // inválido

  if (numero >= 0 && numero <= 10) return numero; // já está na escala
  if (numero > 10 && numero <= 100) return numero / 10; // 82 vira 8.2

  return null; // fora das regras
}

// =========================================
// FUNÇÃO: calcularMedia(notas)
// =========================================
// Calcula a média usando somente as notas disponíveis.
function calcularMedia(notas) {
  const validas = notas.filter(n => n !== null); // remove as ausentes
  if (validas.length === 0) return null;

  let soma = 0;
  validas.forEach(n => soma += n);
  return soma / validas.length;
}

// =========================================
// FUNÇÃO: definirSituacao(media)
// =========================================
function definirSituacao(media) {
  if (media === null) return "Nota ainda não disponível";
  if (media >= 6.0) return "Bom desempenho";
  return "Atenção";
}

// =========================================
// FUNÇÃO: formatarNota(nota)
// =========================================
// Mostra com uma casa decimal e vírgula (ex: 7.5 -> "7,5")
function formatarNota(nota) {
  if (nota === null) return "—";
  return nota.toFixed(1).replace(".", ",");
}

// =========================================
// FUNÇÃO: somarFaltas(faltas)
// =========================================
function somarFaltas(faltas) {
  let total = 0;
  faltas.forEach(f => total += f);
  return total;
}

// =========================================
// FUNÇÃO: obterClasseSituacao(situacao)
// =========================================
function obterClasseSituacao(situacao) {
  if (situacao === "Bom desempenho") return "situacao-bom";
  if (situacao === "Atenção") return "situacao-atencao";
  return "situacao-sem-nota";
}

// =========================================
// PREENCHIMENTO DA TABELA E DOS CARDS
// =========================================
const corpoTabela = document.getElementById("corpo-tabela");

let somaMedias = 0;
let quantidadeMedias = 0;
let totalFaltas = 0;
let contBom = 0;
let contAtencao = 0;

dadosDisciplinas.forEach(item => {
  // 1. Normaliza as três notas
  const n1 = normalizarNota(item.tri1);
  const n2 = normalizarNota(item.tri2);
  const n3 = normalizarNota(item.tri3);

  // 2. Calcula média só com as disponíveis
  const media = calcularMedia([n1, n2, n3]);

  // 3. Soma faltas
  const faltasTotal = somarFaltas(item.faltas);

  // 4. Define situação
  const situacao = definirSituacao(media);

  // 5. Atualiza contadores
  if (media !== null) {
    somaMedias += media;
    quantidadeMedias++;
  }
  totalFaltas += faltasTotal;
  if (situacao === "Bom desempenho") contBom++;
  if (situacao === "Atenção") contAtencao++;

  // 6. Cria a linha na tabela
  const linha = document.createElement("tr");
  linha.innerHTML = `
    <td>${item.disciplina}</td>
    <td class="${n1 === null ? 'nota-ausente' : ''}">${formatarNota(n1)}</td>
    <td class="${n2 === null ? 'nota-ausente' : ''}">${formatarNota(n2)}</td>
    <td class="${n3 === null ? 'nota-ausente' : ''}">${formatarNota(n3)}</td>
    <td><strong>${formatarNota(media)}</strong></td>
    <td>${faltasTotal}</td>
    <td class="${obterClasseSituacao(situacao)}">${situacao}</td>
  `;
  corpoTabela.appendChild(linha);
});

// =========================================
// CARDS DE RESUMO
// =========================================

// Média geral
const mediaGeral = quantidadeMedias > 0 ? somaMedias / quantidadeMedias : null;
document.getElementById("card-media-geral").textContent = formatarNota(mediaGeral);

// Total de faltas
document.getElementById("card-total-faltas").textContent = totalFaltas;

// Disciplinas com bom desempenho
document.getElementById("card-bom-desempenho").textContent = contBom;

// Disciplinas com atenção
document.getElementById("card-atencao").textContent = contAtencao;

// Frequência
// IMPORTANTE: valor APENAS DEMONSTRATIVO. Não é calculado a partir das faltas.
// No futuro, será tratado de outra forma.
document.getElementById("card-frequencia").textContent = "92%";