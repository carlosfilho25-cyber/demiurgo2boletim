// =========================================
// CONFIGURAÇÃO FIXA DO ALUNO
// =========================================
const CONFIG_ALUNO = {
    turma: "9B",
    numeroChamada: 8,
    apiUrl: "https://boletim-api.profbt.com.br"
};

// =========================================
// DADOS FICTÍCIOS PADRONIZADOS - 9º ANO
// =========================================
const dadosLocais = [
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
// ESTADO GLOBAL
// =========================================
let pinSessao = null;          
let dadosAtuais = [];          
let modoEdicao = false;

// Variáveis dos Gráficos
let graficoMedias = null;
let graficoEvolucao = null;
let graficoFaltas = null;

// =========================================
// FUNÇÕES DE NORMALIZAÇÃO E VALIDAÇÃO
// =========================================
function normalizarNota(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    let numero = parseFloat(String(valor).replace(",", "."));
    if (isNaN(numero)) return null;
    if (numero >= 0 && numero <= 10) return numero;
    if (numero > 10 && numero <= 100) return numero / 10;
    return null;
}

function normalizarNotaEdicao(texto) {
    const limpo = texto.trim();
    if (limpo === "") return { ok: true, valor: null };
    const numero = parseFloat(limpo.replace(",", "."));
    if (isNaN(numero)) return { ok: false };
    if (numero < 0 || numero > 10) return { ok: false };
    return { ok: true, valor: numero };
}

function validarFaltaEdicao(texto) {
    const limpo = texto.trim();
    if (limpo === "") return { ok: false };
    if (!/^\d+$/.test(limpo)) return { ok: false };
    return { ok: true, valor: parseInt(limpo, 10) };
}

// =========================================
// FUNÇÕES DE CÁLCULO
// =========================================
function calcularMedia(notas) {
    const validas = notas.filter(n => n !== null);
    if (validas.length === 0) return null;
    let soma = 0;
    validas.forEach(n => soma += n);
    return soma / validas.length;
}

function definirSituacao(media) {
    if (media === null) return "Nota ainda não disponível";
    if (media >= 6.0) return "Bom desempenho";
    return "Atenção";
}

function formatarNota(nota) {
    if (nota === null || nota === undefined) return "—";
    return Number(nota).toFixed(1).replace(".", ",");
}

function somarFaltas(faltas) {
    let total = 0;
    faltas.forEach(f => total += f);
    return total;
}

function obterClasseSituacao(situacao) {
    if (situacao === "Bom desempenho") return "situacao-bom";
    if (situacao === "Atenção") return "situacao-atencao";
    return "situacao-sem-nota";
}

// =========================================
// RENDERIZAÇÃO DA TABELA E CARDS
// =========================================
function renderizarTudo() {
    const corpoTabela = document.getElementById("corpo-tabela");
    corpoTabela.innerHTML = ""; 

    let somaMedias = 0;
    let quantidadeMedias = 0;
    let totalFaltas = 0;
    let contBom = 0;
    let contAtencao = 0;

    dadosAtuais.forEach((item, index) => {
        const n1 = normalizarNota(item.tri1);
        const n2 = normalizarNota(item.tri2);
        const n3 = normalizarNota(item.tri3);
        const media = calcularMedia([n1, n2, n3]);
        const faltasTotal = somarFaltas(item.faltas);
        const situacao = definirSituacao(media);

        if (media !== null) { somaMedias += media; quantidadeMedias++; }
        totalFaltas += faltasTotal;
        if (situacao === "Bom desempenho") contBom++;
        if (situacao === "Atenção") contAtencao++;

        const linha = document.createElement("tr");

        if (modoEdicao) {
            linha.innerHTML = `
                <td class="nome-disciplina"></td>
                <td><input type="text" class="input-nota" data-index="${index}" data-tri="tri1" value="${n1 !== null ? n1 : ''}"></td>
                <td><input type="text" class="input-nota" data-index="${index}" data-tri="tri2" value="${n2 !== null ? n2 : ''}"></td>
                <td><input type="text" class="input-nota" data-index="${index}" data-tri="tri3" value="${n3 !== null ? n3 : ''}"></td>
                <td><strong>${formatarNota(media)}</strong></td>
                <td>
                    <input type="text" class="input-falta" data-index="${index}" data-tri="0" value="${item.faltas[0]}">
                    <input type="text" class="input-falta" data-index="${index}" data-tri="1" value="${item.faltas[1]}">
                    <input type="text" class="input-falta" data-index="${index}" data-tri="2" value="${item.faltas[2]}">
                </td>
                <td class="${obterClasseSituacao(situacao)}">${situacao}</td>
            `;
            linha.querySelector(".nome-disciplina").textContent = item.disciplina;
        } else {
            linha.innerHTML = `
                <td class="nome-disciplina"></td>
                <td class="${n1 === null ? 'nota-ausente' : ''}">${formatarNota(n1)}</td>
                <td class="${n2 === null ? 'nota-ausente' : ''}">${formatarNota(n2)}</td>
                <td class="${n3 === null ? 'nota-ausente' : ''}">${formatarNota(n3)}</td>
                <td><strong>${formatarNota(media)}</strong></td>
                <td>${faltasTotal}</td>
                <td class="${obterClasseSituacao(situacao)}">${situacao}</td>
            `;
            linha.querySelector(".nome-disciplina").textContent = item.disciplina;
        }

        corpoTabela.appendChild(linha);
    });

    const mediaGeral = quantidadeMedias > 0 ? somaMedias / quantidadeMedias : null;
    document.getElementById("card-media-geral").textContent = formatarNota(mediaGeral);
    document.getElementById("card-total-faltas").textContent = totalFaltas;
    document.getElementById("card-bom-desempenho").textContent = contBom;
    document.getElementById("card-atencao").textContent = contAtencao;
    document.getElementById("card-frequencia").textContent = "92%";

    // Atualiza os gráficos após renderizar a tabela e os cards
    atualizarGraficos();
}

// =========================================
// FOLHAS DE SAKURA
// =========================================
function criarSakuras() {
    const container = document.getElementById("sakura-container");
    const QUANTIDADE = 25;
    for (let i = 0; i < QUANTIDADE; i++) {
        const folha = document.createElement("div");
        folha.classList.add("sakura");
        folha.style.left = (Math.random() * 100) + "%";
        const tamanho = Math.random() * 12 + 12;
        folha.style.width = tamanho + "px";
        folha.style.height = tamanho + "px";
        folha.style.animationDuration = (Math.random() * 10 + 8) + "s";
        folha.style.animationDelay = (Math.random() * 15) + "s";
        folha.style.opacity = Math.random() * 0.4 + 0.4;
        container.appendChild(folha);
    }
}

// =========================================
// LOGIN POR PIN
// =========================================
async function entrarComPin() {
    const inputPin = document.getElementById("input-pin");
    const mensagem = document.getElementById("mensagem-acesso");
    const btnEntrar = document.getElementById("btn-entrar");
    const pin = inputPin.value.trim();

    if (!pin) {
        mensagem.textContent = "Digite o PIN.";
        return;
    }

    mensagem.textContent = "Conectando...";
    btnEntrar.disabled = true;

    try {
        const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                turma: CONFIG_ALUNO.turma,
                numero_chamada: CONFIG_ALUNO.numeroChamada,
                pin: pin
            })
        });

        if (resposta.status === 401) {
            mensagem.textContent = "Turma, chamada ou PIN inválidos.";
            btnEntrar.disabled = false;
            return;
        }

        if (resposta.status === 429) {
            mensagem.textContent = "Muitas tentativas. Aguarde um minuto e tente novamente.";
            btnEntrar.disabled = false;
            return;
        }

        if (!resposta.ok) {
            mensagem.textContent = "Erro ao conectar. Tente novamente.";
            btnEntrar.disabled = false;
            return;
        }

        const dados = await resposta.json();
        pinSessao = pin;

        if (dados.dados && Array.isArray(dados.dados.disciplinas) && dados.dados.disciplinas.length > 0) {
            dadosAtuais = dados.dados.disciplinas;
        } else {
            dadosAtuais = JSON.parse(JSON.stringify(dadosLocais));
        }

        inputPin.value = "";
        mensagem.textContent = "";

        document.getElementById("acesso-container").classList.add("escondido");
        document.getElementById("conteudo-boletim").classList.remove("escondido");

        renderizarTudo();

    } catch (erro) {
        mensagem.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
        btnEntrar.disabled = false;
    }
}

