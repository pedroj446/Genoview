// app.js — Navegador genômico com múltiplos genomas, infos expandidas, anotações por colunas e visualização com tracks

document.addEventListener("DOMContentLoaded", () => {
  // Elements: Carregar
  const fnaInput = document.getElementById("fnaInput");
  const gffInput = document.getElementById("gffInput");
  const loadBtn = document.getElementById("loadBtn");
  const fileInfo = document.getElementById("fileInfo");
  const genomeSelector = document.getElementById("genomeSelector");
  const setActiveBtn = document.getElementById("setActiveBtn");

  // Elements: Info
  const infoId = document.getElementById("infoId");
  const infoLength = document.getElementById("infoLength");
  const infoHasGff = document.getElementById("infoHasGff");
  const infoGenesCount = document.getElementById("infoGenesCount");
  const infoMrnaCount = document.getElementById("infoMrnaCount");
  const infoCdsCount = document.getElementById("infoCdsCount");
  const infoRegCount = document.getElementById("infoRegCount");
  const output = document.getElementById("output"); // log simples

  // Elements: Anotações
  const geneCol = document.getElementById("geneCol");
  const mrnaCol = document.getElementById("mrnaCol");
  const cdsCol = document.getElementById("cdsCol");
  const regCol = document.getElementById("regCol");

  // Elements: Sequência
  const seqView = document.getElementById("seqView");

  // Elements: Visualização
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const panLeftBtn = document.getElementById("panLeftBtn");
  const panRightBtn = document.getElementById("panRightBtn");
  const resetZoomBtn = document.getElementById("resetZoomBtn");
  const gotoInput = document.getElementById("gotoInput");
  const gotoBtn = document.getElementById("gotoBtn");
  const viewLabel = document.getElementById("viewLabel");
  const activeGenomeIdLabel = document.getElementById("activeGenomeId");
  const saveImgBtn = document.getElementById("saveImgBtn");

  // Estado global da janela visível
  window.currentGenomeLength = 0;
  window.viewStart = 0;
  window.viewEnd = 0;

  // Alternar abas
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.remove("hidden");
    });
  });

  // Carregar arquivos (conteúdo) e enviar ao backend
  loadBtn.addEventListener("click", async () => {
    const fnaFile = fnaInput.files[0];
    const gffFile = gffInput.files[0];

    if (!fnaFile) {
      alert("Selecione um arquivo .fna primeiro.");
      return;
    }

    fileInfo.innerText = `📂 FNA: ${fnaFile.name}\n📄 GFF: ${gffFile ? gffFile.name : "nenhum"}`;
    output.innerText = "⏳ Carregando...";

    try {
      const fnaContent = await fnaFile.text();
      const gffContent = gffFile ? await gffFile.text() : "";

      const result = await window.pywebview.api.load_genome_content(fnaContent, gffContent);
      const info = JSON.parse(result);

      // Ajustar janela
      window.currentGenomeLength = info.length;
      resetZoomWindow();

      // Atualizar UI
      await refreshGenomeSelector();
      await refreshInfo();
      await refreshAnnotations();
      await drawGenome();

      output.innerText = `✅ Carregado: ${info.id} (${info.length} bp)`;
      activeGenomeIdLabel.textContent = info.id || "—";
    } catch (err) {
      console.error(err);
      output.innerText = "❌ Erro ao carregar genoma.";
    }
  });

  // Trocar genoma ativo
  setActiveBtn.addEventListener("click", async () => {
    const selected = genomeSelector.value;
    if (!selected) return;
    const ok = await window.pywebview.api.set_active_genome(selected);
    if (ok) {
      const info = JSON.parse(await window.pywebview.api.get_genome_info());
      window.currentGenomeLength = info.length;
      resetZoomWindow();
      await refreshInfo();
      await refreshAnnotations();
      await drawGenome();
      activeGenomeIdLabel.textContent = info.id || "—";
      output.innerText = `🔄 Ativo: ${info.id} (${info.length} bp)`;
    }
  });

  // Controles: zoom, pan, reset, ir para
  zoomInBtn.addEventListener("click", () => {
    const len = window.viewEnd - window.viewStart;
    const center = window.viewStart + len / 2;
    const newLen = Math.max(Math.floor(len / 2), 1000); // mínimo 1kb
    setViewWindow(center - newLen / 2, center + newLen / 2);
  });

  zoomOutBtn.addEventListener("click", () => {
    const len = window.viewEnd - window.viewStart;
    const center = window.viewStart + len / 2;
    const newLen = Math.min(len * 2, window.currentGenomeLength);
    setViewWindow(center - newLen / 2, center + newLen / 2);
  });

  panLeftBtn.addEventListener("click", () => {
    const shift = Math.floor((window.viewEnd - window.viewStart) * 0.5);
    setViewWindow(window.viewStart - shift, window.viewEnd - shift);
  });

  panRightBtn.addEventListener("click", () => {
    const shift = Math.floor((window.viewEnd - window.viewStart) * 0.5);
    setViewWindow(window.viewStart + shift, window.viewEnd + shift);
  });

  resetZoomBtn.addEventListener("click", () => {
    resetZoomWindow();
    drawGenome();
  });

  gotoBtn.addEventListener("click", async () => {
    const q = (gotoInput.value || "").trim();
    if (!q) return;

    // número → posição central
    if (/^\d+$/.test(q)) {
      const pos = parseInt(q, 10);
      const len = Math.max(window.viewEnd - window.viewStart, 10000);
      const half = Math.floor(len / 2);
      setViewWindow(pos - half, pos + half);
      return;
    }

    // nome de feature (gene, mRNA, CDS etc.)
    try {
      const match = await window.pywebview.api.find_gene_by_name(q);
      const g = JSON.parse(match);
      if (g && g.start !== undefined && g.end !== undefined) {
        const len = g.end - g.start;
        const pad = Math.max(Math.floor(len * 0.5), 1000);
        setViewWindow(g.start - pad, g.end + pad);
      } else {
        alert("Anotação não encontrada.");
      }
    } catch {
      alert("Anotação não encontrada.");
    }
  });

  // Salvar imagem do canvas
  saveImgBtn.addEventListener("click", () => {
    const canvas = document.getElementById("genomeCanvas");
    const link = document.createElement("a");
    link.download = "genome_view.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
});


