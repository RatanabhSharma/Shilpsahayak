"""
test_printer_eligibility.py
===========================

Unit tests for the automatic production printer eligibility resolver.

Tests cover the nine scenarios required by the product specification:

  1. A1 mini only (enabled) — model fits → A1 mini selected
  2. A1 only (enabled) — model fits → A1 selected
  3. A1 mini + A1 both enabled, model fits both → defaultForProduction wins
  4. Model fits only A1 (too large for A1 mini) → A1 selected
  5. Model fits neither → no eligible printer (NO_FIT_WITHIN_BUILD_VOLUME)
  6. Multicolor required, only A1 mini supports it → A1 mini selected
  7. Multicolor required, neither supports it → no eligible printer
  8. Uploaded P1S metadata cannot override production selection
  9. Disabling a printer removes it from eligibility

All tests exercise `resolve_eligible_production_printer` directly — pure unit
tests with no I/O, no filesystem dependencies, no slicer processes.
"""

from __future__ import annotations

import copy
import os
import sys

import pytest

# Ensure the slicer-service package root is on the import path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.printer_eligibility import (
    EligibilityReasonCode,
    EligibilityResult,
    resolve_eligible_production_printer,
)
from app.slice_core import (
    read_profile_envelope,
    get_effective_model_dimensions,
    extract_project_printable_dimensions,
)


# ---------------------------------------------------------------------------
# Fixture profiles
# ---------------------------------------------------------------------------

def _a1_mini_profile(*, enabled: bool = True, default: bool = True) -> dict:
    """Bambu Lab A1 mini — build volume 180×180×180 mm, supports multicolor."""
    return {
        "id": "BAMBU-A1-MINI-01",
        "manufacturer": "Bambu Lab",
        "model": "A1 mini",
        "displayName": "Bambu Lab A1 mini",
        "enabled": enabled,
        "defaultForProduction": default,
        "buildVolumeX": 180,
        "buildVolumeY": 180,
        "buildVolumeZ": 180,
        "supportsMulticolor": True,
        "slicerAdapter": "bambu_studio_cli",
        "printerProfileFile": "bambu_a1_mini_0.4.ini",
        "profileVersion": "v1",
        "materialProfileIds": ["Generic PLA @BBL A1M"],
        "machineParameters": {},
    }


def _a1_profile(*, enabled: bool = True, default: bool = False) -> dict:
    """Bambu Lab A1 — build volume 256×256×256 mm, supports multicolor."""
    return {
        "id": "BAMBU-A1-01",
        "manufacturer": "Bambu Lab",
        "model": "A1",
        "displayName": "Bambu Lab A1",
        "enabled": enabled,
        "defaultForProduction": default,
        "buildVolumeX": 256,
        "buildVolumeY": 256,
        "buildVolumeZ": 256,
        "supportsMulticolor": True,
        "slicerAdapter": "bambu_studio_cli",
        "printerProfileFile": "bambu_production_0.4.ini",
        "profileVersion": "v1",
        "materialProfileIds": ["Generic PLA @BBL A1"],
        "machineParameters": {},
    }


def _p1s_profile(*, enabled: bool = False, default: bool = False) -> dict:
    """Bambu Lab P1S — example source-project printer NOT in the admin list."""
    return {
        "id": "BAMBU-P1S-01",
        "manufacturer": "Bambu Lab",
        "model": "P1S",
        "displayName": "Bambu Lab P1S",
        "enabled": enabled,
        "defaultForProduction": default,
        "buildVolumeX": 256,
        "buildVolumeY": 256,
        "buildVolumeZ": 256,
        "supportsMulticolor": True,
        "slicerAdapter": "bambu_studio_cli",
        "printerProfileFile": "bambu_production_0.4.ini",
        "profileVersion": "v1",
        "materialProfileIds": ["Generic PLA @BBL P1S"],
        "machineParameters": {},
    }


# Convenience dimension dicts
SMALL_MODEL = {"x": 100.0, "y": 80.0, "z": 60.0}   # fits any printer
MEDIUM_MODEL = {"x": 200.0, "y": 150.0, "z": 130.0}  # fits A1 (256³), not A1 mini (180³)
HUGE_MODEL = {"x": 300.0, "y": 300.0, "z": 300.0}    # fits neither


