#!/usr/bin/env python3
"""Root-align and compact the 100-frame atlas; verify uniqueness and anatomy.
Raw renderer output can be kept in an external cache. No Python runs in the app.
"""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]

def main():
 p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,action='append',default=[]);args=p.parse_args()
 directory=ROOT/'assets/tree-growth';metrics={}
 for path in args.manifest+[directory/'render-manifest.json']:
  if path.exists():
   for row in json.loads(path.read_text())['frames']:metrics[row['file']]=row
 files=sorted(directory.glob('growth-*.png'))
 assert len([f for f in files if len(f.stem)==10])==100, 'Expected all 100 growth images.'
 assert len(files)==140,'Expected 100 growth images plus 40 mature-only seasonal images.'
 records=[]
 for path in files:
  im=Image.open(path).convert('RGBA');alpha=im.getchannel('A');box=alpha.point(lambda v:255 if v>5 else 0).getbbox();assert box,path
  tree=im.crop(box);tree.thumbnail((588,576),Image.Resampling.LANCZOS)
  canvas=Image.new('RGBA',(640,640));canvas.alpha_composite(tree,((640-tree.width)//2,610-tree.height))
  canvas.quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).save(path,optimize=True)
  record={**metrics.get(path.name,{}),'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'size':[640,640],'rootBaseline':610}
  assert record.get('frame') is not None,path;records.append(record)
 growth=sorted([r for r in records if r['season']=='summer'],key=lambda r:r['frame'])
 assert len({r['sha256'] for r in growth})==100,'Repeated image: these must not be copies.'
 assert all(a['heightMeters']<b['heightMeters'] for a,b in zip(growth,growth[1:])), 'Height must grow gradually.'
 assert all(a['trunkRadiusMeters']<b['trunkRadiusMeters'] for a,b in zip(growth,growth[1:])), 'Trunks must develop gradually.'
 assert next(r for r in growth if r['blossoms'])['frame']>=52
 assert next(r for r in growth if r['fruit'])['frame']>=63
 for r in records:
  if r['season']=='winter':assert r['frame']>=80 and r['leaves']==0 and r['blossoms']==0
 manifest={'renderer':'Mitsuba 3.7.1 scalar CPU path tracer','seed':57124,'growthImages':100,'seasonalImages':40,'frames':records}
 (directory/'render-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print('Verified:',len(growth),'unique growth images, 40 adult season images;',sum(r['bytes'] for r in records),'bytes.')

if __name__=='__main__':main()
