# -*- coding: utf-8 -*-
"""
Módulo simples de gerenciamento de genomas em memória.
Funciona como um cache temporário durante a execução do app.
"""

# backend/data_manager.py
from typing import Dict, Optional

# Armazena genomas em memória: { genome_id: genome_data }
_store: Dict[str, dict] = {}

def store_genome(genome: dict, genome_id: Optional[str] = None) -> str:
    """
    Armazena um genoma no cache.
    - Se genome_id não for fornecido, usa o 'id' do genoma, ou gera um nome único.
    - Retorna o ID usado.
    """
    gid = genome_id or genome.get("id") or f"genome_{len(_store)+1}"
    # Se já existe, evite colidir: cria sufixo incremental
    if gid in _store:
        i = 2
        base = gid
        while gid in _store:
            gid = f"{base}_{i}"
            i += 1
    _store[gid] = genome
    return gid

def get_genome(genome_id: str) -> Optional[dict]:
    """Recupera um genoma pelo seu ID."""
    return _store.get(genome_id)

def list_genomes() -> Dict[str, dict]:
    """
    Retorna todos os genomas armazenados (resumo).
    Ex.: {gid: {id, length, num_genes}}
    """
    return {
        gid: {
            "id": genome.get("id"),
            "length": genome.get("length"),
            "num_genes": len(genome.get("genes", [])),
        }
        for gid, genome in _store.items()
    }

def remove_genome(genome_id: str) -> bool:
    """Remove um genoma do cache. Retorna True se removido."""
    return _store.pop(genome_id, None) is not None

def clear_all():
    """Limpa todo o cache."""
    _store.clear()