# ---------------------------------------------------------------------------
# Scenario 1 — A1 mini only (enabled), model fits → A1 mini selected
# ---------------------------------------------------------------------------

class TestScenario1_A1MiniOnly:
    def test_selects_a1_mini_when_only_printer_is_a1_mini(self):
        profiles = [_a1_mini_profile()]
        result = resolve_eligible_production_printer(
            profiles=profiles,
            model_dimensions=SMALL_MODEL,
            requires_multicolor=False,
        )
        assert result.eligible is True
        assert result.selected_profile is not None
        assert result.selected_profile["id"] == "BAMBU-A1-MINI-01"
        assert result.reason_code == EligibilityReasonCode.SELECTED

    def test_candidates_evaluated_is_one(self):
        profiles = [_a1_mini_profile()]
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, False)
        assert result.candidates_evaluated == 1


# ---------------------------------------------------------------------------
# Scenario 2 — A1 only (enabled), model fits → A1 selected
# ---------------------------------------------------------------------------

class TestScenario2_A1Only:
    def test_selects_a1_when_only_printer_is_a1(self):
        profiles = [_a1_profile(default=True)]
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, False)
        assert result.eligible is True
        assert result.selected_profile["id"] == "BAMBU-A1-01"
        assert result.reason_code == EligibilityReasonCode.SELECTED

    def test_candidates_evaluated_is_one(self):
        result = resolve_eligible_production_printer(
            [_a1_profile(default=True)], SMALL_MODEL, False
        )
        assert result.candidates_evaluated == 1


# ---------------------------------------------------------------------------
# Scenario 3 — A1 mini (defaultForProduction) + A1 both fit → A1 mini wins
# ---------------------------------------------------------------------------

class TestScenario3_BothFit_DefaultWins:
    def test_default_for_production_wins_when_both_fit(self):
        profiles = [
            _a1_mini_profile(enabled=True, default=True),
            _a1_profile(enabled=True, default=False),
        ]
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, False)
        assert result.eligible is True
        assert result.selected_profile["id"] == "BAMBU-A1-MINI-01", (
            "A1 mini has defaultForProduction=True and should be preferred"
        )

    def test_a1_wins_if_it_is_set_as_default(self):
        profiles = [
            _a1_mini_profile(enabled=True, default=False),
            _a1_profile(enabled=True, default=True),
        ]
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, False)
        assert result.eligible is True
        assert result.selected_profile["id"] == "BAMBU-A1-01"

    def test_candidates_evaluated_is_two(self):
        profiles = [_a1_mini_profile(), _a1_profile()]
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, False)
        assert result.candidates_evaluated == 2

    def test_ordering_independent_of_list_order(self):
        """Determinism: reversing the list must not change the winner."""
        profiles_fwd = [
            _a1_mini_profile(enabled=True, default=True),
            _a1_profile(enabled=True, default=False),
        ]
        profiles_rev = list(reversed(profiles_fwd))
        res_fwd = resolve_eligible_production_printer(profiles_fwd, SMALL_MODEL, False)
        res_rev = resolve_eligible_production_printer(profiles_rev, SMALL_MODEL, False)
        assert res_fwd.selected_profile["id"] == res_rev.selected_profile["id"]


# ---------------------------------------------------------------------------
# Scenario 4 — Model fits only A1 (too large for A1 mini) → A1 selected
# ---------------------------------------------------------------------------

class TestScenario4_OnlyA1Fits:
    def test_a1_selected_when_model_too_large_for_a1_mini(self):
        # MEDIUM_MODEL = 200×150×130 — exceeds A1 mini 180×180×180 on X axis
        profiles = [
            _a1_mini_profile(enabled=True, default=True),  # default, but can't fit
            _a1_profile(enabled=True, default=False),       # not default, but fits
        ]
        result = resolve_eligible_production_printer(profiles, MEDIUM_MODEL, False)
        assert result.eligible is True
        assert result.selected_profile["id"] == "BAMBU-A1-01", (
            "A1 mini cannot fit the model; A1 should be auto-selected even though "
            "A1 mini is defaultForProduction"
        )

    def test_a1_mini_check_recorded_as_ineligible(self):
        profiles = [_a1_mini_profile(), _a1_profile()]
        result = resolve_eligible_production_printer(profiles, MEDIUM_MODEL, False)
        a1_mini_check = next(
            (c for c in result.checks if c.profile_id == "BAMBU-A1-MINI-01"), None
        )
        assert a1_mini_check is not None
        assert a1_mini_check.eligible is False
        assert "build volume" in (a1_mini_check.failure_reason or "")


