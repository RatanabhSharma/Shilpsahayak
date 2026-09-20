"""
Generate diverse validation models for Phase 2B testing:
1. STL cube (already present: cube_20mm.stl)
2. OBJ cube (already present: cube_20mm.obj)
3. Clean 3MF (already present: standard_cube.3mf)
4. Bambu project 3MF (already present: bambu_project.3mf)
5. Pre-sliced 3MF (already present: sliced_project.3mf)
6. Raw G-code (already present: sample.gcode)
7. Coloured / Multi-material 3MF (coloured_pyramid.3mf)
8. Complex model requiring supports (overhang_t_bracket.stl)
9. Large model exceeding standard envelope (large_tower_300mm.stl)
10. STEP dummy model (bracket_test.step)
"""

import os
import struct
import zipfile

def create_t_bracket_overhang_stl(filename: str):
    # A T-bracket with steep 90-degree horizontal overhangs that explicitly require support
    # Vertical pillar: 10x10 mm, height 40mm
    # Horizontal top bar: 40x10 mm, height 10mm (protruding 15mm on left and right)
    # Total height 50mm
    facets = []
    
    def add_box(x1, x2, y1, y2, z1, z2):
        v = [
            [x1, y1, z1], [x2, y1, z1], [x2, y2, z1], [x1, y2, z1],
            [x1, y1, z2], [x2, y1, z2], [x2, y2, z2], [x1, y2, z2]
        ]
        box_facets = [
            (v[0], v[2], v[1], [0, 0, -1]), (v[0], v[3], v[2], [0, 0, -1]),
            (v[4], v[5], v[6], [0, 0, 1]),  (v[4], v[6], v[7], [0, 0, 1]),
            (v[0], v[1], v[5], [0, -1, 0]), (v[0], v[5], v[4], [0, -1, 0]),
            (v[2], v[3], v[7], [0, 1, 0]),  (v[2], v[7], v[6], [0, 1, 0]),
            (v[3], v[0], v[4], [-1, 0, 0]), (v[3], v[4], v[7], [-1, 0, 0]),
            (v[1], v[2], v[6], [1, 0, 0]),  (v[1], v[6], v[5], [1, 0, 0])
        ]
        facets.extend(box_facets)

    # Vertical stem
    add_box(-5, 5, -5, 5, 0, 40)
    # Horizontal overhang crossbar (40mm wide in X, creates 15mm cantilever overhangs on both sides)
    add_box(-20, 20, -5, 5, 40, 50)

    with open(filename, "wb") as f:
        header = b"Overhang T-Bracket with 90-deg overhangs for support testing".ljust(80, b"\x00")
        f.write(header)
        f.write(struct.pack("<I", len(facets)))
        for p1, p2, p3, n in facets:
            f.write(struct.pack("<3f", *n))
            f.write(struct.pack("<3f", *p1))
            f.write(struct.pack("<3f", *p2))
            f.write(struct.pack("<3f", *p3))
            f.write(b"\x00\x00")

def create_large_tower_stl(filename: str):
    # Model with Z=300mm (exceeds 256mm max build envelope)
    facets = []
    x1, x2, y1, y2, z1, z2 = -15, 15, -15, 15, 0, 300
    v = [
        [x1, y1, z1], [x2, y1, z1], [x2, y2, z1], [x1, y2, z1],
        [x1, y1, z2], [x2, y1, z2], [x2, y2, z2], [x1, y2, z2]
    ]
    facets = [
        (v[0], v[2], v[1], [0, 0, -1]), (v[0], v[3], v[2], [0, 0, -1]),
        (v[4], v[5], v[6], [0, 0, 1]),  (v[4], v[6], v[7], [0, 0, 1]),
        (v[0], v[1], v[5], [0, -1, 0]), (v[0], v[5], v[4], [0, -1, 0]),
        (v[2], v[3], v[7], [0, 1, 0]),  (v[2], v[7], v[6], [0, 1, 0]),
        (v[3], v[0], v[4], [-1, 0, 0]), (v[3], v[4], v[7], [-1, 0, 0]),
        (v[1], v[2], v[6], [1, 0, 0]),  (v[1], v[6], v[5], [1, 0, 0])
    ]
    with open(filename, "wb") as f:
        header = b"Large Tower 300mm Z exceeds 256mm build volume envelope".ljust(80, b"\x00")
        f.write(header)
        f.write(struct.pack("<I", len(facets)))
        for p1, p2, p3, n in facets:
            f.write(struct.pack("<3f", *n))
            f.write(struct.pack("<3f", *p1))
            f.write(struct.pack("<3f", *p2))
            f.write(struct.pack("<3f", *p3))
            f.write(b"\x00\x00")

def create_coloured_3mf(filename: str):
    # Standard 3MF with material group and color property definitions
    model_xml = """<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
 <resources>
  <m:colorgroup id="1">
   <m:color color="#EF4444FF"/>
   <m:color color="#2563EBFF"/>
   <m:color color="#15803DFF"/>
  </m:colorgroup>
  <object id="2" type="model">
   <mesh>
    <vertices>
     <vertex x="-10.0" y="-10.0" z="0.0"/>
     <vertex x="10.0" y="-10.0" z="0.0"/>
     <vertex x="10.0" y="10.0" z="0.0"/>
     <vertex x="-10.0" y="10.0" z="0.0"/>
     <vertex x="0.0" y="0.0" z="20.0"/>
    </vertices>
    <triangles>
     <triangle v1="0" v2="2" v3="1" pid="1" p1="0"/>
     <triangle v1="0" v2="3" v3="2" pid="1" p1="0"/>
     <triangle v1="0" v2="1" v3="4" pid="1" p1="1"/>
     <triangle v1="1" v2="2" v3="4" pid="1" p1="1"/>
     <triangle v1="2" v2="3" v3="4" pid="1" p1="2"/>
     <triangle v1="3" v2="0" v3="4" pid="1" p1="2"/>
    </triangles>
   </mesh>
  </object>
 </resources>
 <build>
  <item objectid="2"/>
 </build>
</model>"""

    rels_xml = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>"""

    with zipfile.ZipFile(filename, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("3D/3dmodel.model", model_xml)
        zf.writestr("_rels/.rels", rels_xml)

def create_dummy_step(filename: str):
    content = """ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Shilp Studio STEP Test Part'),'2;1');
FILE_NAME('bracket_test.step','2026-09-07T12:00:00',('Shilp Sahayak'),('Engineer'),'PrusaSlicer STEP Compatibility Test','OpenCASCADE','');
FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));
ENDSEC;
DATA;
#10=APPLICATION_CONTEXT('configuration controlled 3D design');
#20=APPLICATION_PROTOCOL_DEFINITION('international standard','config_control_design',1994,#10);
ENDSEC;
END-ISO-10303-21;
"""
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    test_dir = "slicer-service/poc/test_models"
    create_t_bracket_overhang_stl(os.path.join(test_dir, "overhang_t_bracket.stl"))
    create_large_tower_stl(os.path.join(test_dir, "large_tower_300mm.stl"))
    create_coloured_3mf(os.path.join(test_dir, "coloured_pyramid.3mf"))
    create_dummy_step(os.path.join(test_dir, "bracket_test.step"))
    print("Generated additional validation models in", test_dir)
