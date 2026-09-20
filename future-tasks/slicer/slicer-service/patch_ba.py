import re
import os

with open('app/slicer_adapters/bambu_adapter.py', 'r') as f:
    c = f.read()

c = c.replace(
    'production_params: Optional[Dict[str, Any]] = None,',
    'production_params: Optional[Dict[str, Any]] = None,\n        production_profiles: Optional[list] = None,'
)

c = c.replace(
    'color_analysis: Optional[Dict[str, Any]] = None,\n    ) -> Dict[str, Any]:',
    'color_analysis: Optional[Dict[str, Any]] = None,\n        production_profiles: Optional[list] = None,\n    ) -> Dict[str, Any]:'
)

new_conversion_block = """                # MULTI-PLATE GENERIC CONVERSION PATH
                try:
                    from app.slicer_adapters.convert_3mf import extract_3mf_plates
                    plates = extract_3mf_plates(working_copy, temp_dir)
                    if not plates:
                        raise ValueError("No plates extracted")
                    
                    plate_results = []
                    total_stats = {
                        "filament_grams": 0.0,
                        "print_time_seconds": 0,
                    }
                    
                    route = (production_params or {}).get("route")
                    if not production_profiles:
                        raise ValueError("No production_profiles provided to adapter")
                        
                    for p in plates:
                        if p["multi_color_lost"] and route == "multicolor":
                            return {
                                "success": False,
                                "error_code": "MANUAL_REVIEW_MULTICOLOR_LOST",
                                "error": "Multicolor plate requires color preservation, which generic pipeline cannot reliably provide.",
                                "adapter": "bambu_studio_cli",
                            }
                        
                        valid_printers = []
                        for prof in production_profiles:
                            if prof.get("buildVolumeX", 256) >= p["dimensions"]["x"] and \\
                               prof.get("buildVolumeY", 256) >= p["dimensions"]["y"] and \\
                               prof.get("buildVolumeZ", 256) >= p["dimensions"]["z"]:
                                valid_printers.append(prof)
                                
                        if not valid_printers:
                            return {
                                "success": False,
                                "error_code": "MODEL_TOO_LARGE",
                                "error": f"Plate {p['plate_id']} dimensions exceed all enabled production printers.",
                                "adapter": "bambu_studio_cli",
                            }
                            
                        # Sort to pick smallest volume
                        valid_printers.sort(key=lambda x: x.get("buildVolumeX", 256)*x.get("buildVolumeY", 256)*x.get("buildVolumeZ", 256))
                        selected_printer = valid_printers[0]
                        
                        plate_temp_dir = os.path.join(temp_dir, f"plate_{p['plate_id']}")
                        os.makedirs(plate_temp_dir, exist_ok=True)
                        
                        from app.slicer_adapters.bambu_adapter import find_bambu_resource_file
                        machine_settings_path = find_bambu_resource_file(selected_printer.get("machineProfileFile"))
                        process_settings_path = find_bambu_resource_file(selected_printer.get("processProfileFile"))
                        filament_paths = [find_bambu_resource_file(f) for f in selected_printer.get("filamentProfileFiles", [])]
                        
                        cmd = [
                            slicer_exe,
                            "--slice", "0",
                            "--arrange", "1",
                            "--ensure-on-bed",
                            "--outputdir", plate_temp_dir,
                            "--export-slicedata", plate_temp_dir,
                        ]
                        
                        settings_to_load = [path for path in (machine_settings_path, process_settings_path) if path]
                        if settings_to_load:
                            for s in settings_to_load:
                                cmd.extend(["--load-settings", s])
                                
                        for f in filament_paths:
                            if f: cmd.extend(["--load-filaments", f])
                            
                        cmd.append(p["extracted_obj_path"])
                        
                        logger.info(f"Slicing plate {p['plate_id']} with printer {selected_printer.get('displayName')}")
                        import subprocess, json
                        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=plate_temp_dir)
                        if res.returncode != 0:
                            return {
                                "success": False,
                                "error_code": "SLICER_EXECUTION_ERROR",
                                "error": f"Plate {p['plate_id']} slice failed with code {res.returncode}",
                                "adapter": "bambu_studio_cli",
                            }
                            
                        result_json_path = os.path.join(plate_temp_dir, "result.json")
                        if not os.path.exists(result_json_path):
                            return {
                                "success": False,
                                "error_code": "SLICER_RESULT_MISSING",
                                "error": "result.json not found for plate",
                                "adapter": "bambu_studio_cli"
                            }
                            
                        with open(result_json_path, 'r') as rf:
                            plate_res = json.load(rf)
                            
                        plate_g = plate_res.get("filament_weight", 0.0)
                        plate_s = plate_res.get("time_estimate", 0)
                        
                        total_stats["filament_grams"] += plate_g
                        total_stats["print_time_seconds"] += plate_s
                        
                        plate_results.append({
                            "plate_id": p["plate_id"],
                            "production_printer": selected_printer,
                            "dimensions": p["dimensions"],
                            "statistics": {
                                "filament_grams": plate_g,
                                "print_time_seconds": plate_s,
                            },
                            "slicer_result": plate_res
                        })
                        
                    statistics = {
                        "filament_grams": total_stats["filament_grams"],
                        "print_time_seconds": total_stats["print_time_seconds"],
                        "print_time_hours": round(total_stats["print_time_seconds"] / 3600.0, 3),
                        "plate_count": len(plates),
                        "metric_sources": {"total_filament": "slicer_result", "print_time": "slicer_result"}
                    }
                    return {
                        "success": True,
                        "adapter": "bambu_studio_cli",
                        "modelHash": model_hash,
                        "jobId": job_id,
                        "dimensions": dims,
                        "printTimeSeconds": total_stats["print_time_seconds"],
                        "filamentGrams": total_stats["filament_grams"],
                        "plates": plate_results,
                        "rawStatistics": statistics,
                        "source_project": source_project,
                        "model_path": model_path,
                        "statistics": statistics
                    }
                        
                except Exception as e:
                    logger.error(f"Failed multi-plate conversion: {e}")
                    return {
                        "success": False,
                        "error_code": "3MF_EXTRACTION_ERROR",
                        "error": str(e),
                        "adapter": "bambu_studio_cli"
                    }
"""

c = re.sub(r'# GENERIC CONVERSION PATH.*?except Exception as e:.*?logger\.error\([^)]+\)', new_conversion_block, c, flags=re.DOTALL)

with open('app/slicer_adapters/bambu_adapter.py', 'w') as f:
    f.write(c)