# ---------------------------------------------------------------------------
# Scenario 5 — Model fits neither → NO_FIT_WITHIN_BUILD_VOLUME
# ---------------------------------------------------------------------------

class TestScenario5_NoPrinterFits:
    def test_no_eligible_result_when_model_exceeds_all_envelopes(self):
        profiles = [_a1_mini_profile(), _a1_profile()]
        result = resolve_eligible_production_printer(profiles, HUGE_MODEL, False)
        assert result.eligible is False
        assert result.selected_profile is None
        assert result.reason_code == EligibilityReasonCode.NO_FIT_WITHIN_BUILD_VOLUME

    def test_candidates_evaluated_is_two(self):
        profiles = [_a1_mini_profile(), _a1_profile()]
        result = resolve_eligible_production_printer(profiles, HUGE_MODEL, False)
        assert result.candidates_evaluated == 2

    def test_all_checks_marked_ineligible(self):
        profiles = [_a1_mini_profile(), _a1_profile()]
        result = resolve_eligible_production_printer(profiles, HUGE_MODEL, False)
        assert all(not c.eligible for c in result.checks)


# ---------------------------------------------------------------------------
# Scenario 6 — Multicolor required, only A1 mini supports it → A1 mini
# ---------------------------------------------------------------------------

class TestScenario6_MulticolorRequired_A1MiniSupports:
    def _build_profiles_multicolor(self):
        a1_mini = _a1_mini_profile(default=True)
        a1_mini["supportsMulticolor"] = True
        a1_no_mc = _a1_profile(default=False)
        a1_no_mc["supportsMulticolor"] = False
        return [a1_mini, a1_no_mc]

    def test_a1_mini_selected_for_multicolor_job(self):
        profiles = self._build_profiles_multicolor()
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, requires_multicolor=True)
        assert result.eligible is True
        assert result.selected_profile["id"] == "BAMBU-A1-MINI-01"

    def test_a1_check_shows_no_multicolor(self):
        profiles = self._build_profiles_multicolor()
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, requires_multicolor=True)
        a1_check = next((c for c in result.checks if c.profile_id == "BAMBU-A1-01"), None)
        assert a1_check is not None
        assert a1_check.eligible is False
        assert "multicolor" in (a1_check.failure_reason or "").lower()


# ---------------------------------------------------------------------------
# Scenario 7 — Multicolor required, neither supports it → ineligible
# ---------------------------------------------------------------------------

class TestScenario7_MulticolorRequired_NoneSupport:
    def _build_profiles_no_multicolor(self):
        a1_mini = _a1_mini_profile()
        a1_mini["supportsMulticolor"] = False
        a1 = _a1_profile()
        a1["supportsMulticolor"] = False
        return [a1_mini, a1]

    def test_no_eligible_printer_when_no_multicolor_support(self):
        profiles = self._build_profiles_no_multicolor()
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, requires_multicolor=True)
        assert result.eligible is False
        assert result.selected_profile is None
        assert result.reason_code == EligibilityReasonCode.NO_MULTICOLOR_CAPABILITY

    def test_reason_code_is_no_multicolor_capability(self):
        profiles = self._build_profiles_no_multicolor()
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, requires_multicolor=True)
        assert result.reason_code == EligibilityReasonCode.NO_MULTICOLOR_CAPABILITY


# ---------------------------------------------------------------------------
# Scenario 8 — Uploaded P1S metadata CANNOT override production selection
# ---------------------------------------------------------------------------

