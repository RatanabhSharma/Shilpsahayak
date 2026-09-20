import zipfile
import xml.etree.ElementTree as ET
import json

file_path = r'D:\Shilp buss\Supabase\New folder\Shilpsahayak\slicer-service\app\storage\feab0661-dfd4-4e79-8e2c-1f85943dd198_Dragon_Lamp_Update_03-29-2026.3mf'
with zipfile.ZipFile(file_path, 'r') as z:
    ms_data = z.read('Metadata/model_settings.config')
    ms_tree = ET.fromstring(ms_data)
    
    plates = ms_tree.findall('.//plate')
    print(f'Total plates: {len(plates)}')
    
    for i, plate in enumerate(plates):
        print(f'Plate {i+1}:')
        instances = plate.findall('.//model_instance')
        for inst in instances:
            obj_id_node = inst.find('./metadata[@key="object_id"]')
            inst_id_node = inst.find('./metadata[@key="instance_id"]')
            o_id = obj_id_node.attrib.get('value') if obj_id_node is not None else None
            i_id = inst_id_node.attrib.get('value') if inst_id_node is not None else None
            print(f'  Instance - obj: {o_id}, inst: {i_id}')
            
    objects = ms_tree.findall('.//object')
    print('\nObjects:')
    for obj in objects:
        obj_id = obj.attrib.get('id')
        ext = obj.find('./metadata[@key="extruder"]')
        ext_val = ext.attrib.get('value') if ext is not None else 'None'
        print(f'  Object {obj_id} - extruder: {ext_val}')
        for part in obj.findall('.//part'):
            p_id = part.attrib.get('id')
            p_ext = part.find('./metadata[@key="extruder"]')
            p_ext_val = p_ext.attrib.get('value') if p_ext is not None else 'None'
            print(f'    Part {p_id} - extruder: {p_ext_val}')

