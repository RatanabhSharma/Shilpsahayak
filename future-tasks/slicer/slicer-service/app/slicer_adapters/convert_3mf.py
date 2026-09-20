import xml.etree.ElementTree as ET
import zipfile
import os

def parse_matrix(matrix_str):
    if not matrix_str:
        return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]
    parts = list(map(float, matrix_str.split()))
    if len(parts) == 12:
        return [
            [parts[0], parts[1], parts[2], 0],
            [parts[3], parts[4], parts[5], 0],
            [parts[6], parts[7], parts[8], 0],
            [parts[9], parts[10], parts[11], 1]
        ]
    elif len(parts) == 16:
        return [
            [parts[0], parts[1], parts[2], parts[3]],
            [parts[4], parts[5], parts[6], parts[7]],
            [parts[8], parts[9], parts[10], parts[11]],
            [parts[12], parts[13], parts[14], parts[15]]
        ]
    return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]

def transform_point(p, m):
    x = p[0]*m[0][0] + p[1]*m[1][0] + p[2]*m[2][0] + m[3][0]
    y = p[0]*m[0][1] + p[1]*m[1][1] + p[2]*m[2][1] + m[3][1]
    z = p[0]*m[0][2] + p[1]*m[1][2] + p[2]*m[2][2] + m[3][2]
    return [x, y, z]

def mult_matrix(lm, cm):
    res_m = [[0]*4 for _ in range(4)]
    for i in range(4):
        for j in range(4):
            res_m[i][j] = sum(lm[i][k] * cm[k][j] for k in range(4))
    return res_m