// =========================================
// MODO EDIÇÃO
// =========================================
function ativarEdicao() {
    modoEdicao = true;
    document.getElementById("btn-alterar").classList.add("escondido");
    document.getElementById("btn-salvar").classList.remove("escondido");
    document.getElementById("btn-cancelar").classList.remove("escondido");
    document.getElementById("mensagem-edicao").textContent = "";
    renderizarTudo();
}

function cancelarEdicao() {
    modoEdicao = false;
    document.getElementById("btn-alterar").classList.remove("escondido");
    document.getElementById("btn-salvar").classList.add("escondido");
    document.getElementById("btn-cancelar").classList.add("escondido");
    document.getElementById("mensagem-edicao").textContent = "";
    renderizarTudo();
}

async function salvarAlteracoes() {
    const mensagem = document.getElementById("mensagem-edicao");
    mensagem.textContent = "";
    mensagem.style.color = "#e63946";

    const inputsNota = document.querySelectorAll(".input-nota");
    const inputsFalta = document.querySelectorAll(".input-falta");
    let temErro = false;

    inputsNota.forEach(input => input.classList.remove("invalido"));
    inputsFalta.forEach(input => input.classList.remove("invalido"));

    const novosDados = JSON.parse(JSON.stringify(dadosAtuais));

    inputsNota.forEach(input => {
        const idx = parseInt(input.dataset.index, 10);
        const tri = input.dataset.tri;
        const resultado = normalizarNotaEdicao(input.value);
        if (!resultado.ok) {
            input.classList.add("invalido");
            temErro = true;
        } else {
            novosDados[idx][tri] = resultado.valor;
        }
    });

    inputsFalta.forEach(input => {
        const idx = parseInt(input.dataset.index, 10);
        const tri = parseInt(input.dataset.tri, 10);
        const resultado = validarFaltaEdicao(input.value);
        if (!resultado.ok) {
            input.classList.add("invalido");
            temErro = true;
        } else {
            novosDados[idx].faltas[tri] = resultado.valor;
        }
    });

    if (temErro) {
        mensagem.textContent = "Corrija os campos destacados em vermelho.";
        return;
    }

    mensagem.textContent = "Salvando...";
    mensagem.style.color = "#888";

    try {
        const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                turma: CONFIG_ALUNO.turma,
                numero_chamada: CONFIG_ALUNO.numeroChamada,
                pin: pinSessao,
                dados: { disciplinas: novosDados }
            })
        });

        if (!resposta.ok) {
            mensagem.textContent = "Não foi possível salvar. Tente novamente.";
            mensagem.style.color = "#e63946";
            return;
        }

        dadosAtuais = novosDados;
        modoEdicao = false;
        document.getElementById("btn-alterar").classList.remove("escondido");
        document.getElementById("btn-salvar").classList.add("escondido");
        document.getElementById("btn-cancelar").classList.add("escondido");
        renderizarTudo();

        mensagem.textContent = "Dados salvos com sucesso.";
        mensagem.style.color = "#38b000";

    } catch (erro) {
        mensagem.textContent = "Não foi possível salvar. Tente novamente.";
        mensagem.style.color = "#e63946";
    }
}