// --- Helpers de UI --- //

// Atualizar seletor de genomas
async function refreshGenomeSelector() {
  const genomes = JSON.parse(await window.pywebview.api.list_genomes());
  genomeSelector.innerHTML = "";
  Object.entries(genomes).forEach(([gid, info]) => {
    const opt = document.createElement("option");
    opt.value = gid;
    opt.textContent = `${info.id} (${info.length} bp, ${info.num_genes} genes)`;
    genomeSelector.appendChild(opt);
  });
}

// Atualizar seção de Informações (inclui contagens por tipo)
async function refreshInfo() {
  const info = JSON.parse(await window.pywebview.api.get_genome_info());
  infoId.textContent = info.id || "—";
  infoLength.textContent = info.length ? `${info.length} bp` : "—";
  infoHasGff.textContent = info.has_gff ? "Sim" : "Não";

  // Contagens por tipo via lista de features
  const features = JSON.parse(await window.pywebview.api.get_gene_list());
  let genes = 0, mrna = 0, cds = 0, reg = 0;
  features.forEach(f => {
    switch (f.type) {
      case "gene": genes++; break;
      case "mRNA": mrna++; break;
      case "CDS": cds++; break;
      case "regulatory": reg++; break;
      default: reg++; break;
    }
  });
  infoGenesCount.textContent = genes;
  infoMrnaCount.textContent = mrna;
  infoCdsCount.textContent = cds;
  infoRegCount.textContent = reg;

  // Ajustar janela label
  updateViewLabel();
}

// Atualizar aba Anotações (colunas por tipo)
async function refreshAnnotations() {
  const features = JSON.parse(await window.pywebview.api.get_gene_list());

  const byType = {
    gene: [],
    mRNA: [],
    CDS: [],
    regulatory: []
  };
  features.forEach(f => {
    const t = byType[f.type] ? f.type : "regulatory";
    byType[t].push(f);
  });

  // helper para montar listas clicáveis
  const makeList = (items) => {
    const ul = document.createElement("ul");
    items.forEach(g => {
      const li = document.createElement("li");
      li.textContent = `${g.name} (${g.start}-${g.end})`;
      li.onclick = async () => {
        const seq = await window.pywebview.api.get_sequence_region(g.start, g.end);
        document.querySelector('.tab[data-tab="sequence"]').click(); // focar aba sequência
        document.getElementById("seqView").value = seq;

        // centralizar visualização na anotação clicada
        const len = g.end - g.start;
        const pad = Math.max(Math.floor(len * 0.5), 1000);
        setViewWindow(g.start - pad, g.end + pad);
      };
      ul.appendChild(li);
    });
    return ul;
  };

  geneCol.innerHTML = "";
  mrnaCol.innerHTML = "";
  cdsCol.innerHTML = "";
  regCol.innerHTML = "";

  geneCol.appendChild(makeList(byType.gene));
  mrnaCol.appendChild(makeList(byType.mRNA));
  cdsCol.appendChild(makeList(byType.CDS));
  regCol.appendChild(makeList(byType.regulatory));
}


// --- Janela de visualização --- //

function updateViewLabel() {
  const start = Math.max(0, Math.floor(window.viewStart));
  const end = Math.min(window.currentGenomeLength, Math.floor(window.viewEnd));
  const span = Math.max(0, end - start);
  viewLabel.innerText = `Janela: ${start}-${end} (${span} bp de ${window.currentGenomeLength})`;
}

