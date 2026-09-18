import struct
import os

def center_stl(filepath, center_x, center_y, scale_factor=1.0):
    """
    Reads a binary STL, scales it by scale_factor, calculates the bounding box, 
    and translates all vertices so that the model is perfectly centered at 
    (center_x, center_y) and rests on z=0.
    """
    with open(filepath, 'rb') as f:
        header = f.read(80)
        count_bytes = f.read(4)
        if len(count_bytes) < 4:
            return # not a valid binary STL
        num_triangles = struct.unpack('<I', count_bytes)[0]
        data = bytearray(f.read(num_triangles * 50))
    
    if len(data) != num_triangles * 50:
        return # truncated
        
    min_x = min_y = min_z = float('inf')
    max_x = max_y = float('-inf')
    
    # First pass: find bounding box after scaling
    for i in range(num_triangles):
        offset = i * 50
        v1 = struct.unpack_from('<3f', data, offset + 12)
        v2 = struct.unpack_from('<3f', data, offset + 24)
        v3 = struct.unpack_from('<3f', data, offset + 36)
        
        for v in (v1, v2, v3):
            sx, sy, sz = v[0]*scale_factor, v[1]*scale_factor, v[2]*scale_factor
            if sx < min_x: min_x = sx
            if sx > max_x: max_x = sx
            if sy < min_y: min_y = sy
            if sy > max_y: max_y = sy
            if sz < min_z: min_z = sz
            
    current_center_x = (min_x + max_x) / 2.0
    current_center_y = (min_y + max_y) / 2.0
    
    dx = center_x - current_center_x
    dy = center_y - current_center_y
    dz = 0.0 - min_z # place on bed
    
    # Second pass: apply scale and translate
    for i in range(num_triangles):
        offset = i * 50
        v1 = list(struct.unpack_from('<3f', data, offset + 12))
        v2 = list(struct.unpack_from('<3f', data, offset + 24))
        v3 = list(struct.unpack_from('<3f', data, offset + 36))
        
        v1[0] = v1[0]*scale_factor + dx; v1[1] = v1[1]*scale_factor + dy; v1[2] = v1[2]*scale_factor + dz
        v2[0] = v2[0]*scale_factor + dx; v2[1] = v2[1]*scale_factor + dy; v2[2] = v2[2]*scale_factor + dz
        v3[0] = v3[0]*scale_factor + dx; v3[1] = v3[1]*scale_factor + dy; v3[2] = v3[2]*scale_factor + dz
        
        struct.pack_into('<3f', data, offset + 12, *v1)
        struct.pack_into('<3f', data, offset + 24, *v2)
        struct.pack_into('<3f', data, offset + 36, *v3)
        
    with open(filepath, 'wb') as f:
        f.write(header)
        f.write(count_bytes)
        f.write(data)

if __name__ == "__main__":
    import sys
    scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
    center_stl(sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), scale)