// =========================================
// FUNÇÕES DOS GRÁFICOS (SOMENTE LEITURA)
// =========================================
function atualizarGraficos() {
    if (typeof Chart === "undefined") return; // Aguarda o Chart.js carregar

    // Configuração global do Chart.js para combinar com o tema
    Chart.defaults.font.family = "'Poppins', sans-serif";
    Chart.defaults.color = "#4a2c3a";

    // ----------------------------------------------------
    // GRÁFICO 1: MÉDIA POR DISCIPLINA
    // ----------------------------------------------------
    const ctxMedias = document.getElementById("graficoMediasDisciplinas");
    if (ctxMedias) {
        if (graficoMedias) graficoMedias.destroy();

        const labelsMedias = dadosAtuais.map(d => d.disciplina);
        const dadosMedias = dadosAtuais.map(d => {
            return calcularMedia([
                normalizarNota(d.tri1),
                normalizarNota(d.tri2),
                normalizarNota(d.tri3)
            ]);
        });

        graficoMedias = new Chart(ctxMedias, {
            type: 'bar',
            data: {
                labels: labelsMedias,
                datasets: [{
                    label: 'Média',
                    data: dadosMedias,
                    backgroundColor: '#ff8fab',
                    borderColor: '#d6336c',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        min: 0,
                        max: 10,
                        grid: { color: '#ffe0e8' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 10 }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let valor = context.raw;
                                if (valor === null) return "Nota ainda não disponível";
                                return `Média: ${valor.toFixed(1).replace(".", ",")}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ----------------------------------------------------
    // GRÁFICO 2: EVOLUÇÃO DA MÉDIA GERAL
    // ----------------------------------------------------
    const ctxEvolucao = document.getElementById("graficoEvolucaoTrimestres");
    if (ctxEvolucao) {
        if (graficoEvolucao) graficoEvolucao.destroy();

        const n1s = dadosAtuais.map(d => normalizarNota(d.tri1));
        const n2s = dadosAtuais.map(d => normalizarNota(d.tri2));
        const n3s = dadosAtuais.map(d => normalizarNota(d.tri3));

        const mediaTri1 = calcularMedia(n1s);
        const mediaTri2 = calcularMedia(n2s);
        const mediaTri3 = calcularMedia(n3s);

        graficoEvolucao = new Chart(ctxEvolucao, {
            type: 'line',
            data: {
                labels: ["1º Tri", "2º Tri", "3º Tri"],
                datasets: [{
                    label: 'Média Geral',
                    data: [mediaTri1, mediaTri2, mediaTri3],
                    borderColor: '#d6336c',
                    backgroundColor: 'rgba(255, 143, 171, 0.2)',
                    borderWidth: 3,
                    pointBackgroundColor: '#ff8fab',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 0,
                        max: 10,
                        grid: { color: '#ffe0e8' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let valor = context.raw;
                                if (valor === null) return "Sem notas";
                                return `Média: ${valor.toFixed(1).replace(".", ",")}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ----------------------------------------------------
    // GRÁFICO 3: FALTAS POR TRIMESTRE
    // ----------------------------------------------------
    const ctxFaltas = document.getElementById("graficoFaltasTrimestres");
    if (ctxFaltas) {
        if (graficoFaltas) graficoFaltas.destroy();

        let faltasTri1 = 0;
        let faltasTri2 = 0;
        let faltasTri3 = 0;

        dadosAtuais.forEach(d => {
            if (d.faltas && Array.isArray(d.faltas)) {
                faltasTri1 += d.faltas[0] || 0;
                faltasTri2 += d.faltas[1] || 0;
                faltasTri3 += d.faltas[2] || 0;
            }
        });

        // Verificação de estado crítico (referência interna de 350)
        const totalFaltasGeral = faltasTri1 + faltasTri2 + faltasTri3;
        const badgePerigo = document.getElementById("estado-faltas");
        const cardFaltas = document.getElementById("card-grafico-faltas");

        if (totalFaltasGeral >= 350) {
            badgePerigo.classList.remove("escondido");
            cardFaltas.classList.add("perigo-ativo");
        } else {
            badgePerigo.classList.add("escondido");
            cardFaltas.classList.remove("perigo-ativo");
        }

        graficoFaltas = new Chart(ctxFaltas, {
            type: 'bar',
            data: {
                labels: ["1º Tri", "2º Tri", "3º Tri"],
                datasets: [{
                    label: 'Faltas',
                    data: [faltasTri1, faltasTri2, faltasTri3],
                    backgroundColor: ['#ff8fab', '#ff8fab', '#ff8fab'],
                    borderColor: '#d6336c',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#ffe0e8' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.raw} faltas`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// =========================================
// INICIALIZAÇÃO
// =========================================
document.addEventListener("DOMContentLoaded", () => {
    criarSakuras();

    document.getElementById("btn-entrar").addEventListener("click", entrarComPin);
    document.getElementById("btn-alterar").addEventListener("click", ativarEdicao);
    document.getElementById("btn-cancelar").addEventListener("click", cancelarEdicao);
    document.getElementById("btn-salvar").addEventListener("click", salvarAlteracoes);

    document.getElementById("input-pin").addEventListener("keydown", (e) => {
        if (e.key === "Enter") entrarComPin();
    });
});