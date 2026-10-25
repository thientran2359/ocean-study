"""Add bilateral reference projection to a position-only GLB; preserve source geometry."""
import array
import json
import math
import pathlib
import struct
import sys
import zlib

source, reference, output = map(pathlib.Path, sys.argv[1:4])
data = source.read_bytes()
assert struct.unpack_from('<4sII', data)[0:2] == (b'glTF', 2)
offset = 12
while offset < len(data):
    size, kind = struct.unpack_from('<II', data, offset)
    chunk = data[offset + 8:offset + 8 + size]
    if kind == 0x4E4F534A:
        doc = json.loads(chunk)
    elif kind == 0x004E4942:
        binary = bytearray(chunk)
    offset += 8 + size

primitive = doc['meshes'][0]['primitives'][0]
position = doc['accessors'][primitive['attributes']['POSITION']]
view = doc['bufferViews'][position['bufferView']]
start = view.get('byteOffset', 0) + position.get('byteOffset', 0)
points = list(struct.iter_unpack('<fff', binary[start:start + position['count'] * 12]))
lo, hi = position['min'], position['max']
width, height = struct.unpack_from('>II', reference.read_bytes(), 16)
# Decode the unchanged reference only for color classification. No raster asset
# is edited: the softer fin rim is stored as vertex RGBA in the exported model.
png = reference.read_bytes()
compressed = bytearray()
offset = 8
while offset < len(png):
    size = struct.unpack_from('>I', png, offset)[0]
    if png[offset+4:offset+8] == b'IDAT':
        compressed.extend(png[offset+8:offset+8+size])
    offset += size + 12
assert png[24:26] == bytes((8, 6)), 'Reference must be 8-bit RGBA PNG'
raw = zlib.decompress(compressed)
stride = width * 4
pixels = bytearray()
previous = bytearray(stride)
def paeth(a, b, c):
    p = a + b - c
    da, db, dc = abs(p-a), abs(p-b), abs(p-c)
    return a if da <= db and da <= dc else b if db <= dc else c