function setViewWindow(start, end) {
  start = Math.max(0, Math.floor(start));
  end = Math.min(window.currentGenomeLength, Math.floor(end));
  if (end <= start + 1) end = start + 1;
  window.viewStart = start;
  window.viewEnd = end;
  updateViewLabel();
  drawGenome();
}

function resetZoomWindow() {
  window.viewStart = 0;
  window.viewEnd = window.currentGenomeLength || 1;
  updateViewLabel();
}


// --- Visualização (tracks) --- //

// Desenhar genoma com múltiplas tracks
async function drawGenome() {
  const canvas = document.getElementById("genomeCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width; // para toDataURL, melhor usar atributo

  const scaledFeatures = JSON.parse(
    await window.pywebview.api.get_visualization_region(
      window.viewStart,
      window.viewEnd,
      width
    )
  );

  // Layout de tracks
  const trackOrder = ["gene", "mRNA", "CDS", "regulatory"];
  const trackHeight = 40;
  const trackSpacing = 30;
  const topPadding = 50;

  // Ajustar altura dinamicamente conforme número de tracks
  const totalHeight = topPadding + trackOrder.length * (trackHeight + trackSpacing) + 60;
  if (canvas.height !== totalHeight) {
    canvas.height = totalHeight; // atualiza altura (CSS define largura responsiva)
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenhar cada track
  trackOrder.forEach((type, idx) => {
    const yCenter = topPadding + idx * (trackHeight + trackSpacing);

    // Linha base da track
    ctx.fillStyle = "#1976d2";
    ctx.fillRect(0, yCenter - 2, canvas.width, 2);

    // Filtrar features desse tipo
    const feats = scaledFeatures.filter(f => f.type === type);
    feats.forEach(f => {
      // corpo do feature
      ctx.fillStyle = f.color || colorForType(type);
      ctx.fillRect(f.x, yCenter - trackHeight / 2, f.width, trackHeight);

      // label
      if (f.width > 60) {
        ctx.fillStyle = "#000";
        ctx.font = "11px Arial";
        ctx.fillText(f.name, f.x + 4, yCenter - trackHeight / 2 - 4);
      }

      // setas de strand
      if (f.strand === "+" || f.strand === "-") {
        drawArrow(ctx, f.x, yCenter, f.width, f.strand);
      }
    });

    // Label da track
    ctx.fillStyle = "#444";
    ctx.font = "12px Arial";
    ctx.fillText(type.toUpperCase(), 6, yCenter - trackHeight / 2 - 10);
  });

  // Régua no rodapé
  drawRuler(ctx, canvas);
}

// Cores padrão por tipo (fallback)
function colorForType(type) {
  switch (type) {
    case "gene": return "#2ecc71";
    case "mRNA": return "#f1c40f";
    case "CDS": return "#9b59b6";
    case "regulatory": return "#e67e22";
    default: return "#95a5a6";
  }
}

// Régua com marcas
function drawRuler(ctx, canvas) {
  const start = window.viewStart;
  const end = window.viewEnd;
  const span = Math.max(1, end - start);

  ctx.fillStyle = "#333";
  ctx.font = "10px Arial";

  const baseY = canvas.height - 30;
  ctx.fillRect(0, baseY, canvas.width, 1);

  const approxTicks = 8;
  const step = Math.max(1, Math.floor(span / approxTicks));

  for (let pos = start; pos <= end; pos += step) {
    const x = ((pos - start) / span) * canvas.width;
    ctx.fillRect(x, baseY, 1, 8);
    ctx.fillText(`${pos}`, x + 2, baseY + 18);
  }
}

// Setas indicando strand
function drawArrow(ctx, x, midY, width, strand) {
  const arrowSpacing = 30;
  const arrowSize = 6;
  const yTop = midY - 15;
  const yBottom = midY + 15;
  ctx.fillStyle = "rgba(0,0,0,0.35)";

  if (strand === "+") {
    for (let ax = x + 12; ax < x + width - 12; ax += arrowSpacing) {
      ctx.beginPath();
      ctx.moveTo(ax - arrowSize, yTop);
      ctx.lineTo(ax, yTop + arrowSize);
      ctx.lineTo(ax - arrowSize, yTop + 2 * arrowSize);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(ax - arrowSize, yBottom - 2 * arrowSize);
      ctx.lineTo(ax, yBottom - arrowSize);
      ctx.lineTo(ax - arrowSize, yBottom);
      ctx.closePath();
      ctx.fill();
    }
  } else if (strand === "-") {
    for (let ax = x + 12; ax < x + width - 12; ax += arrowSpacing) {
      ctx.beginPath();
      ctx.moveTo(ax + arrowSize, yTop);
      ctx.lineTo(ax, yTop + arrowSize);
      ctx.lineTo(ax + arrowSize, yTop + 2 * arrowSize);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(ax + arrowSize, yBottom - 2 * arrowSize);
      ctx.lineTo(ax, yBottom - arrowSize);
      ctx.lineTo(ax + arrowSize, yBottom);
      ctx.closePath();
      ctx.fill();
    }
  }
}
