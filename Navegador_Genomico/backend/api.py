# -*- coding: utf-8 -*-

import json
from typing import Optional
from backend import file_loader, data_manager

class Api:
    def __init__(self):
        # ID do genoma atualmente selecionado
        self.active_genome_id: Optional[str] = None

    # --- Carregar de arquivos (disco) ---
    def load_genome_files(self, fna_path: str, gff_path: str = "") -> str:
        genome = file_loader.load_genome(fna_path, gff_path or None)
        gid = data_manager.store_genome(genome)
        self.active_genome_id = gid
        return json.dumps(self._info_dict(gid))

    # --- Carregar de conteúdo (frontend) ---
    def load_genome_content(self, fna_content: str, gff_content: str = "") -> str:
        genome = file_loader.load_genome_from_content(fna_content, gff_content or None)
        gid = data_manager.store_genome(genome)
        self.active_genome_id = gid
        return json.dumps(self._info_dict(gid))

    # --- Selecionar genoma ativo ---
    def set_active_genome(self, genome_id: str) -> bool:
        if data_manager.get_genome(genome_id):
            self.active_genome_id = genome_id
            return True
        return False

    # --- Listar genomas carregados ---
    def list_genomes(self) -> str:
        return json.dumps(data_manager.list_genomes())

    # --- Informações básicas do genoma ativo ---
    def get_genome_info(self) -> str:
        if not self.active_genome_id:
            return "{}"
        return json.dumps(self._info_dict(self.active_genome_id))

    def _info_dict(self, genome_id: str):
        genome = data_manager.get_genome(genome_id)
        if not genome:
            return {}
        return {
            "id": genome.get("id"),
            "length": genome.get("length"),
            "num_genes": len(genome.get("genes", [])),
            "has_gff": bool(genome.get("genes"))
        }

    # --- Lista de features/anotações ---
    def get_gene_list(self) -> str:
        genome = self._get_active()
        if not genome:
            return "[]"
        return json.dumps(genome.get("genes", []))

    # --- Subsequência ---
    def get_sequence_region(self, start: int, end: int) -> str:
        genome = self._get_active()
        if not genome:
            return ""
        start = max(0, int(start))
        end = min(genome["length"], int(end))
        if end <= start:
            return ""
        return genome["sequence"][start:end]

    # --- Busca por nome (feature exata) ---
    def find_gene_by_name(self, name: str) -> str:
        genome = self._get_active()
        if not genome:
            return "{}"
        low = name.strip().lower()
        for g in genome.get("genes", []):
            if g.get("name", "").lower() == low:
                return json.dumps(g)
        return "{}"

    # --- Visualização da região (zoom/pan) ---
    def get_visualization_region(self, start: int, end: int, width: int) -> str:
        genome = self._get_active()
        if not genome:
            return "[]"

        length = genome["length"]
        start = max(0, int(start))
        end = min(length, int(end))
        width = max(1, int(width))
        window_span = max(1, end - start)

        scaled = []
        for g in genome.get("genes", []):
            # ignorar fora da janela
            if g["end"] < start or g["start"] > end:
                continue
            # clipe para janela
            s = max(g["start"], start)
            e = min(g["end"], end)
            x_start = ((s - start) / window_span) * width
            x_end = ((e - start) / window_span) * width

            # cor padrão por tipo (fallback, frontend também tem)
            color = self._color_for_type(g.get("type"))

            scaled.append({
                "x": x_start,
                "width": max(x_end - x_start, 2),
                "name": g.get("name", "unknown"),
                "strand": g.get("strand", "+"),
                "type": g.get("type", "gene"),
                "color": color
            })
        return json.dumps(scaled)

    # --- Utilitário interno ---
    def _get_active(self) -> Optional[dict]:
        if not self.active_genome_id:
            return None
        return data_manager.get_genome(self.active_genome_id)

    def _color_for_type(self, t: Optional[str]) -> str:
        if t == "gene": return "#2ecc71"
        if t == "mRNA": return "#f1c40f"
        if t == "CDS": return "#9b59b6"
        if t == "regulatory": return "#e67e22"
        return "#95a5a6"