def extract_3mf_plates(zip_path, temp_dir):
    with zipfile.ZipFile(zip_path, 'r') as z:
        model_files = [f for f in z.namelist() if f.endswith('.model') and f.startswith('3D/')]
        
        objects = {} 
        for mf in model_files:
            content = z.read(mf)
            root = ET.fromstring(content)
            for obj in root.findall('.//{*}object'):
                obj_id = obj.attrib.get('id')
                if not obj_id: continue
                
                mesh = obj.find('{*}mesh')
                comps = obj.find('{*}components')
                obj_data = {'vertices': [], 'triangles': [], 'components': []}
                
                if mesh is not None:
                    vertices = mesh.find('{*}vertices')
                    if vertices is not None:
                        for v in vertices.findall('{*}vertex'):
                            x = float(v.attrib.get('x', 0))
                            y = float(v.attrib.get('y', 0))
                            z_coord = float(v.attrib.get('z', 0))
                            obj_data['vertices'].append([x, y, z_coord])
                            
                    triangles = mesh.find('{*}triangles')
                    if triangles is not None:
                        for t in triangles.findall('{*}triangle'):
                            v1 = int(t.attrib.get('v1', 0))
                            v2 = int(t.attrib.get('v2', 0))
                            v3 = int(t.attrib.get('v3', 0))
                            obj_data['triangles'].append([v1, v2, v3])
                            
                if comps is not None:
                    for c in comps.findall('{*}component'):
                        cid = c.attrib.get('objectid')
                        transform = c.attrib.get('transform', '')
                        if cid:
                            obj_data['components'].append({
                                'objectid': cid,
                                'transform': parse_matrix(transform)
                            })
                objects[obj_id] = obj_data

        plates_def = []
        objects_extruders = {}
        
        if 'Metadata/model_settings.config' in z.namelist():
            ms_content = z.read('Metadata/model_settings.config')
            ms_root = ET.fromstring(ms_content)
            
            for obj in ms_root.findall('.//object'):
                oid = obj.attrib.get('id')
                exts = set()
                ext_meta = obj.find('./metadata[@key="extruder"]')
                if ext_meta is not None: exts.add(ext_meta.attrib.get('value'))
                for part in obj.findall('.//part'):
                    p_ext_meta = part.find('./metadata[@key="extruder"]')
                    if p_ext_meta is not None: exts.add(p_ext_meta.attrib.get('value'))
                if not exts: exts.add("1")
                objects_extruders[oid] = exts
                
            for plate_elem in ms_root.findall('.//plate'):
                plater_id_meta = plate_elem.find('.//metadata[@key="plater_id"]')
                plate_id = plater_id_meta.attrib.get('value') if plater_id_meta is not None else "1"
                
                instances = []
                plate_extruders = set()
                for inst in plate_elem.findall('.//model_instance'):
                    obj_meta = inst.find('.//metadata[@key="object_id"]')
                    inst_meta = inst.find('.//metadata[@key="instance_id"]')
                    if obj_meta is not None:
                        oid = obj_meta.attrib.get('value')
                        iid = int(inst_meta.attrib.get('value', '0')) if inst_meta is not None else 0
                        instances.append((oid, iid))
                        plate_extruders.update(objects_extruders.get(oid, set(["1"])))
                
                if instances:
                    plates_def.append({
                        'plate_id': int(plate_id or "1"), 
                        'instances': instances,
                        'multi_color_lost': len(plate_extruders) > 1
                    })
        
        build_items = {}
        for mf in model_files:
            content = z.read(mf)
            root = ET.fromstring(content)
            build = root.find('{*}build')
            if build is not None:
                for item in build.findall('{*}item'):
                    cid = item.attrib.get('objectid')
                    transform = item.attrib.get('transform', '')
                    if cid:
                        if cid not in build_items: build_items[cid] = []
                        build_items[cid].append(parse_matrix(transform))

        if not build_items:
            for oid in objects:
                build_items[oid] = [parse_matrix('')]
                
        if not plates_def:
            all_instances = []
            for oid, transforms_list in build_items.items():
                for iid in range(len(transforms_list)):
                    all_instances.append((oid, iid))
            plates_def = [{'plate_id': 1, 'instances': all_instances}]
            
        results = []

        for plate in plates_def:
            plate_id = plate['plate_id']
            instances = plate['instances']
            
            final_vertices = []
            final_triangles = []
            
            def process_item(oid, current_transform):
                if oid not in objects: return
                obj = objects[oid]
                
                if obj['vertices']:
                    v_offset = len(final_vertices)
                    for v in obj['vertices']:
                        tv = transform_point(v, current_transform)
                        final_vertices.append(tv)
                    for t in obj['triangles']:
                        final_triangles.append([t[0] + v_offset, t[1] + v_offset, t[2] + v_offset])
                        
                for c in obj['components']:
                    res_m = mult_matrix(c['transform'], current_transform)
                    process_item(c['objectid'], res_m)

            for inst_oid, inst_iid in instances:
                if inst_oid in build_items and inst_iid < len(build_items[inst_oid]):
                    process_item(inst_oid, build_items[inst_oid][inst_iid])
            
            if not final_vertices:
                continue
                
            out_obj = os.path.join(temp_dir, f"plate_{plate_id}.obj")
            
            min_x = min(v[0] for v in final_vertices)
            max_x = max(v[0] for v in final_vertices)
            min_y = min(v[1] for v in final_vertices)
            max_y = max(v[1] for v in final_vertices)
            min_z = min(v[2] for v in final_vertices)
            max_z = max(v[2] for v in final_vertices)
            
            with open(out_obj, 'w') as f:
                for v in final_vertices:
                    f.write(f"v {v[0]} {v[1]} {v[2]}\n")
                for t in final_triangles:
                    f.write(f"f {t[0]+1} {t[1]+1} {t[2]+1}\n")
                    
            results.append({
                "plate_id": plate_id,
                "extracted_obj_path": out_obj,
                "dimensions": {
                    "x": max_x - min_x,
                    "y": max_y - min_y,
                    "z": max_z - min_z
                },
                "multi_color_lost": plate.get('multi_color_lost', False),
                "original_items": instances
            })
            
        return results

def convert_3mf_to_obj(zip_path, out_obj):
    res = extract_3mf_plates(zip_path, os.path.dirname(out_obj))
    if res:
        import shutil
        shutil.move(res[0]["extracted_obj_path"], out_obj)
        return True
    return False
