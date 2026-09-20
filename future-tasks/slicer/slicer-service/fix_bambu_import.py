with open('app/slicer_adapters/bambu_adapter.py', 'r') as f:
    c = f.read()

old_block = """                        from app.slicer_adapters.bambu_adapter import find_bambu_resource_file
                        machine_settings_path = find_bambu_resource_file(selected_printer.get("machineProfileFile"))
                        process_settings_path = find_bambu_resource_file(selected_printer.get("processProfileFile"))
                        filament_paths = [find_bambu_resource_file(f) for f in selected_printer.get("filamentProfileFiles", [])]"""

new_block = """                        machine_settings_path = find_bambu_resource_file("machine", selected_printer.get("machineProfileFile"))
                        process_settings_path = find_bambu_resource_file("process", selected_printer.get("processProfileFile"))
                        filament_paths = [find_bambu_resource_file("filament", f) for f in selected_printer.get("filamentProfileFiles", [])]"""

if old_block in c:
    c = c.replace(old_block, new_block)
    with open('app/slicer_adapters/bambu_adapter.py', 'w') as f:
        f.write(c)
    print("Fixed bambu_adapter.py")
else:
    print("Block not found!")

