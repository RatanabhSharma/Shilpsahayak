"""
Shilp Studio Universal Slicer Result Contract
==============================================

Defines the normalized, format-agnostic data contract for all slicer adapters
(PrusaSlicer, Bambu Studio CLI, OrcaSlicer, etc.).

All slicer outputs are normalized into this unified data structure BEFORE
reaching the validation layer and pricing engine.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional


@dataclass
class PerFilamentStats:
    filamentIndex: int
    totalGrams: float
    colorHex: Optional[str] = None
    materialType: Optional[str] = None
    modelGrams: Optional[float] = None
    supportGrams: Optional[float] = None
    purgeGrams: Optional[float] = None
    towerGrams: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "filamentIndex": self.filamentIndex,
            "totalGrams": self.totalGrams,
            "colorHex": self.colorHex,
            "materialType": self.materialType,
            "modelGrams": self.modelGrams,
            "supportGrams": self.supportGrams,
            "purgeGrams": self.purgeGrams,
            "towerGrams": self.towerGrams,
            # Backward-compatibility aliases
            "color": self.colorHex,
            "main_used_g": self.modelGrams,
            "total_used_g": self.totalGrams,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PerFilamentStats":
        idx = int(data.get("filamentIndex") or data.get("id") or 1)
        tot = float(data.get("totalGrams") if data.get("totalGrams") is not None else data.get("total_used_g", 0.0))
        mod = data.get("modelGrams")
        if mod is None and "main_used_g" in data:
            mod = float(data["main_used_g"])
        elif mod is not None:
            mod = float(mod)

        sup = float(data["supportGrams"]) if data.get("supportGrams") is not None else None
        purg = float(data["purgeGrams"]) if data.get("purgeGrams") is not None else None
        tow = float(data["towerGrams"]) if data.get("towerGrams") is not None else None

        return cls(
            filamentIndex=idx,
            totalGrams=tot,
            colorHex=data.get("colorHex") or data.get("color"),
            materialType=data.get("materialType") or data.get("material"),
            modelGrams=mod,
            supportGrams=sup,
            purgeGrams=purg,
            towerGrams=tow,
        )


@dataclass
class SliceDimensions:
    x: float
    y: float
    z: float

    def to_dict(self) -> Dict[str, float]:
        return {"x": round(self.x, 2), "y": round(self.y, 2), "z": round(self.z, 2)}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SliceDimensions":
        return cls(
            x=float(data.get("x", 0.0)),
            y=float(data.get("y", 0.0)),
            z=float(data.get("z", 0.0)),
        )


@dataclass
class SliceArtifact:
    gcodeReference: Optional[str] = None
    gcodeHash: Optional[str] = None
    resultReference: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "gcodeReference": self.gcodeReference,
            "gcodeHash": self.gcodeHash,
            "resultReference": self.resultReference,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SliceArtifact":
        return cls(
            gcodeReference=data.get("gcodeReference") or data.get("gcode_reference"),
            gcodeHash=data.get("gcodeHash") or data.get("gcode_hash"),
            resultReference=data.get("resultReference") or data.get("result_reference"),
        )


@dataclass
class PlateResult:
    plateId: int
    dimensions: SliceDimensions
    printTimeSeconds: int
    filamentGrams: float
    toolChangeCount: int
    perFilament: List[PerFilamentStats] = field(default_factory=list)
    modelFilamentGrams: Optional[float] = None
    supportFilamentGrams: Optional[float] = None
    purgeFilamentGrams: Optional[float] = None
    towerFilamentGrams: Optional[float] = None
    metricSources: Dict[str, str] = field(default_factory=dict)
    rawStatistics: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plateId": self.plateId,
            "dimensions": self.dimensions.to_dict(),
            "printTimeSeconds": self.printTimeSeconds,
            "filamentGrams": self.filamentGrams,
            "toolChangeCount": self.toolChangeCount,
            "perFilament": [f.to_dict() for f in self.perFilament],
            "modelFilamentGrams": self.modelFilamentGrams,
            "supportFilamentGrams": self.supportFilamentGrams,
            "purgeFilamentGrams": self.purgeFilamentGrams,
            "towerFilamentGrams": self.towerFilamentGrams,
            "metricSources": self.metricSources,
            "rawStatistics": self.rawStatistics,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PlateResult":
        raw_per_fil = data.get("perFilament") or data.get("per_filament") or []
        return cls(
            plateId=int(data.get("plateId") or data.get("plate_id") or 1),
            dimensions=SliceDimensions.from_dict(data.get("dimensions") or {}),
            printTimeSeconds=int(data.get("printTimeSeconds") or data.get("print_time_seconds") or 0),
            filamentGrams=float(data.get("filamentGrams") or data.get("filament_grams") or 0.0),
            toolChangeCount=int(data.get("toolChangeCount") or data.get("tool_change_count") or 0),
            perFilament=[PerFilamentStats.from_dict(f) for f in raw_per_fil],
            modelFilamentGrams=data.get("modelFilamentGrams"),
            supportFilamentGrams=data.get("supportFilamentGrams"),
            purgeFilamentGrams=data.get("purgeFilamentGrams"),
            towerFilamentGrams=data.get("towerFilamentGrams"),
            metricSources=data.get("metricSources") or data.get("metric_sources") or {},
            rawStatistics=data.get("rawStatistics") or data.get("raw_statistics") or {},
        )


@dataclass
class UniversalSliceResult:
    adapter: str
    slicerName: str
    slicerVersion: str
    modelHash: str
    jobId: str
    dimensions: SliceDimensions
    printTimeSeconds: int
    filamentGrams: float
    toolChangeCount: int
    perFilament: List[PerFilamentStats]
    artifact: SliceArtifact
    success: bool = True
    modelFilamentGrams: Optional[float] = None
    supportFilamentGrams: Optional[float] = None
    purgeFilamentGrams: Optional[float] = None
    towerFilamentGrams: Optional[float] = None
    filamentMm: Optional[float] = None
    plateCount: int = 1
    activeEnvelope: Optional[Dict[str, float]] = None
    rawStatistics: Optional[Dict[str, Any]] = None
    plates: List[PlateResult] = field(default_factory=list)
    metricSources: Dict[str, str] = field(default_factory=dict)
    diagnostics: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    errorCode: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize into clean dictionary compatible with existing backend flows."""
        per_fil_dicts = [f.to_dict() for f in self.perFilament]
        dims_dict = self.dimensions.to_dict()

        hours = round(self.printTimeSeconds / 3600.0, 3)
        minutes = round(self.printTimeSeconds / 60.0, 2)
        hours_part = self.printTimeSeconds // 3600
        mins_part = (self.printTimeSeconds % 3600) // 60
        secs_part = self.printTimeSeconds % 60
        raw_time_str = f"{hours_part}h {mins_part}m {secs_part}s"

        stats_dict = {
            "filament_grams": self.filamentGrams,
            "model_filament_grams": self.modelFilamentGrams,
            "support_filament_grams": self.supportFilamentGrams,
            "purge_filament_grams": self.purgeFilamentGrams,
            "tower_filament_grams": self.towerFilamentGrams,
            "filament_mm": self.filamentMm or 0.0,
            "print_time_seconds": self.printTimeSeconds,
            "print_time_minutes": minutes,
            "print_time_hours": hours,
            "raw_time_string": raw_time_str,
            "plate_count": self.plateCount,
            "tool_change_count": self.toolChangeCount,
            "per_filament": per_fil_dicts,
            "plates": [p.to_dict() for p in self.plates],
            "metric_sources": self.metricSources,
            "diagnostics": self.diagnostics,
            "production_verification_status": "verified" if self.success else "failed",
        }
        if self.rawStatistics:
            for k, v in self.rawStatistics.items():
                if k not in stats_dict:
                    stats_dict[k] = v

        return {
            "success": self.success,
            "adapter": self.adapter,
            "slicer_executable": self.adapter,
            "slicer_version": self.slicerVersion,
            "slicerName": self.slicerName,
            "slicerVersion": self.slicerVersion,
            "modelHash": self.modelHash,
            "jobId": self.jobId,
            "dimensions": dims_dict,
            "active_envelope": self.activeEnvelope,
            "statistics": stats_dict,
            "filamentGrams": self.filamentGrams,
            "filament_grams": self.filamentGrams,
            "model_filament_grams": self.modelFilamentGrams,
            "support_filament_grams": self.supportFilamentGrams,
            "purge_filament_grams": self.purgeFilamentGrams,
            "tower_filament_grams": self.towerFilamentGrams,
            "printTimeSeconds": self.printTimeSeconds,
            "print_time_seconds": self.printTimeSeconds,
            "toolChangeCount": self.toolChangeCount,
            "tool_change_count": self.toolChangeCount,
            "plateCount": self.plateCount,
            "plate_count": self.plateCount,
            "per_filament": per_fil_dicts,
            "perFilament": per_fil_dicts,
            "plates": [p.to_dict() for p in self.plates],
            "metricSources": self.metricSources,
            "metric_sources": self.metricSources,
            "diagnostics": self.diagnostics,
            "gcode_hash": self.artifact.gcodeHash or "",
            "gcode_reference": self.artifact.gcodeReference or "",
            "artifact": self.artifact.to_dict(),
            "production_verification_status": "verified" if self.success else "failed",
            "error": self.error,
            "error_code": self.errorCode,
        }

    # Dict-like compatibility interface
    def __getitem__(self, key: str) -> Any:
        return self.to_dict()[key]

    def __contains__(self, key: str) -> bool:
        return key in self.to_dict()

    def get(self, key: str, default: Any = None) -> Any:
        return self.to_dict().get(key, default)

    @classmethod
    def from_dict(cls, data: Dict[str, Any], model_hash: str = "", job_id: str = "") -> "UniversalSliceResult":
        """Construct a UniversalSliceResult from a dictionary representation."""
        stats = data.get("statistics") or {}

        # Dimensions
        raw_dims = data.get("dimensions") or stats.get("dimensions") or {}
        dims = SliceDimensions.from_dict(raw_dims)

        # Filament weight
        fil_g = float(
            data.get("filamentGrams")
            if data.get("filamentGrams") is not None
            else (stats.get("filament_grams") if stats.get("filament_grams") is not None else 0.0)
        )

        # Model / Support / Purge / Tower filament
        mod_g = data.get("model_filament_grams")
        if mod_g is None:
            mod_g = stats.get("model_filament_grams")
        mod_g = float(mod_g) if mod_g is not None else None

        sup_g = data.get("support_filament_grams")
        if sup_g is None:
            sup_g = stats.get("support_filament_grams")
        sup_g = float(sup_g) if sup_g is not None else None

        purg_g = data.get("purge_filament_grams")
        if purg_g is None:
            purg_g = stats.get("purge_filament_grams")
        purg_g = float(purg_g) if purg_g is not None else None

        tow_g = data.get("tower_filament_grams")
        if tow_g is None:
            tow_g = stats.get("tower_filament_grams")
        tow_g = float(tow_g) if tow_g is not None else None

        fil_mm = data.get("filamentMm") or stats.get("filament_mm")
        fil_mm = float(fil_mm) if fil_mm is not None else None

        # Print time
        time_s = int(
            data.get("printTimeSeconds")
            if data.get("printTimeSeconds") is not None
            else (stats.get("print_time_seconds") if stats.get("print_time_seconds") is not None else 0)
        )

        # Tool changes
        tc = int(
            data.get("toolChangeCount")
            if data.get("toolChangeCount") is not None
            else (stats.get("tool_change_count") if stats.get("tool_change_count") is not None else 0)
        )

        # Per filament records
        raw_per_fil = data.get("perFilament") or data.get("per_filament") or stats.get("per_filament") or []
        per_fil = [PerFilamentStats.from_dict(f) for f in raw_per_fil]
        if not per_fil and fil_g > 0:
            per_fil = [
                PerFilamentStats(
                    filamentIndex=1,
                    colorHex="#FFFFFF",
                    materialType="PLA",
                    totalGrams=fil_g,
                    modelGrams=mod_g if mod_g is not None else fil_g,
                    purgeGrams=purg_g or 0.0,
                    towerGrams=tow_g or 0.0,
                )
            ]

        # Artifact
        art_data = data.get("artifact") or {
            "gcodeReference": data.get("gcode_reference") or stats.get("gcode_reference"),
            "gcodeHash": data.get("gcode_hash") or stats.get("gcode_hash"),
            "resultReference": data.get("result_reference") or stats.get("result_reference"),
        }
        artifact = SliceArtifact.from_dict(art_data)

        raw_plates = data.get("plates") or stats.get("plates") or []
        plates = [PlateResult.from_dict(p) for p in raw_plates]

        m_hash = data.get("modelHash") or model_hash or ""
        j_id = data.get("jobId") or job_id or ""

        adapter_name = (
            data.get("adapter")
            or data.get("slicer_executable")
            or (stats.get("slicer_executable") if isinstance(stats, dict) else None)
            or "prusaslicer"
        )
        slicer_version = (
            data.get("slicerVersion")
            or data.get("slicer_version")
            or (stats.get("slicer_version") if isinstance(stats, dict) else None)
            or data.get("version")
            or "2.9.0"
        )
        slicer_name = data.get("slicerName") or (
            "BambuStudio" if "bambu" in adapter_name.lower() else "PrusaSlicer"
        )

        return cls(
            adapter=adapter_name,
            slicerName=slicer_name,
            slicerVersion=slicer_version,
            modelHash=m_hash,
            jobId=j_id,
            dimensions=dims,
            printTimeSeconds=time_s,
            filamentGrams=fil_g,
            toolChangeCount=tc,
            perFilament=per_fil,
            artifact=artifact,
            success=bool(data.get("success", True)),
            modelFilamentGrams=mod_g,
            supportFilamentGrams=sup_g,
            purgeFilamentGrams=purg_g,
            towerFilamentGrams=tow_g,
            filamentMm=fil_mm,
            plateCount=int(data.get("plateCount") or stats.get("plate_count", 1)),
            activeEnvelope=data.get("active_envelope") or data.get("activeEnvelope"),
            rawStatistics=stats,
            plates=plates,
            metricSources=data.get("metricSources") or data.get("metric_sources") or stats.get("metric_sources") or {},
            diagnostics=data.get("diagnostics") or stats.get("diagnostics") or {},
            error=data.get("error"),
            errorCode=data.get("error_code") or data.get("errorCode"),
        )
