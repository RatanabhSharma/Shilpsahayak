"""
Generate Reference Geometric Test Models for Phase 2A Validation:
1. cube_20mm.stl - Standard 20x20x20 mm test cube (watertight binary STL)
2. test_square.obj - Clean geometric OBJ model
3. test_model.3mf - Standard clean 3MF package containing 3D/3dmodel.model
4. test_project.3mf - Simulated Slicer Project 3MF (containing Metadata/model_settings.config)
5. test_sliced.3mf - Simulated Sliced 3MF (containing Metadata/slice_info.config)
6. test_gcode.gcode - Simulated plain G-code output
"""

import os
import struct
import zipfile

def create_cube_stl(filename: str, size: float = 20.0):
    half = size / 2.0
    vertices = [
        [-half, -half, 0.0],
        [ half, -half, 0.0],
        [ half,  half, 0.0],
        [-half,  half, 0.0],
        [-half, -half, size],
        [ half, -half, size],
        [ half,  half, size],
        [-half,  half, size]
    ]

    facets = [
        # Bottom (-Z)
        (0, 2, 1, [0, 0, -1]), (0, 3, 2, [0, 0, -1]),
        # Top (+Z)
        (4, 5, 6, [0, 0, 1]),  (4, 6, 7, [0, 0, 1]),
        # Front (-Y)
        (0, 1, 5, [0, -1, 0]), (0, 5, 4, [0, -1, 0]),
        # Back (+Y)
        (2, 3, 7, [0, 1, 0]),  (2, 7, 6, [0, 1, 0]),
        # Left (-X)
        (3, 0, 4, [-1, 0, 0]), (3, 4, 7, [-1, 0, 0]),
        # Right (+X)
        (1, 2, 6, [1, 0, 0]),  (1, 6, 5, [1, 0, 0])
    ]

    with open(filename, "wb") as f:
        # 80-byte header
        header = b"Phase2A 20mm Test Cube Shilp Studio".ljust(80, b"\x00")
        f.write(header)
        # Number of triangles (uint32)
        f.write(struct.pack("<I", len(facets)))
        
        for i1, i2, i3, normal in facets:
            f.write(struct.pack("<3f", *normal))
            f.write(struct.pack("<3f", *vertices[i1]))
            f.write(struct.pack("<3f", *vertices[i2]))
            f.write(struct.pack("<3f", *vertices[i3]))
            f.write(b"\x00\x00") # 2-byte attribute

def create_cube_obj(filename: str, size: float = 20.0):
    half = size / 2.0
    lines = [
        "# Wavefront OBJ test model",
        f"v {-half} {-half} 0.0",
        f"v {half} {-half} 0.0",
        f"v {half} {half} 0.0",
        f"v {-half} {half} 0.0",
        f"v {-half} {-half} {size}",
        f"v {half} {-half} {size}",
        f"v {half} {half} {size}",
        f"v {-half} {half} {size}",
        "f 1 3 2", "f 1 4 3",
        "f 5 6 7", "f 5 7 8",
        "f 1 2 6", "f 1 6 5",
        "f 3 4 8", "f 3 8 7",
        "f 4 1 5", "f 4 5 8",
        "f 2 3 7", "f 2 7 6"
    ]
    with open(filename, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def create_test_3mf(filename: str, is_project: bool = False, is_sliced: bool = False):
    model_xml = """<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
 <resources>
  <object id="1" type="model">
   <mesh>
    <vertices>
     <vertex x="0.0" y="0.0" z="0.0"/>
     <vertex x="20.0" y="0.0" z="0.0"/>
     <vertex x="20.0" y="20.0" z="0.0"/>
     <vertex x="0.0" y="20.0" z="0.0"/>
     <vertex x="0.0" y="0.0" z="20.0"/>
     <vertex x="20.0" y="0.0" z="20.0"/>
     <vertex x="20.0" y="20.0" z="20.0"/>
     <vertex x="0.0" y="20.0" z="20.0"/>
    </vertices>
    <triangles>
     <triangle v1="0" v2="2" v3="1"/>
     <triangle v1="0" v2="3" v3="2"/>
     <triangle v1="4" v2="5" v3="6"/>
     <triangle v1="4" v2="6" v3="7"/>
     <triangle v1="0" v2="1" v3="5"/>
     <triangle v1="0" v2="5" v3="4"/>
     <triangle v1="2" v2="3" v3="7"/>
     <triangle v1="2" v2="7" v3="6"/>
     <triangle v1="3" v2="0" v3="4"/>
     <triangle v1="3" v2="4" v3="7"/>
     <triangle v1="1" v2="2" v3="6"/>
     <triangle v1="1" v2="6" v3="5"/>
    </triangles>
   </mesh>
  </object>
 </resources>
 <build>
  <item objectid="1"/>
 </build>
</model>"""

    rels_xml = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>"""

    with zipfile.ZipFile(filename, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("3D/3dmodel.model", model_xml)
        zf.writestr("_rels/.rels", rels_xml)
        if is_project:
            zf.writestr("Metadata/model_settings.config", "bambu_studio_version=01.09.00\nprinter_model=Bambu Lab X1-Carbon")
        if is_sliced:
            zf.writestr("Metadata/slice_info.config", "sliced_by=BambuStudio\nfilament_used_g=14.2")

def create_test_gcode(filename: str):
    content = """G28 ; home all axes
G1 Z5 F5000
G1 X100 Y100 F3000
; estimated printing time (normal mode) = 35m 12s
; filament used [g] = 5.24
; filament used [mm] = 1750.2
; total filament used [g] = 5.24
M84 ; motors off
"""
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    target_dir = "slicer-service/poc/test_models"
    os.makedirs(target_dir, exist_ok=True)
    create_cube_stl(os.path.join(target_dir, "cube_20mm.stl"))
    create_cube_obj(os.path.join(target_dir, "cube_20mm.obj"))
    create_test_3mf(os.path.join(target_dir, "standard_cube.3mf"), is_project=False, is_sliced=False)
    create_test_3mf(os.path.join(target_dir, "bambu_project.3mf"), is_project=True, is_sliced=False)
    create_test_3mf(os.path.join(target_dir, "sliced_project.3mf"), is_project=True, is_sliced=True)
    create_test_gcode(os.path.join(target_dir, "sample.gcode"))
    print("Generated all validation models in:", target_dir)
