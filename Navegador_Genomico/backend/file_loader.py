# -*- coding: utf-8 -*-

# backend/file_loader.py
from typing import Dict, List, Optional
from io import StringIO

VALID_STRANDS = {"+", "-"}

# Mapeamento de tipos GFF para tipos de track
TYPE_MAP = {
    "gene": "gene",
    "cds": "CDS",
    "mrna": "mRNA",
    "transcript": "mRNA",
    "exon": "regulatory",          # pode ajustar para uma track própria
    "utr": "regulatory",
    "five_prime_utr": "regulatory",
    "three_prime_utr": "regulatory",
    "promoter": "regulatory",
    "regulatory_region": "regulatory",
}

def load_genome(fna_path: str, gff_path: Optional[str] = None) -> Dict[str, object]:
    """Carrega o genoma a partir de arquivos no disco."""
    with open(fna_path, "r", encoding="utf-8") as f:
        fna_content = f.read()
    gff_content = None
    if gff_path:
        with open(gff_path, "r", encoding="utf-8") as g:
            gff_content = g.read()
    return load_genome_from_content(fna_content, gff_content)


def load_genome_from_content(fna_content: str, gff_content: Optional[str] = None) -> Dict[str, object]:
    """Carrega o genoma a partir de strings de conteúdo FASTA e GFF."""
    genome_data: Dict[str, object] = {
        "id": None,
        "length": 0,
        "genes": [],
        "sequence": "",
        # futuro: "contigs": [] para múltiplos contigs
    }

    # --- Parse do FASTA (apenas primeiro contig) ---
    lines = [line.rstrip("\n\r") for line in StringIO(fna_content)]
    lines = [ln.strip() for ln in lines if ln.strip()]
    if not lines or not lines[0].startswith(">"):
        raise ValueError("Arquivo FNA inválido ou sem header FASTA ('>').")

    header = lines[0][1:].strip()
    seq = "".join(lines[1:]).upper()
    # limpeza básica da sequência (A/C/G/T/N)
    seq = "".join(ch for ch in seq if ch in {"A", "C", "G", "T", "N"})
    if not seq:
        raise ValueError("Sequência FASTA vazia ou inválida após limpeza.")

    genome_data["id"] = header or "unknown_genome"
    genome_data["length"] = len(seq)
    genome_data["sequence"] = seq

    # --- Parse do GFF ---
    if gff_content:
        features: List[Dict[str, object]] = []
        for raw in StringIO(gff_content):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue

            parts = line.split("\t")
            if len(parts) < 9:
                continue  # ignora linhas malformadas

            # Campos GFF: seqid, source, type, start, end, score, strand, phase, attributes
            raw_type = parts[2].strip().lower()
            start_s, end_s = parts[3].strip(), parts[4].strip()
            strand = parts[6].strip() if parts[6].strip() in VALID_STRANDS else "+"

            # validar coordenadas
            try:
                start = int(start_s)
                end = int(end_s)
            except ValueError:
                continue

            if start < 1 or end < 1:
                continue
            if end < start:
                start, end = end, start  # corrige inversão eventual
            # converter para 0-based half-open internamente (opcional)
            # aqui mantemos como 1-based fechados, consistentes com exibição

            # atributos
            attr = parts[8]
            name = parse_name_from_attributes(attr)

            # mapear tipo para track
            ftype = TYPE_MAP.get(raw_type, "regulatory")

            features.append({
                "start": start,
                "end": end,
                "name": name,
                "strand": strand,
                "type": ftype
            })

        # ordenar por posição crescente
        features.sort(key=lambda g: (g["start"], g["end"]))
        genome_data["genes"] = features

    return genome_data


def parse_name_from_attributes(attr: str) -> str:
    """
    Extrai um nome amigável dos atributos GFF.
    Prioridade: Name, gene, locus_tag, ID.
    """
    # Quebra por ';' em pares chave=valor
    parts = attr.split(";")
    kv = {}
    for p in parts:
        if "=" in p:
            k, v = p.split("=", 1)
            kv[k.strip()] = v.strip()

    for key in ("Name", "gene", "locus_tag", "ID"):
        if key in kv and kv[key]:
            return sanitize_label(kv[key])

    # fallback: primeira parte, se existir
    return sanitize_label(attr[:32] if attr else "unknown")


def sanitize_label(text: str) -> str:
    """Remove caracteres problemáticos e limita o tamanho para exibição."""
    cleaned = "".join(ch for ch in text if ch.isalnum() or ch in ("_", "-", "."))
    if not cleaned:
        cleaned = "unknown"
    return cleaned[:64]
