// =========================================
// CONFIGURAÇÃO FIXA DO ALUNO
// =========================================
const CONFIG_ALUNO = {
    turma: "9B",
    numeroChamada: 8,
    apiUrl: "https://boletim-api.profbt.com.br"
};

// Regras do boletim (ajuste aqui se a escola mudar)
const REGRAS = {
    mediaMinima: 6.0,          // abaixo disso = "Atenção"
    totalAulasAno: 640,        // total de aulas usado no cálculo da frequência
    frequenciaMinima: 75,      // % mínima de presença (frequência abaixo disso = perigo)
    timeoutMs: 10000           // tempo máximo de espera da API
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

let graficoMedias = null;
let graficoEvolucao = null;
let graficoFaltas = null;
let timerGraficos = null;

const $ = (id) => document.getElementById(id);
const prefereMenosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// =========================================
// UTILIDADES
// =========================================
function mostrarMensagem(elemento, texto, tipo = "erro") {
    elemento.textContent = texto;
    elemento.classList.remove("erro", "ok", "info");
    if (texto) elemento.classList.add(tipo);
}

async function fetchComTimeout(url, opcoes) {
    const controlador = new AbortController();
    const timer = setTimeout(() => controlador.abort(), REGRAS.timeoutMs);
    try {
        return await fetch(url, { ...opcoes, signal: controlador.signal });
    } finally {
        clearTimeout(timer);
    }
}

function alternarBotoesEdicao(editando) {
    $("btn-alterar").classList.toggle("escondido", editando);
    $("btn-salvar").classList.toggle("escondido", !editando);
    $("btn-cancelar").classList.toggle("escondido", !editando);
}

// =========================================
// FUNÇÕES DE NORMALIZAÇÃO E VALIDAÇÃO
// =========================================
function normalizarNota(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    const numero = parseFloat(String(valor).replace(",", "."));
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
    const validas = notas.filter((n) => n !== null);
    if (validas.length === 0) return null;
    return validas.reduce((a, b) => a + b, 0) / validas.length;
}

function definirSituacao(media) {
    if (media === null) return "Nota ainda não disponível";
    if (media >= REGRAS.mediaMinima) return "Bom desempenho";
    return "Atenção";
}

function formatarNota(nota) {
    if (nota === null || nota === undefined) return "—";
    return Number(nota).toFixed(1).replace(".", ",");
}

function somarFaltas(faltas) {
    return (faltas || []).reduce((a, b) => a + (Number(b) || 0), 0);
}

function obterClasseSituacao(situacao) {
    if (situacao === "Bom desempenho") return "situacao-bom";
    if (situacao === "Atenção") return "situacao-atencao";
    return "situacao-sem-nota";
}

function calcularFrequencia(totalFaltas) {
    const pct = 100 - (totalFaltas / REGRAS.totalAulasAno) * 100;
    return Math.max(0, Math.min(100, pct));
}

// Célula de nota (modo leitura): destaca nota baixa e nota ausente
function celulaNota(nota) {
    if (nota === null) return `<td class="nota-ausente">${formatarNota(nota)}</td>`;
    const classe = nota < REGRAS.mediaMinima ? "nota-baixa" : "";
    return `<td class="${classe}">${formatarNota(nota)}</td>`;
}

// =========================================
// RENDERIZAÇÃO DA TABELA E CARDS
// =========================================
function renderizarTudo() {
    const corpoTabela = $("corpo-tabela");
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
        const pill = `<td><span class="pill ${obterClasseSituacao(situacao)}">${situacao}</span></td>`;
        const nome = `<td class="nome-disciplina"></td>`;

        if (modoEdicao) {
            const inputNota = (tri, valor) =>
                `<td><input type="text" inputmode="decimal" class="input-nota" data-index="${index}" data-tri="${tri}" value="${valor !== null ? valor : ''}" aria-label="Nota do ${tri.slice(-1)}º trimestre"></td>`;
            const inputFalta = (tri) =>
                `<input type="text" inputmode="numeric" class="input-falta" data-index="${index}" data-tri="${tri}" value="${item.faltas[tri]}" aria-label="Faltas do ${tri + 1}º trimestre">`;

            linha.innerHTML = `
                ${nome}
                ${inputNota("tri1", n1)}
                ${inputNota("tri2", n2)}
                ${inputNota("tri3", n3)}
                <td><strong>${formatarNota(media)}</strong></td>
                <td><div class="faltas-edicao">${inputFalta(0)}${inputFalta(1)}${inputFalta(2)}</div></td>
                ${pill}
            `;
        } else {
            linha.innerHTML = `
                ${nome}
                ${celulaNota(n1)}
                ${celulaNota(n2)}
                ${celulaNota(n3)}
                <td><strong>${formatarNota(media)}</strong></td>
                <td>${faltasTotal}</td>
                ${pill}
            `;
        }

        // textContent evita injetar HTML vindo da API
        linha.querySelector(".nome-disciplina").textContent = item.disciplina;
        corpoTabela.appendChild(linha);
    });

    const mediaGeral = quantidadeMedias > 0 ? somaMedias / quantidadeMedias : null;
    const frequencia = calcularFrequencia(totalFaltas);
    const frequenciaOk = frequencia >= REGRAS.frequenciaMinima;

    $("card-media-geral").textContent = formatarNota(mediaGeral);
    $("card-total-faltas").textContent = totalFaltas;
    $("card-bom-desempenho").textContent = contBom;
    $("card-atencao").textContent = contAtencao;
    $("card-frequencia").textContent = Math.round(frequencia) + "%";

    const status = $("status-frequencia");
    status.textContent = frequenciaOk ? "Frequência adequada" : "Frequência em risco";
    status.classList.toggle("risco", !frequenciaOk);

    atualizarGraficos(!frequenciaOk);
}

