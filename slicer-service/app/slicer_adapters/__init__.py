"""
Shilp Studio Slicer Adapters
============================
Modular slicing engine adapters for Shilp Studio:
- PrusaSlicer (single-material path)
- Bambu Studio CLI / OrcaSlicer (multicolor path)
"""

from app.slicer_adapters.bambu_adapter import BambuSlicerAdapter, execute_bambu_slice

__all__ = ["BambuSlicerAdapter", "execute_bambu_slice"]