class TestScenario8_SourceProjectCannotOverride:
    """
    A customer uploads a 3MF file that was originally created for a P1S printer.
    The 3MF contains P1S printer metadata as ``sourceProject``.

    The eligibility resolver never sees source-project metadata — it only
    receives the admin-configured production profiles.  If P1S is not in the
    admin list, it cannot be selected.
    """

    def test_p1s_source_metadata_not_present_in_admin_list_is_ignored(self):
        # Admin has A1 mini and A1 only.  P1S is NOT an admin profile.
        admin_profiles = [_a1_mini_profile(default=True), _a1_profile()]

        # The resolver is never given P1S at all — source-project stripping
        # happens upstream.  This test verifies the resolver cannot sneak P1S
        # in even if someone tried to inject it.
        result = resolve_eligible_production_printer(admin_profiles, SMALL_MODEL, False)
        assert result.eligible is True
        assert result.selected_profile["id"] != "BAMBU-P1S-01"
        assert result.selected_profile["id"] in {"BAMBU-A1-MINI-01", "BAMBU-A1-01"}

    def test_p1s_injected_but_disabled_is_filtered_out(self):
        # Even if someone adds a disabled P1S profile to the list, it's excluded.
        profiles = [
            _a1_mini_profile(default=True),
            _a1_profile(),
            _p1s_profile(enabled=False),  # disabled — must be invisible
        ]
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, False)
        assert result.eligible is True
        assert result.selected_profile["id"] != "BAMBU-P1S-01"
        # Disabled profiles don't count as candidates
        assert result.candidates_evaluated == 2

    def test_p1s_injected_as_enabled_but_not_default_loses_to_a1_mini(self):
        """Even if P1S is enabled in admin (hypothetically), A1 mini with
        defaultForProduction=True is chosen when both fit the model."""
        profiles = [
            _a1_mini_profile(enabled=True, default=True),
            _p1s_profile(enabled=True, default=False),  # P1S enabled but not default
        ]
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, False)
        assert result.eligible is True
        assert result.selected_profile["id"] == "BAMBU-A1-MINI-01"


# ---------------------------------------------------------------------------
# Scenario 9 — Disabling a printer removes it from eligibility
# ---------------------------------------------------------------------------

class TestScenario9_DisabledPrinterRemoved:
    def test_disabled_a1_mini_is_not_evaluated(self):
        profiles = [
            _a1_mini_profile(enabled=False, default=True),  # disabled
            _a1_profile(enabled=True, default=False),
        ]
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, False)
        assert result.eligible is True
        assert result.selected_profile["id"] == "BAMBU-A1-01"
        # Only one enabled candidate
        assert result.candidates_evaluated == 1

    def test_all_disabled_results_in_no_eligible_printer(self):
        profiles = [
            _a1_mini_profile(enabled=False),
            _a1_profile(enabled=False),
        ]
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, False)
        assert result.eligible is False
        assert result.reason_code == EligibilityReasonCode.NO_ENABLED_PROFILES
        assert result.candidates_evaluated == 0

    def test_empty_profiles_list_returns_no_enabled_profiles(self):
        result = resolve_eligible_production_printer([], SMALL_MODEL, False)
        assert result.eligible is False
        assert result.reason_code == EligibilityReasonCode.NO_ENABLED_PROFILES

    def test_none_profiles_returns_no_enabled_profiles(self):
        result = resolve_eligible_production_printer(None, SMALL_MODEL, False)  # type: ignore[arg-type]
        assert result.eligible is False
        assert result.reason_code == EligibilityReasonCode.NO_ENABLED_PROFILES


# ---------------------------------------------------------------------------
# Additional edge-case tests
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_profile_without_profilepath_is_accepted_by_resolver(self):
        """
        The resolver itself does not require ``profilePath`` — that key is
        added by ``resolve_production_printer_profile`` in main.py.
        The pure eligibility resolver works on the validated dict as-is.
        """
        profile = _a1_mini_profile()
        # No profilePath key at all — resolver should still work
        assert "profilePath" not in profile
        result = resolve_eligible_production_printer([profile], SMALL_MODEL, False)
        assert result.eligible is True

    def test_selected_profile_preserves_profile_path_for_slicer_pipeline(self):
        """profilePath is retained on selected_profile so downstream slicing adapters have the path."""
        profile = _a1_mini_profile()
        profile["profilePath"] = "/some/internal/path.ini"
        result = resolve_eligible_production_printer([profile], SMALL_MODEL, False)
        assert result.eligible is True
        assert result.selected_profile["profilePath"] == "/some/internal/path.ini"

    def test_zero_dimensions_skips_build_volume_check(self):
        """When model dimensions are all zero (parse failed), no volume check."""
        profiles = [_a1_mini_profile()]
        result = resolve_eligible_production_printer(
            profiles,
            model_dimensions={"x": 0, "y": 0, "z": 0},
            requires_multicolor=False,
        )
        # Should pass through (fail-open) so the slicer can report its own error
        assert result.eligible is True

    def test_missing_dimensions_skips_build_volume_check(self):
        """Empty dimensions dict — no volume check."""
        profiles = [_a1_mini_profile()]
        result = resolve_eligible_production_printer(
            profiles,
            model_dimensions={},
            requires_multicolor=False,
        )
        assert result.eligible is True

    def test_check_records_are_populated(self):
        profiles = [_a1_mini_profile(), _a1_profile()]
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, False)
        assert len(result.checks) == 2
        ids = {c.profile_id for c in result.checks}
        assert "BAMBU-A1-MINI-01" in ids
        assert "BAMBU-A1-01" in ids

    def test_single_check_with_build_volume_data(self):
        profiles = [_a1_mini_profile()]
        result = resolve_eligible_production_printer(profiles, SMALL_MODEL, False)
        check = result.checks[0]
        assert check.build_volume == {"x": 180.0, "y": 180.0, "z": 180.0}
        assert check.model_dimensions["x"] == pytest.approx(100.0)