// =========================================
// FOLHAS DE SAKURA
// =========================================
function criarSakuras() {
    if (prefereMenosMovimento) return;

    const container = $("sakura-container");
    const quantidade = window.innerWidth < 600 ? 12 : 25;

    for (let i = 0; i < quantidade; i++) {
        const folha = document.createElement("div");
        folha.classList.add("sakura");
        folha.style.left = Math.random() * 100 + "%";
        const tamanho = Math.random() * 12 + 12;
        folha.style.width = tamanho + "px";
        folha.style.height = tamanho + "px";
        folha.style.animationDuration = Math.random() * 10 + 8 + "s";
        folha.style.animationDelay = Math.random() * 15 + "s";
        folha.style.opacity = Math.random() * 0.4 + 0.4;
        container.appendChild(folha);
    }
}

// =========================================
// LOGIN POR PIN
// =========================================
async function entrarComPin() {
    const inputPin = $("input-pin");
    const mensagem = $("mensagem-acesso");
    const btnEntrar = $("btn-entrar");
    const pin = inputPin.value.trim();

    if (!pin) {
        mensagem.textContent = "Digite o PIN.";
        inputPin.focus();
        return;
    }

    mensagem.textContent = "Conectando...";
    btnEntrar.disabled = true;
    btnEntrar.textContent = "Entrando...";

    const falhar = (texto) => {
        mensagem.textContent = texto;
        btnEntrar.disabled = false;
        btnEntrar.textContent = "Entrar";
        const caixa = document.querySelector(".acesso-box");
        caixa.classList.remove("erro");
        void caixa.offsetWidth; // reinicia a animação de tremer
        caixa.classList.add("erro");
    };

    try {
        const resposta = await fetchComTimeout(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                turma: CONFIG_ALUNO.turma,
                numero_chamada: CONFIG_ALUNO.numeroChamada,
                pin: pin
            })
        });

        if (resposta.status === 401) return falhar("Turma, chamada ou PIN inválidos.");
        if (resposta.status === 429) return falhar("Muitas tentativas. Aguarde um minuto e tente novamente.");
        if (!resposta.ok) return falhar("Erro ao conectar. Tente novamente.");

        const dados = await resposta.json();
        pinSessao = pin;

        if (dados.dados && Array.isArray(dados.dados.disciplinas) && dados.dados.disciplinas.length > 0) {
            dadosAtuais = dados.dados.disciplinas;
        } else {
            dadosAtuais = JSON.parse(JSON.stringify(dadosLocais));
        }

        inputPin.value = "";
        mensagem.textContent = "";
        btnEntrar.disabled = false;
        btnEntrar.textContent = "Entrar";

        $("acesso-container").classList.add("escondido");
        $("conteudo-boletim").classList.remove("escondido");

        renderizarTudo();

    } catch (erro) {
        falhar(erro.name === "AbortError"
            ? "O servidor demorou para responder. Tente novamente."
            : "Não foi possível conectar ao servidor. Tente novamente.");
    }
}