for row_index in range(height):
    start = row_index * (stride + 1)
    filter_type = raw[start]
    row = bytearray(raw[start+1:start+1+stride])
    for j in range(stride):
        left = row[j-4] if j >= 4 else 0
        above, corner = previous[j], previous[j-4] if j >= 4 else 0
        correction = (0, left, above, (left+above)//2, paeth(left,above,corner))[filter_type]
        row[j] = (row[j] + correction) & 255
    pixels.extend(row)
    previous = row
uv = array.array('f')
for x, y, z in points:
    # Reference fish occupies x=26..539, y=52..316. Same projection on both flanks.
    px = 26 + (x - lo[0]) / (hi[0] - lo[0]) * 513
    py = 316 - (y - lo[1]) / (hi[1] - lo[1]) * 264
    uv.extend((px / width, py / height))

def add_view(payload, target=None):
    binary.extend(b'\x00' * (-len(binary) % 4))
    result = len(doc['bufferViews'])
    record = {'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(payload)}
    if target:
        record['target'] = target
    doc['bufferViews'].append(record)
    binary.extend(payload)
    return result

uv_view = add_view(uv.tobytes(), 34962)
primitive['attributes']['TEXCOORD_0'] = len(doc['accessors'])
doc['accessors'].append({'bufferView': uv_view, 'componentType': 5126,
                         'count': len(points), 'type': 'VEC2'})
# Bake smooth normals too, so other GLB viewers match the preview lighting.
indices_accessor = doc['accessors'][primitive['indices']]
indices_view = doc['bufferViews'][indices_accessor['bufferView']]
indices_start = indices_view.get('byteOffset', 0) + indices_accessor.get('byteOffset', 0)
indices_type = {5125: 'I', 5123: 'H', 5121: 'B'}[indices_accessor['componentType']]
indices_size = struct.calcsize('<' + indices_type)
indices = [i[0] for i in struct.iter_unpack('<' + indices_type,
           binary[indices_start:indices_start + indices_accessor['count'] * indices_size])]
normals = [[0.0, 0.0, 0.0] for _ in points]
for a, b, c in zip(indices[::3], indices[1::3], indices[2::3]):
    u = [points[b][j] - points[a][j] for j in range(3)]
    v = [points[c][j] - points[a][j] for j in range(3)]
    n = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
    for i in (a, b, c):
        for j in range(3):
            normals[i][j] += n[j]
normal_data = array.array('f')
for n in normals:
    length = math.sqrt(sum(v*v for v in n))
    normal_data.extend(v / length for v in n) if length else normal_data.extend((0, 1, 0))
# Blend actual pigment colors, never UV coordinates. Sliding UVs across the
# reference eye/stripe produced the jagged streak on the crown of the head.
def smooth(a, b, value):
    t = max(0, min(1, (value-a)/(b-a)))
    return t*t*(3-2*t)

def sample(px, py):
    px, py = max(0,min(width-1,px)), max(0,min(height-1,py))
    x0, y0 = int(px), int(py)
    fx, fy = px-x0, py-y0
    rgb = [0., 0., 0.]
    for x,y,weight in ((x0,y0,(1-fx)*(1-fy)), (min(width-1,x0+1),y0,fx*(1-fy)),
                       (x0,min(height-1,y0+1),(1-fx)*fy),
                       (min(width-1,x0+1),min(height-1,y0+1),fx*fy)):
        for j in range(3):
            v = pixels[(y*width+x)*4+j]/255
            rgb[j] += weight*(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4)
    return rgb

def mix(a,b,t):
    return [v*(1-t)+w*t for v,w in zip(a,b)]
primitive['attributes']['NORMAL'] = len(doc['accessors'])
doc['accessors'].append({'bufferView': add_view(normal_data.tobytes(), 34962),
                        'componentType': 5126, 'count': len(points), 'type': 'VEC3'})
colors = array.array('f')
cap_vertices = set()
for i in range(len(points)):
    px, py = uv[i*2]*width, uv[i*2+1]*height
    x,y,z = points[i]
    pigment = sample(px,py)
    # Preserve the original stripe over the crown. Only remove the projected
    # side eye from the centerline in front of that stripe.
    nose = (1-smooth(78,90,px))*(1-smooth(.02,.08,abs(z)))
    pigment = mix(pigment,sample(49,185-y*35),nose)
    if nose > 0:
        cap_vertices.add(i)
    colors.extend((*pigment,1.))
color_accessor = len(doc['accessors'])
doc['accessors'].append({'bufferView': add_view(colors.tobytes(), 34962),
                        'componentType': 5126, 'count': len(points), 'type': 'VEC4'})
doc['images'] = [{'bufferView': add_view(reference.read_bytes()), 'mimeType': 'image/png'}]
doc['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}]
doc['textures'] = [{'source': 0, 'sampler': 0}]
doc['extensionsUsed'] = ['KHR_materials_unlit']
doc['materials'] = [
    {'name': 'Original reference pigment', 'doubleSided': True, 'alphaMode': 'OPAQUE',
     'extensions': {'KHR_materials_unlit': {}},
     'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}},
    {'name': 'Inferred nose center', 'doubleSided': True, 'alphaMode': 'OPAQUE',
     'extensions': {'KHR_materials_unlit': {}},
     'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': 1}}
]
# Use the exact PNG on the flanks and fins. Only the tiny forward-facing cap
# needs inferred pigment; partition faces without changing their geometry.
reference_indices, cap_indices = array.array('I'), array.array('I')
for triangle in zip(indices[::3],indices[1::3],indices[2::3]):
    destination = cap_indices if any(i in cap_vertices for i in triangle) else reference_indices
    destination.extend(triangle)
primitives = []
for material, triangle_indices in enumerate((reference_indices,cap_indices)):
    if not triangle_indices:
        continue
    accessor = len(doc['accessors'])
    doc['accessors'].append({'bufferView': add_view(triangle_indices.tobytes(),34963),
                            'componentType':5125,'type':'SCALAR','count':len(triangle_indices)})
    attributes = dict(primitive['attributes'])
    if material == 1:
        attributes['COLOR_0'] = color_accessor
    primitives.append({'attributes':attributes,'indices':accessor,'material':material,'mode':4})
doc['meshes'][0]['primitives'] = primitives
doc['asset']['extras'] = {'coloring': 'Unmodified reference PNG on flanks and fins; unlit to preserve photographed colors; inferred nose cap; no rig added'}
doc['buffers'][0]['byteLength'] = len(binary)
encoded = json.dumps(doc, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
binary.extend(b'\x00' * (-len(binary) % 4))
result = struct.pack('<4sII', b'glTF', 2, 28 + len(encoded) + len(binary))
result += struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
result += struct.pack('<II', len(binary), 0x004E4942) + binary
output.parent.mkdir(parents=True, exist_ok=True)
output.write_bytes(result)
print(f'{output}: {len(points)} vertices, {len(result)} bytes, exact reference PNG; {len(cap_indices)//3} inferred nose faces')
