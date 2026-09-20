"""
Comprehensive Phase 2A Automated Verification Test Runner:
Tests model intelligence classification, geometry verification, and slice statistics extraction
across STL, OBJ, standard 3MF, Slicer Project 3MF, and Sliced 3MF/G-code.
"""

import os
import json
from file_inspector import inspect_file
from slice_poc import run_slice_test

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_MODELS_DIR = os.path.join(BASE_DIR, "test_models")
PROFILE_INI = os.path.join(BASE_DIR, "profiles", "bambu_production_standard.ini")

def run_suite():
    print("================================================================")
    print(" SHILP STUDIO — PHASE 2A STANDALONE VERIFICATION SUITE")
    print("================================================================\n")

    models = [
        ("cube_20mm.stl", True),
        ("cube_20mm.obj", True),
        ("standard_cube.3mf", True),
        ("bambu_project.3mf", True),
        ("sliced_project.3mf", False),
        ("sample.gcode", False)
    ]

    results = []

    for filename, expected_sliceable in models:
        model_path = os.path.join(TEST_MODELS_DIR, filename)
        print(f"--> Testing Model: {filename}")

        # Step 1: Deep Content Inspection
        insp = inspect_file(model_path)
        classification = insp.get("classification")
        can_slice = insp.get("can_slice")
        format_detected = insp.get("detected_format")

        print(f"    Inspection: classification={classification}, format={format_detected}, can_slice={can_slice}")

        # Step 2: Slicing Execution (if sliceable)
        slice_result = None
        if can_slice:
            slice_result = run_slice_test(
                model_path=model_path,
                printer_ini=PROFILE_INI
            )
            if slice_result.get("success"):
                stats = slice_result["statistics"]
                print(f"    [SLICED OK] Filament: {stats['filament_grams']}g ({stats['filament_mm']}mm) | Time: {stats['raw_time_string']} ({stats['print_time_minutes']} mins)")
            else:
                print(f"    [SLICE FAILED] Error: {slice_result.get('error')}")
        else:
            print(f"    [REFUSED FROM SLICER AS EXPECTED] Message: {insp.get('message')}")

        print()
        results.append({
            "model": filename,
            "can_slice_detected": can_slice,
            "expected_sliceable": expected_sliceable,
            "classification": classification,
            "slice_success": slice_result.get("success") if slice_result else False,
            "stats": slice_result.get("statistics") if slice_result else None
        })

    print("================================================================")
    print(" SUMMARY OF PHASE 2A ACCEPTANCE GATES")
    print("================================================================")
    all_passed = True
    for r in results:
        status = "PASSED"
        if r["can_slice_detected"] != r["expected_sliceable"]:
            status = "FAILED"
            all_passed = False
        if r["expected_sliceable"] and not r["slice_success"]:
            status = "FAILED"
            all_passed = False
        print(f" - {r['model']:<20}: {status} (Class: {r['classification']})")

    print(f"\nOverall Phase 2A Test Status: {'ALL PASS' if all_passed else 'SOME TESTS FAILED'}")
    return all_passed

if __name__ == "__main__":
    import sys
    success = run_suite()
    sys.exit(0 if success else 1)