function sair() {
    if (modoEdicao && !confirm("Você tem alterações não salvas. Deseja sair mesmo assim?")) return;

    pinSessao = null;
    dadosAtuais = [];
    modoEdicao = false;
    alternarBotoesEdicao(false);
    mostrarMensagem($("mensagem-edicao"), "");

    [graficoMedias, graficoEvolucao, graficoFaltas].forEach((g) => g && g.destroy());
    graficoMedias = graficoEvolucao = graficoFaltas = null;

    $("conteudo-boletim").classList.add("escondido");
    $("acesso-container").classList.remove("escondido");
    $("input-pin").focus();
}

// =========================================
// MODO EDIÇÃO
// =========================================
function ativarEdicao() {
    modoEdicao = true;
    alternarBotoesEdicao(true);
    mostrarMensagem($("mensagem-edicao"), "Edite as notas (0 a 10) e as faltas. Enter salva, Esc cancela.", "info");
    renderizarTudo();
    const primeiro = document.querySelector(".input-nota");
    if (primeiro) primeiro.focus();
}

function cancelarEdicao() {
    modoEdicao = false;
    alternarBotoesEdicao(false);
    mostrarMensagem($("mensagem-edicao"), "");
    renderizarTudo();
}

async function salvarAlteracoes() {
    const mensagem = $("mensagem-edicao");
    const btnSalvar = $("btn-salvar");
    const btnCancelar = $("btn-cancelar");

    const inputsNota = document.querySelectorAll(".input-nota");
    const inputsFalta = document.querySelectorAll(".input-falta");
    let temErro = false;

    inputsNota.forEach((input) => input.classList.remove("invalido"));
    inputsFalta.forEach((input) => input.classList.remove("invalido"));

    const novosDados = JSON.parse(JSON.stringify(dadosAtuais));

    inputsNota.forEach((input) => {
        const idx = parseInt(input.dataset.index, 10);
        const resultado = normalizarNotaEdicao(input.value);
        if (!resultado.ok) {
            input.classList.add("invalido");
            temErro = true;
        } else {
            novosDados[idx][input.dataset.tri] = resultado.valor;
        }
    });

    inputsFalta.forEach((input) => {
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
        mostrarMensagem(mensagem, "Corrija os campos destacados em vermelho.", "erro");
        const primeiroErro = document.querySelector("input.invalido");
        if (primeiroErro) primeiroErro.focus();
        return;
    }

    mostrarMensagem(mensagem, "Salvando...", "info");
    btnSalvar.disabled = true;
    btnCancelar.disabled = true;

    try {
        const resposta = await fetchComTimeout(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`, {
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
            mostrarMensagem(mensagem, "Não foi possível salvar. Tente novamente.", "erro");
            return;
        }

        dadosAtuais = novosDados;
        modoEdicao = false;
        alternarBotoesEdicao(false);
        renderizarTudo();
        mostrarMensagem(mensagem, "Dados salvos com sucesso.", "ok");

    } catch (erro) {
        mostrarMensagem(mensagem,
            erro.name === "AbortError"
                ? "O servidor demorou para responder. Tente novamente."
                : "Não foi possível salvar. Tente novamente.",
            "erro");
    } finally {
        btnSalvar.disabled = false;
        btnCancelar.disabled = false;
    }
}

// =========================================
// FUNÇÕES DOS GRÁFICOS
// =========================================
function atualizarGraficos(emPerigo = false) {
    if (typeof Chart === "undefined") {
        console.error("A biblioteca Chart.js não foi carregada.");
        return;
    }

    // Evita desenhar duas vezes se renderizarTudo for chamado em sequência
    clearTimeout(timerGraficos);
    timerGraficos = setTimeout(() => desenharGraficos(emPerigo), 100);
}

function desenharGraficos(emPerigo) {
    Chart.defaults.font.family = "'Poppins', sans-serif";
    Chart.defaults.color = "#4a2c3a";
    if (prefereMenosMovimento) Chart.defaults.animation = false;

    const ROSA = "#ff8fab";
    const ROSA_ESCURO = "#d6336c";
    const VERMELHO = "#e63946";

    // ---- GRÁFICO 1: MÉDIA POR DISCIPLINA ----
    const ctxMedias = $("graficoMediasDisciplinas");
    if (ctxMedias) {
        if (graficoMedias) graficoMedias.destroy();

        const labelsMedias = dadosAtuais.map((d) => d.disciplina);
        const dadosMedias = dadosAtuais.map((d) =>
            calcularMedia([normalizarNota(d.tri1), normalizarNota(d.tri2), normalizarNota(d.tri3)])
        );

        graficoMedias = new Chart(ctxMedias, {
            type: "bar",
            data: {
                labels: labelsMedias,
                datasets: [{
                    label: "Média",
                    data: dadosMedias,
                    // média abaixo do mínimo fica em vermelho
                    backgroundColor: dadosMedias.map((m) => (m !== null && m < REGRAS.mediaMinima ? VERMELHO : ROSA)),
                    borderColor: ROSA_ESCURO,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { min: 0, max: 10, grid: { color: "#ffe0e8" } },
                    y: { grid: { display: false }, ticks: { font: { size: 10 } } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ctx.raw === null
                                ? "Nota ainda não disponível"
                                : `Média: ${ctx.raw.toFixed(1).replace(".", ",")}`
                        }
                    }
                }
            }
        });
    }

    // ---- GRÁFICO 2: EVOLUÇÃO DA MÉDIA GERAL ----
    const ctxEvolucao = $("graficoEvolucaoTrimestres");
    if (ctxEvolucao) {
        if (graficoEvolucao) graficoEvolucao.destroy();

        const mediaTri = (chave) => calcularMedia(dadosAtuais.map((d) => normalizarNota(d[chave])));

        graficoEvolucao = new Chart(ctxEvolucao, {
            type: "line",
            data: {
                labels: ["1º Tri", "2º Tri", "3º Tri"],
                datasets: [{
                    label: "Média Geral",
                    data: [mediaTri("tri1"), mediaTri("tri2"), mediaTri("tri3")],
                    borderColor: ROSA_ESCURO,
                    backgroundColor: "rgba(255, 143, 171, 0.2)",
                    borderWidth: 3,
                    pointBackgroundColor: ROSA,
                    pointBorderColor: "#ffffff",
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
                    y: { min: 0, max: 10, grid: { color: "#ffe0e8" } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ctx.raw === null
                                ? "Sem notas"
                                : `Média: ${ctx.raw.toFixed(1).replace(".", ",")}`
                        }
                    }
                }
            }
        });
    }

    // ---- GRÁFICO 3: FALTAS POR TRIMESTRE ----
    const ctxFaltas = $("graficoFaltasTrimestres");
    if (ctxFaltas) {
        if (graficoFaltas) graficoFaltas.destroy();

        const faltasTri = [0, 1, 2].map((t) =>
            dadosAtuais.reduce((soma, d) => soma + ((d.faltas && d.faltas[t]) || 0), 0)
        );

        $("estado-faltas").classList.toggle("escondido", !emPerigo);
        $("card-grafico-faltas").classList.toggle("perigo-ativo", emPerigo);

        const maior = Math.max(...faltasTri);

        graficoFaltas = new Chart(ctxFaltas, {
            type: "bar",
            data: {
                labels: ["1º Tri", "2º Tri", "3º Tri"],
                datasets: [{
                    label: "Faltas",
                    data: faltasTri,
                    // o trimestre com mais faltas fica mais escuro
                    backgroundColor: faltasTri.map((f) => (f === maior && maior > 0 ? ROSA_ESCURO : ROSA)),
                    borderColor: ROSA_ESCURO,
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#ffe0e8" } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw} faltas` } }
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

    $("btn-entrar").addEventListener("click", entrarComPin);
    $("btn-alterar").addEventListener("click", ativarEdicao);
    $("btn-cancelar").addEventListener("click", cancelarEdicao);
    $("btn-salvar").addEventListener("click", salvarAlteracoes);
    $("btn-sair").addEventListener("click", sair);

    $("input-pin").addEventListener("keydown", (e) => {
        if (e.key === "Enter") entrarComPin();
    });

    // Atalhos na edição: Enter salva, Esc cancela
    $("corpo-tabela").addEventListener("keydown", (e) => {
        if (!modoEdicao) return;
        if (e.key === "Enter") { e.preventDefault(); salvarAlteracoes(); }
        if (e.key === "Escape") cancelarEdicao();
    });

    // Avisa antes de fechar a página com alterações não salvas
    window.addEventListener("beforeunload", (e) => {
        if (modoEdicao) {
            e.preventDefault();
            e.returnValue = "";
        }
    });
});