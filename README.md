
# Genoview 🧬

Um **navegador genômico leve** em Python + WebView, inspirado em ferramentas como IGV, mas com foco em simplicidade e extensibilidade.  
Permite carregar arquivos **FASTA (.fna)** e **GFF**, visualizar múltiplos genomas em memória, explorar anotações em múltiplas *tracks* (genes, mRNA, CDS, regulatory), navegar com zoom/pan, buscar por posição ou anotação, e exportar a visualização em PNG.

---

## ✨ Recursos

- **Carregar múltiplos genomas** e alternar entre eles.
- **Informações detalhadas**: ID, tamanho, presença de GFF e contagem de anotações por tipo.
- **Anotações organizadas**: tabela em colunas (Genes, mRNA, CDS, Regulatory), com links clicáveis.
- **Sequência**: exibição da sequência correspondente a uma anotação ou região.
- **Visualização interativa**:
  - Tracks separadas por tipo de anotação.
  - Zoom in/out, pan e reset.
  - “Ir para” posição ou nome de anotação.
  - Régua de coordenadas.
  - Exportação da imagem em PNG.

---

## 📂 Estrutura do projeto

```
.
├─ backend/
│  ├─ api.py
│  ├─ data_manager.py
│  └─ file_loader.py
├─ frontend/
│  ├─ index.html
│  ├─ style.css
│  └─ app.js
├─ data/
│  └─ E.Coli-MG1655/
│     ├─ GCA_904425475.1_MG1655_genomic.fna
│     └─ genomic.gff
├─ app.py
├─ requirements.txt
└─ README.md
```

- **backend/**: lógica de carregamento, parsing e API.
- **frontend/**: interface em abas (Carregar, Informações, Anotações, Sequência, Visualização).
- **data/**: contém genomas de exemplo para teste.
- **app.py**: inicializa a aplicação com PyWebView.

---

## 🚀 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/<seu-usuario>/genoview.git
cd genoview
```

2. Crie um ambiente virtual e instale as dependências:

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## ▶️ Uso

Execute a aplicação:

```bash
python app.py
```

A interface abrirá em uma janela.  

- **Carregar**: selecione arquivos `.fna` e `.gff` e clique em **Carregar genoma**.  
- **Informações**: veja resumo do genoma e das anotações.  
- **Anotações**: explore genes, mRNA, CDS e regulatory em colunas. Clique em um item para ver a sequência e centralizar a visualização.  
- **Sequência**: exibe a sequência da anotação selecionada.  
- **Visualização**: canvas interativo com tracks, zoom, pan, régua e botão para salvar imagem.  

---

## 📊 Dados de exemplo

O repositório inclui a pasta [`data/E.Coli-MG1655/`](data/E.Coli-MG1655/) com um genoma de *Escherichia coli* usado para testes:

- `GCA_904425475.1_MG1655_genomic.fna` → sequência genômica em formato FASTA.  
- `genomic.gff` → anotações genômicas em formato GFF.  

Você pode carregar esses arquivos diretamente na aba **Carregar** para explorar o funcionamento do navegador.

---

## 🛣️ Roadmap futuro

- Tracks adicionais (exons, UTRs, variantes, cobertura).
- Tooltips ao passar o mouse sobre features.
- Suporte a múltiplos contigs (seqid).
- Persistência de sessões.
- Filtros avançados por tipo ou intervalo.

---

## 📜 Licença

Este projeto está licenciado sob a licença MIT.  
Sinta-se livre para usar, modificar e compartilhar.

---

## 💡 Nome do projeto

**Genoview** — genome + view.  
Um navegador genômico simples, feito para desenvolver skills de computação e bioinformática