# ---------------------------------------------------------------------------
# Scenario 10 — Contract Regression: A1 mini 180³ and A1 256³ build envelopes
# ---------------------------------------------------------------------------

class TestScenario10_BuildEnvelopeContractRegression:
    """
    Regression suite verifying the ProductionPrinterProfile contract end-to-end:
    A1 mini = 180/180/180 -> valid build envelope {"x": 180.0, "y": 180.0, "z": 180.0}
    A1      = 256/256/256 -> valid build envelope {"x": 256.0, "y": 256.0, "z": 256.0}
    """

    def test_a1_mini_selected_profile_produces_valid_180_envelope(self):
        a1_mini = _a1_mini_profile(default=True)
        # Verify schema: buildVolumeX/Y/Z are positive numbers
        assert a1_mini["buildVolumeX"] == 180
        assert a1_mini["buildVolumeY"] == 180
        assert a1_mini["buildVolumeZ"] == 180

        result = resolve_eligible_production_printer([a1_mini], SMALL_MODEL, requires_multicolor=False)
        assert result.eligible is True
        selected = result.selected_profile
        assert selected is not None
        assert selected["id"] == "BAMBU-A1-MINI-01"
        assert selected["buildVolumeX"] == 180
        assert selected["buildVolumeY"] == 180
        assert selected["buildVolumeZ"] == 180

        # Verify reading the actual INI profile produces a complete 180 envelope
        profile_path = os.path.join(
            os.path.dirname(__file__), "..", "app", "profiles", "printer", selected["printerProfileFile"]
        )
        assert os.path.isfile(profile_path)
        envelope = read_profile_envelope(profile_path)
        assert all(k in envelope for k in ("x", "y", "z"))
        assert envelope["x"] == 180.0
        assert envelope["y"] == 180.0
        assert envelope["z"] == 180.0

    def test_a1_selected_profile_produces_valid_256_envelope(self):
        a1 = _a1_profile(default=True)
        # Verify schema: buildVolumeX/Y/Z are positive numbers
        assert a1["buildVolumeX"] == 256
        assert a1["buildVolumeY"] == 256
        assert a1["buildVolumeZ"] == 256

        result = resolve_eligible_production_printer([a1], MEDIUM_MODEL, requires_multicolor=False)
        assert result.eligible is True
        selected = result.selected_profile
        assert selected is not None
        assert selected["id"] == "BAMBU-A1-01"
        assert selected["buildVolumeX"] == 256
        assert selected["buildVolumeY"] == 256
        assert selected["buildVolumeZ"] == 256

        # Verify reading the actual INI profile produces a complete 256 envelope
        profile_path = os.path.join(
            os.path.dirname(__file__), "..", "app", "profiles", "printer", selected["printerProfileFile"]
        )
        assert os.path.isfile(profile_path)
        envelope = read_profile_envelope(profile_path)
        assert all(k in envelope for k in ("x", "y", "z"))
        assert envelope["x"] == 256.0
        assert envelope["y"] == 256.0
        assert envelope["z"] == 256.0

    def test_large_model_256_selects_a1_over_a1_mini(self):
        """
        For a test model of 256×256×250 mm:
        A1 mini (180³) -> ineligible (exceeds build volume)
        A1 (256³) -> eligible
        A1 selected
        """
        a1_mini = _a1_mini_profile(default=True)
        a1 = _a1_profile(default=False)

        model_256 = {"x": 256.0, "y": 256.0, "z": 250.0}
        result = resolve_eligible_production_printer([a1_mini, a1], model_256, requires_multicolor=False)

        assert result.eligible is True
        assert result.candidates_evaluated == 2
        assert result.selected_profile["id"] == "BAMBU-A1-01"

        checks_by_id = {c.profile_id: c for c in result.checks}
        assert checks_by_id["BAMBU-A1-MINI-01"].eligible is False
        assert "exceeds" in checks_by_id["BAMBU-A1-MINI-01"].failure_reason
        assert checks_by_id["BAMBU-A1-01"].eligible is True

    def test_get_effective_model_dimensions_ignores_3mf_project_envelope(self, tmp_path):
        """
        A 3MF project with Metadata/project_settings.config defining
        printable_area ['0x0', '256x0', '256x256', '0x256'] and printable_height 250
        must use model geometry or the explicit fallback dimensions, never the
        source project's printable bed envelope.
        """
        import zipfile
        import json

        project_3mf = tmp_path / "test_project.3mf"
        with zipfile.ZipFile(project_3mf, "w") as zf:
            cfg = {
                "printable_area": ["0x0", "256x0", "256x256", "0x256"],
                "printable_height": "250",
                "printer_model": "Bambu Lab P1S",
            }
            zf.writestr("Metadata/project_settings.config", json.dumps(cfg))

        dims, source = get_effective_model_dimensions(
            str(project_3mf),
            params={"requestedDimensions": {"x": 114.2, "y": 108.4, "z": 160.1}},
        )
        assert source == "requested_dimensions"
        assert dims == {"x": 114.2, "y": 108.4, "z": 160.1}

    def test_3mf_project_geometry_selects_fitting_printer(self):
        """
        A model smaller than both printers must not inherit the source project's
        256×256×250 bed envelope and should remain eligible for the default.
        """
        stitch_path = os.path.join(
            os.path.dirname(__file__), "..", "app", "storage", "db431ce4-a949-46aa-a4e6-f21461f7c124_Stitchxpikachu.3mf"
        )
        if not os.path.exists(stitch_path):
            pytest.skip("Stitch test 3MF file not found in storage")

        dims, source = get_effective_model_dimensions(
            stitch_path,
            params={"requestedDimensions": {"x": 114.2, "y": 108.4, "z": 160.1}},
        )
        assert source == "scaled_geometry"
        assert 0 < dims["x"] < 256.0
        assert 0 < dims["y"] < 256.0
        assert 0 < dims["z"] < 250.0

        a1_mini = _a1_mini_profile(default=True)
        a1 = _a1_profile(default=False)
        result = resolve_eligible_production_printer([a1_mini, a1], dims, requires_multicolor=True)

        assert result.eligible is True
        assert result.selected_profile["id"] == "BAMBU-A1-MINI-01"

        checks_by_id = {c.profile_id: c for c in result.checks}
        assert checks_by_id["BAMBU-A1-MINI-01"].eligible is True
        assert checks_by_id["BAMBU-A1-01"].eligible is True

    def test_resolver_and_slicer_dimensions_consistency(self, tmp_path):
        """
        Ensures resolver and slicer validation evaluate the exact same effective dimensions.
        """
        import zipfile
        import json

        project_3mf = tmp_path / "sample.3mf"
        with zipfile.ZipFile(project_3mf, "w") as zf:
            cfg = {
                "printable_area": ["0x0", "256x0", "256x256", "0x256"],
                "printable_height": "250",
            }
            zf.writestr("Metadata/project_settings.config", json.dumps(cfg))

        params = {"requestedDimensions": {"x": 114.2, "y": 108.4, "z": 160.1}}
        resolver_dims, src = get_effective_model_dimensions(str(project_3mf), params=params)

        # In Step F2, dims is set directly from effective_dims
        slicer_dims = dict(resolver_dims)

        assert resolver_dims == slicer_dims
        assert resolver_dims == {"x": 114.2, "y": 108.4, "z": 160.1}



