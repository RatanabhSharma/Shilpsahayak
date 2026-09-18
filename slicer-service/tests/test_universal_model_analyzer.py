import zipfile
from pathlib import Path

from app.universal_model_analyzer import analyze_model


def make_cube_stl(path: Path) -> None:
    tris = [
        ((0,0,0),(10,0,0),(10,10,0)),((0,0,0),(10,10,0),(0,10,0)),
        ((0,0,10),(10,10,10),(10,0,10)),((0,0,10),(0,10,10),(10,10,10)),
        ((0,0,0),(0,0,10),(10,0,10)),((0,0,0),(10,0,10),(10,0,0)),
        ((10,0,0),(10,0,10),(10,10,10)),((10,0,0),(10,10,10),(10,10,0)),
        ((10,10,0),(10,10,10),(0,10,10)),((10,10,0),(0,10,10),(0,10,0)),
        ((0,10,0),(0,10,10),(0,0,10)),((0,10,0),(0,0,10),(0,0,0)),
    ]
    lines = ['solid cube']
    for a,b,c in tris:
        lines += [' facet normal 0 0 0', '  outer loop']
        lines += [f'   vertex {v[0]} {v[1]} {v[2]}' for v in (a,b,c)]
        lines += ['  endloop', ' endfacet']
    lines.append('endsolid cube')
    path.write_text('\n'.join(lines) + '\n')


def test_stl_cube(tmp_path):
    path = tmp_path / 'cube.stl'
    make_cube_stl(path)
    result = analyze_model(str(path))
    assert result['success']
    assert result['geometry']['dimensions'] == {'x': 10.0, 'y': 10.0, 'z': 10.0}
    assert abs(result['geometry']['volumeCm3'] - 1.0) < 1e-9
    assert result['meshHealth']['watertight'] is True
    assert result['processing']['requiresManualReview'] is False


def test_obj_with_mtl(tmp_path):
    obj = tmp_path / 'cube.obj'
    mtl = tmp_path / 'cube.mtl'
    obj.write_text('''mtllib cube.mtl\no Cube\nv 0 0 0\nv 10 0 0\nv 10 10 0\nv 0 10 0\nv 0 0 10\nv 10 0 10\nv 10 10 10\nv 0 10 10\nusemtl Red\nf 1 2 3 4\nf 5 8 7 6\nf 1 5 6 2\nf 2 6 7 3\nf 3 7 8 4\nf 5 1 4 8\n''')
    mtl.write_text('newmtl Red\nKd 1.0 0.0 0.0\nmap_Kd texture.png\n')
    result = analyze_model(str(obj))
    assert result['success']
    assert result['geometry']['dimensions'] == {'x': 10.0, 'y': 10.0, 'z': 10.0}
    assert abs(result['geometry']['volumeCm3'] - 1.0) < 1e-9
    assert result['colors'][0]['hex'] == '#FF0000'
    assert 'texture.png' in result['textures']


def test_3mf_build_scale_is_applied(tmp_path):
    path = tmp_path / 'project.3mf'
    root = '''<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" unit="millimeter"><resources><object id="2" type="model"/></resources><build><item objectid="2" transform="0.05 0 0 0 0.05 0 0 0 0.05 113.1277 155.6219 80.06" printable="1" /></build></model>'''
    obj = '''<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" unit="millimeter"><resources><object id="1" type="model"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="200" y="0" z="0"/><vertex x="200" y="200" z="0"/><vertex x="0" y="200" z="0"/><vertex x="0" y="0" z="200"/><vertex x="200" y="0" z="200"/><vertex x="200" y="200" z="200"/><vertex x="0" y="200" z="200"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/><triangle v1="0" v2="2" v3="3"/><triangle v1="4" v2="6" v3="5"/><triangle v1="4" v2="7" v3="6"/><triangle v1="0" v2="4" v3="5"/><triangle v1="0" v2="5" v3="1"/><triangle v1="1" v2="5" v3="6"/><triangle v1="1" v2="6" v3="2"/><triangle v1="2" v2="6" v3="7"/><triangle v1="2" v2="7" v3="3"/><triangle v1="4" v2="0" v3="3"/><triangle v1="4" v2="3" v3="7"/></triangles></mesh></object></resources></model>'''
    with zipfile.ZipFile(path, 'w') as zf:
        zf.writestr('3D/3dmodel.model', root)
        zf.writestr('3D/Objects/object_1.model', obj)
        zf.writestr('Metadata/model_settings.config', '<config/>')
    result = analyze_model(str(path))
    assert result['success']
    assert result['geometry']['dimensions'] == {'x': 10.0, 'y': 10.0, 'z': 10.0}
    assert result['project']['placementTransformApplied'] is True


def test_standard_3mf_color_group(tmp_path):
    path = tmp_path / 'colored.3mf'
    xml = """<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02" unit="millimeter"><resources><m:colorgroup id="5"><m:color color="#FF0000"/><m:color color="#00FF00"/></m:colorgroup><object id="1" type="model"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="10" y="0" z="0"/><vertex x="0" y="10" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2" pid="5" p1="0" p2="1" p3="1"/></triangles></mesh></object></resources><build><item objectid="1"/></build></model>"""
    with zipfile.ZipFile(path, 'w') as zf:
        zf.writestr('3D/3dmodel.model', xml)
        zf.writestr('3D/Textures/example.png', b'fake')
    result = analyze_model(str(path))
    assert result['success']
    assert '#FF0000' in [c['hex'] for c in result['colors']]
    assert '#00FF00' in [c['hex'] for c in result['colors']]
    assert result['materialAssignments']
    assert '3D/Textures/example.png' in result['textures']
