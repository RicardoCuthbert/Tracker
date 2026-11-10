"""Build passive illustrations and app icons from supplied assets. Requires Pillow."""
from pathlib import Path
from PIL import Image
import base64, hashlib, io, json, re
import xml.etree.ElementTree as ET

source = Path('Asset lucu lucu/svg')
target = Path('public/illustrations')
target.mkdir(parents=True, exist_ok=True)
ET.register_namespace('', 'http://www.w3.org/2000/svg')
names = ['welcome-together', 'start-with-a-pencil', 'reading-together', 'walking-together', 'care-for-the-cat', 'plan-together', 'small-high-five', 'cat-at-rest', 'celebrate-progress', 'flowers-for-you', 'comfort-the-cat', 'empty-wallet']
uses = ['Reserved: welcome', 'First account', 'Empty transactions and search', 'Reserved: shared onboarding', 'Reserved: savings care', 'Empty shared transactions', 'Reserved: small milestones', 'Reserved: calm placeholder', 'Completed goal', 'Empty savings goals; brand source', 'Unused: avoid distress in empty states', 'Unused: never imply empty data means no money']
allowed = {'svg', 'defs', 'clipPath', 'g', 'path', 'image'}
inventory = []
for i, name in enumerate(names):
    p = source / ('Poster.svg' if i == 0 else f'Poster ({i}).svg')
    data = p.read_bytes()
    assert not re.search(rb'<!DOCTYPE|<!ENTITY', data, re.I)
    root = ET.fromstring(data)
    for e in root.iter():
        assert e.tag.split('}')[-1] in allowed
        for k, v in e.attrib.items():
            assert not k.lower().startswith('on')
            if 'href' in k: assert v.startswith('data:image/png;base64,')
            for ref in re.findall(r'url\((.*?)\)', v): assert ref.startswith('#')
    images = [e for e in root.iter() if e.tag.endswith('}image')]
    if images:
        assert len(images) == 1
        payload = next(v for k,v in images[0].attrib.items() if k.endswith('href'))
        im = Image.open(io.BytesIO(base64.b64decode(payload.split(',')[1]))).convert('RGBA')
        assert im.getchannel('A').getextrema() == (0, 255)
        file = name + '.webp'
        im.save(target / file, 'WEBP', lossless=True, exact=True, method=6)
        decoded = Image.open(target / file).convert('RGBA')
        assert im.tobytes() == decoded.tobytes(), 'Lossless RGBA verification'
        width, height = im.size
    else:
        for key in ['zoomAndPan', 'version']: root.attrib.pop(key, None)
        for e in root.iter():
            if e.text and not e.text.strip(): e.text = None
            if e.tail and not e.tail.strip(): e.tail = None
            for k,v in e.attrib.items():
                v = re.sub(r'\s+', ' ', v).strip()
                if k == 'd': v = re.sub(r'\s*([MmZzLlHhVvCcSsQqTtAa])\s*', r'\1', v)
                e.set(k, v)
        file = name + '.svg'
        ET.ElementTree(root).write(target / file, encoding='utf-8', xml_declaration=False)
        width, height = int(root.attrib['width']), int(root.attrib['height'])
    size = (target / file).stat().st_size
    assert size < len(data)
    inventory.append(dict(source=p.name, sourceSha256=hashlib.sha256(data).hexdigest(), file=file, width=width, height=height, originalBytes=len(data), optimizedBytes=size, kind='lossless raster' if images else 'vector', use=uses[i]))

# Crop the supplied flower cat's face; no replacement artwork or new drawing.
cat = Image.open(target / 'flowers-for-you.webp').convert('RGBA')
face = cat.crop((995, 285, 2265, 1345))
face.paste((0,0,0,0), (0,0,100,160))  # Exclude the detached bouquet corner.
canvas = Image.new('RGBA', (512,512), '#e0f2fe')
face.thumbnail((480,440), Image.Resampling.LANCZOS)
canvas.alpha_composite(face, ((512-face.width)//2, (512-face.height)//2))
canvas.resize((192,192), Image.Resampling.LANCZOS).save('src/app/icon.png', optimize=True)
canvas.resize((180,180), Image.Resampling.LANCZOS).save('src/app/apple-icon.png', optimize=True)
canvas.save('src/app/favicon.ico', sizes=[(16,16),(32,32),(48,48)])
(target / 'inventory.json').write_text(json.dumps(inventory, indent=2)+'\n', encoding='utf-8')
print(f'{len(inventory)} illustrations: {sum(a["originalBytes"] for a in inventory):,} -> {sum(a["optimizedBytes"] for a in inventory):,} bytes')
