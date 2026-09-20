import xml.etree.ElementTree as ET
import zipfile
import os

def parse_matrix(matrix_str):
    if not matrix_str:
        return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]
    parts = list(map(float, matrix_str.split()))
    # 3MF matrix is usually a 4x4 matrix without the last column (which is 0 0 0 1)
    # The format is: m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32
    # Where m30 m31 m32 is translation
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

def convert_3mf_to_obj(zip_path, out_obj):
    with zipfile.ZipFile(zip_path, 'r') as z:
        # Get all model files (could be multiple if Objects/ used)
        model_files = [f for f in z.namelist() if f.endswith('.model') and f.startswith('3D/')]
        
        objects = {} # id -> {'vertices': [], 'triangles': [], 'components': []}
        
        for mf in model_files:
            content = z.read(mf)
            root = ET.fromstring(content)
            # Find all objects
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
                
        # Now find what to build
        build_items = []
        for mf in model_files:
            content = z.read(mf)
            root = ET.fromstring(content)
            build = root.find('{*}build')
            if build is not None:
                for item in build.findall('{*}item'):
                    cid = item.attrib.get('objectid')
                    transform = item.attrib.get('transform', '')
                    if cid:
                        build_items.append({
                            'objectid': cid,
                            'transform': parse_matrix(transform)
                        })
                        
        if not build_items:
            # If no build items, just dump everything
            for oid in objects:
                build_items.append({
                    'objectid': oid,
                    'transform': parse_matrix('')
                })
                
        # Resolve all to a single flat list of vertices and triangles
        final_vertices = []
        final_triangles = []
        
        def process_item(item, current_transform):
            oid = item['objectid']
            if oid not in objects: return
            obj = objects[oid]
            
            # Local transform
            lm = item['transform']
            
            # Multiply matrices? Actually we can just apply transforms at the vertex level
            # Wait, multiplying matrices is better. 
            # new_m = current_transform * lm
            # But let's just do it simple: transform vertices first by lm, then by current_transform
            
            if obj['vertices']:
                v_offset = len(final_vertices)
                for v in obj['vertices']:
                    tv = transform_point(v, lm)
                    tv = transform_point(tv, current_transform)
                    final_vertices.append(tv)
                    
                for t in obj['triangles']:
                    final_triangles.append([t[0] + v_offset, t[1] + v_offset, t[2] + v_offset])
                    
            for c in obj['components']:
                # The component transform applies BEFORE the item transform
                # So we process it recursively
                # We need a combined transform.
                cm = c['transform']
                # Manual matrix mult: result = lm * cm
                res_m = [[0]*4 for _ in range(4)]
                for i in range(4):
                    for j in range(4):
                        res_m[i][j] = sum(lm[i][k] * cm[k][j] for k in range(4))
                
                process_item({'objectid': c['objectid'], 'transform': res_m}, current_transform)
                
        identity = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]
        for item in build_items:
            process_item(item, identity)
            
        with open(out_obj, 'w') as f:
            for v in final_vertices:
                f.write(f"v {v[0]} {v[1]} {v[2]}\n")
            for t in final_triangles:
                f.write(f"f {t[0]+1} {t[1]+1} {t[2]+1}\n")

if __name__ == '__main__':
    target = r"D:\Shilp buss\firebase\final\Shilpsahayak-main\Shilpsahayak-main\scratch\test_models\Spiderman_urban.3mf"
    convert_3mf_to_obj(target, "spiderman.obj")
    print("Converted!")
