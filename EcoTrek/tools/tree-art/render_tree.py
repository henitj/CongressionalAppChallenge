#!/usr/bin/env python3
"""Render EcoTrek's coherent 100-frame apple-tree growth atlas.

Author-created geometry and materials; no photograph or real-tree planting claim.
Run with the optional artwork-only dependencies in requirements.txt. Mitsuba's
CPU path tracer supplies real lighting, curved leaves and bark texture.
Every image grows the same deterministic branching topology; no crossfades,
resized adult photographs, or unrelated tree silhouettes are used.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import random
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
import mitsuba as mi
mi.set_variant('scalar_rgb')

class Vector:
    def __init__(self, value): self.v=np.array(value.v if isinstance(value,Vector) else value,dtype=float)
    def __iter__(self): return iter(self.v)
    def __add__(self, other): return Vector(self.v+other.v)
    def __sub__(self, other): return Vector(self.v-other.v)
    def __mul__(self, value): return Vector(self.v*value)
    def __rmul__(self, value): return self*value
    def __truediv__(self, value): return Vector(self.v/value)
    @property
    def x(self): return self.v[0]
    @property
    def y(self): return self.v[1]
    @property
    def z(self): return self.v[2]
    @property
    def length(self): return float(np.linalg.norm(self.v))
    def cross(self, other): return Vector(np.cross(self.v,other.v))
    def normalized(self): return self/max(1e-10,self.length)
    def normalize(self): self.v/=max(1e-10,self.length)

SHAPES={}


ROOT = Path(__file__).resolve().parents[2]
HEIGHT_KEYS = [(0,.09),(7,.22),(14,.43),(22,.68),(28,.94),(35,1.28),(42,1.64),(50,2.10),(60,2.85),(70,3.58),(80,4.35),(99,4.83)]
RADIUS_KEYS = [(0,.003),(14,.005),(28,.010),(42,.022),(50,.035),(60,.055),(70,.078),(80,.106),(99,.133)]
LEAF_COLORS = [(0.037,0.155,0.018),(0.045,0.19,0.021),(0.064,0.23,0.025),(0.043,0.175,0.016),(0.083,0.26,0.036),(0.052,0.205,0.022)]


def clamp(x): return max(0., min(1., x))
def smooth(x): x=clamp(x); return x*x*(3-2*x)
def mix(a,b,t): return a+(b-a)*t

def interp(keys, x):
    for (xa,a),(xb,b) in zip(keys,keys[1:]):
        if x <= xb: return mix(a,b,clamp((x-xa)/(xb-xa)))
    return keys[-1][1]


def material(name,color,rough=.6,subsurface=0.,metallic=0.):
    return mi.load_dict({'type':'twosided','bsdf':{'type':'roughplastic','diffuse_reflectance':{'type':'rgb','value':color},'alpha':rough*.5,'int_ior':1.45}})


def bark_material():
    path=TEXTURES/'bark.png';rng=np.random.default_rng(188)
    x,y=np.meshgrid(np.arange(256),np.arange(512));grain=np.sin(x*.55+np.sin(y*.045)*.65)*8+np.sin(x*1.31+y*.007)*4+rng.normal(0,4,(512,256))
    rgb=np.stack([np.clip(base+grain,0,255) for base in [111,89,65]],axis=2).astype('uint8');Image.fromarray(rgb).save(path)
    return mi.load_dict({'type':'roughplastic','diffuse_reflectance':{'type':'bitmap','filename':str(path)},'alpha':.55})


def leaf_material(index,autumn=False):
    rgb=[(57,102,30),(69,118,38),(83,126,43),(61,105,29),(92,139,50),(70,119,35)][index%6] if not autumn else [(159,105,36),(173,122,45),(143,74,22),(184,138,49),(138,99,42),(176,106,32)][index%6]
    path=TEXTURES/f'leaf-{index}-{autumn}.png';rng=np.random.default_rng(index+41);a=np.array([[rgb]*128]*256,dtype=float);grain=rng.normal(0,2,(256,128));a+=grain[:,:,None];im=Image.fromarray(np.clip(a,0,255).astype('uint8'));draw=ImageDraw.Draw(im)
    color=tuple(min(255,c+14) for c in rgb);draw.line((64,0,64,255),fill=color,width=2)
    for y in range(18,250,28):draw.line((64,y-12,10,y+27),fill=color,width=1);draw.line((64,y-12,118,y+27),fill=color,width=1)
    im.save(path)
    return mi.load_dict({'type':'twosided','bsdf':{'type':'roughplastic','diffuse_reflectance':{'type':'bitmap','filename':str(path)},'alpha':.32}})


class Mesh:
    def __init__(self): self.vertices=[];self.faces=[];self.uv=[];self.indices=[]
    def face(self, verts, uv, material=0):
        start=len(self.vertices);self.vertices.extend(tuple(p) for p in verts);self.faces.append(tuple(range(start,start+len(verts))));self.uv.extend(uv);self.indices.append(material)
    def object(self,name,materials):
        # Smooth tube/leaf normals across adjacent faces while retaining UVs.
        verts=np.asarray(self.vertices,dtype=np.float32);polys=np.asarray(self.faces,dtype=np.uint32)
        fn=np.cross(verts[polys[:,1]]-verts[polys[:,0]],verts[polys[:,2]]-verts[polys[:,0]])
        fn/=np.maximum(np.linalg.norm(fn,axis=1)[:,None],1e-9)
        unique,inverse=np.unique(np.round(verts,7),axis=0,return_inverse=True);merged=np.zeros((len(unique),3),dtype=np.float32)
        np.add.at(merged,inverse,np.repeat(fn,4,axis=0));ns=merged[inverse]
        ns/=np.maximum(np.linalg.norm(ns,axis=1)[:,None],1e-9)
        tris=np.stack((polys[:,[0,1,2]],polys[:,[0,2,3]]),axis=1).reshape(-1,3)
        indices=np.repeat(np.asarray(self.indices),2)
        area=np.linalg.norm(np.cross(verts[tris[:,1]]-verts[tris[:,0]],verts[tris[:,2]]-verts[tris[:,0]]),axis=1)
        tris=tris[area>1e-12];indices=indices[area>1e-12]
        uvs=np.asarray(self.uv,dtype=np.float32)
        for mat_id,mat in enumerate(materials):
            faces=tris[indices==mat_id]
            if not len(faces):continue
            used=np.unique(faces.ravel());mapping=np.zeros(len(verts),dtype=np.uint32);mapping[used]=np.arange(len(used),dtype=np.uint32)
            ob=mi.Mesh(name+str(mat_id),len(used),len(faces),has_vertex_normals=True,has_vertex_texcoords=True);ob.set_bsdf(mat);props=mi.traverse(ob)
            props['vertex_positions']=verts[used].ravel();props['faces']=mapping[faces].ravel();props['vertex_normals']=ns[used].astype(np.float32).ravel();props['vertex_texcoords']=uvs[used].ravel();props.update();SHAPES[f'shape{len(SHAPES)}']=ob
        return True


def basis(direction):
    d=direction.normalized();helper=Vector((0,0,1)) if abs(d.z)<.9 else Vector((1,0,0));x=d.cross(helper).normalized();return x,d.cross(x).normalized()


def tube(mesh,points,radii,mat=0,sides=7):
    rings=[]
    for i,p in enumerate(points):
        direction=points[min(i+1,len(points)-1)]-points[max(0,i-1)]
        if direction.length<1e-7: direction=Vector((0,0,1))
        x,y=basis(direction);rings.append([p+radii[i]*(x*math.cos(2*math.pi*k/sides)+y*math.sin(2*math.pi*k/sides)) for k in range(sides)])
    for i in range(len(rings)-1):
        for j in range(sides):
            mesh.face([rings[i][j],rings[i][(j+1)%sides],rings[i+1][(j+1)%sides],rings[i+1][j]],[(j/sides,i/len(rings)),((j+1)/sides,i/len(rings)),((j+1)/sides,(i+1)/len(rings)),(j/sides,(i+1)/len(rings))],mat)


LEAF_U=np.array([u for i in range(8) for side in [-1,1] for u in [i/8,i/8,(i+1)/8,(i+1)/8]])
LEAF_V=np.array([v for i in range(8) for side in [-1,1] for v in [0,side,side,0]])
LEAF_UV=np.column_stack((LEAF_U,.5+.5*LEAF_V)).tolist()

def leaf(mesh,base,direction,length,width,rng,mat):
    x,y=basis(direction);d=direction.normalized();normal=d.cross(x).normalized();rotation=rng.uniform(-1.2,1.2);x=(x*math.cos(rotation)+normal*math.sin(rotation)).normalized();normal=d.cross(x).normalized()
    breadth=width*np.sin(np.pi*LEAF_U)**.8*(1+.07*np.sin(LEAF_U*np.pi*16))
    z=length*(.055*np.sin(np.pi*LEAF_U)-.07*LEAF_U*LEAF_U)+np.abs(LEAF_V)*length*.04
    positions=base.v+np.outer(length*LEAF_U,d.v)+np.outer(breadth*LEAF_V,x.v)+np.outer(z,normal.v)
    start=len(mesh.vertices);mesh.vertices.extend(positions.tolist());mesh.uv.extend(LEAF_UV);mesh.faces.extend(tuple(range(start+i,start+i+4)) for i in range(0,64,4));mesh.indices.extend([mat]*16)


def shoot(start, direction, length, up=.18, bend=.05, samples=10):
    horizontal=Vector((direction.x,direction.y,0));horizontal.normalize()
    return [start+direction*length*t+Vector((0,0,up*length*t*t))+Vector((-horizontal.y,horizontal.x,0))*length*bend*math.sin(t*math.pi) for t in [i/(samples-1) for i in range(samples)]]


def blossom(mesh,center,direction,size,seed):
    rng=random.Random(seed);x,y=basis(direction);d=direction.normalized()
    for petal in range(5):
        angle=petal*math.pi*2/5;out=x*math.cos(angle)+y*math.sin(angle);side=d.cross(out)
        for j in range(5):
            u=j/5;v=(j+1)/5
            def p(t,s): return center+out*size*t+side*size*.39*math.sin(math.pi*t)**.7*s+d*size*(.20-.32*t+.24*t*t)
            mesh.face([p(u,-1),p(u,1),p(v,1),p(v,-1)],[(u,0),(u,1),(v,1),(v,0)],0 if petal%2 else 1)
    for k in range(7):
        a=rng.random()*math.pi*2;top=center+d*size*.31+(x*math.cos(a)+y*math.sin(a))*size*.14
        tube(mesh,[center,top],[size*.012,size*.008],2,4)


def fruit(mesh,center,size,seed,mat=0):
    rng=random.Random(seed);rings=10;sides=12
    def p(j,k):
        phi=math.pi*j/rings;theta=2*math.pi*k/sides
        radial=math.sin(phi)*(1+.055*math.cos(theta*5))*size
        return center+Vector((radial*math.cos(theta),radial*math.sin(theta),size*(math.cos(phi)*.91-.12*math.exp(-((phi-.14)/.25)**2))))
    for j in range(rings):
        for k in range(sides):mesh.face([p(j,k),p(j,k+1),p(j+1,k+1),p(j+1,k)],[(k/sides,j/rings),((k+1)/sides,j/rings),((k+1)/sides,(j+1)/rings),(k/sides,(j+1)/rings)],mat)


def geometry(index,season='summer'):
    rng=random.Random(57124);h=interp(HEIGHT_KEYS,index);radius=interp(RADIUS_KEYS,index)
    wood=Mesh();leaves=Mesh();flowers=Mesh();fruits=Mesh();leaf_count=0;branch_count=0;flower_count=0;fruit_count=0
    def trunk(z):
        t=z/h;return Vector((h*.015*math.sin(t*math.pi*1.45),h*.012*math.sin(t*math.pi*2.1),z))
    stem=[trunk(h*i/24) for i in range(25)];tube(wood,stem,[radius*(1-.83*i/24)+.001 for i in range(25)],0,11)
    # Modest living root flare, not ancient oak buttresses.
    for root in range(5):
        angle=root*2*math.pi/5+.22;length=radius*3.7;direction=Vector((math.cos(angle),math.sin(angle),-.09));start=Vector((0,0,.06*radius/.106));pts=shoot(start,direction,length,.0,.045,6);tube(wood,pts,[radius*.43*(1-i/6)**1.5+.001 for i in range(6)],0,7)
    def add_leaf(base,direction,born,key,size=.13):
        nonlocal leaf_count
        maturity=smooth((index-born)/7)
        if maturity<=0 or season=='winter': return
        lr=random.Random(key);length=size*(.80+lr.random()*.40)*maturity
        if length<.007:return
        leaf(leaves,base,direction,length,length*.30,lr,key%6);leaf_count+=1
    # Initial paired leaves and then alternate true leaves. Lower juvenile
    # trunk foliage gradually self-prunes as the crown's own branches develop.
    for k in range(14):
        born=-4+k*1.8;age=smooth((index-born)/6);stay=1 if k>=9 else 1-smooth((index-28-k*.22)/16)
        if age<=0 or stay<=0: continue
        z=h*(.18+.052*k);a=k*2.399;direction=Vector((math.cos(a),math.sin(a),.19))
        add_leaf(trunk(z),direction,born,100+k,.10*stay)
    # One anatomical primary/secondary/twig topology persists in all frames.
    nodes=[.27,.32,.35,.39,.43,.46,.50,.53,.58,.64]
    births=[17,22,26,30,33,37,41,43,47,51]
    fruit_sites=[]
    for b,(node,born) in enumerate(zip(nodes,births)):
        growth=smooth((index-born)/19)
        if growth<=0:continue
        branch_count+=1;a=1.10+b*2.399;rnd=random.Random(2200+b)
        shape=1.0-.22*(node-.27)+rnd.uniform(-.10,.10)
        length=h*.63*shape*growth*(.90+rnd.random()*.20)
        direction=Vector((math.cos(a),math.sin(a),.90+.24*rnd.random())).normalized()
        start=trunk(h*node);pts=shoot(start,direction,length,.13,.12*(1 if b%2 else -1),12)
        r=radius*.45*(1-node*.4)*growth
        tube(wood,pts,[r*(1-k/12)**1.7+.001 for k in range(12)],0,7)
        for k in range(9):
            t=.2+.085*k;pos=pts[min(11,round(t*11))];la=a+(1 if k%2 else -1)*1.05
            add_leaf(pos,Vector((math.cos(la),math.sin(la),.38)),born+3+k*.55,1000+b*40+k)
        for c in range(7):
            cborn=born+8+c*2.2;cgrowth=smooth((index-cborn)/15)
            if cgrowth<=0:continue
            branch_count+=1;t=.20+c*.11;origin=pts[min(11,round(t*11))]
            angle=a+(1 if c%2 else -1)*(.76+.11*c)
            cd=Vector((math.cos(angle),math.sin(angle),.42+.055*c)).normalized()
            clength=length*(.43-.021*c)*cgrowth;cpts=shoot(origin,cd,clength,.15,.10,9)
            cr=max(.001,r*.34*cgrowth)
            tube(wood,cpts,[cr*(1-k/9)**1.5+.0006 for k in range(9)],0,6)
            for k in range(16):
                pos=cpts[min(8,round((.10+.054*k)*8))];la=angle+(1 if k%2 else -1)*1.15
                add_leaf(pos,Vector((math.cos(la),math.sin(la),.45)),cborn+2+k*.5,3000+b*200+c*20+k,.14)
            fruit_sites.append((cpts[-2],cd,10000+b*60+c))
            for twig in range(3):
                tborn=cborn+8+twig*2.0;tgrowth=smooth((index-tborn)/14)
                if tgrowth<=0:continue
                branch_count+=1;pos=cpts[3+twig*2];ta=angle+(1 if twig%2 else -1)*(1.05+.11*twig)
                td=Vector((math.cos(ta),math.sin(ta),.32));tlength=clength*.49*tgrowth;tpts=shoot(pos,td.normalized(),tlength,.14,.045,6)
                tube(wood,tpts,[max(.00035,cr*.42*(1-k/6)**1.4) for k in range(6)],0,5)
                for k in range(14):
                    lp=tpts[min(5,round((.15+.062*k)*5))];la=ta+(1 if k%2 else -1)*1.10
                    add_leaf(lp,Vector((math.cos(la),math.sin(la),.42)),tborn+1+k*.47,7000+b*300+c*40+twig*10+k,.135)
    # A visible first pink-white apple blossom develops before heavier
    # flowering, fruit set and a bearing crown. Delays are per shoot, not swaps.
    if index>=48 and season!='winter':
        site=(trunk(h*.72)+Vector((0,-.04,.015)),Vector((0,-1,.25)),888)
        if fruit_sites: site=sorted(fruit_sites,key=lambda item:item[0].y)[0]
        sites=[site]+fruit_sites[::3]
        for n,(position,direction,key) in enumerate(sites):
            fborn=52+n*1.3;opening=smooth((index-fborn+3)/5);fading=1-smooth((index-(65+n*.35))/8)
            if index<52 and n<3:
                fruit(flowers,position,.014*smooth((index-46)/4),key,1)
            if index>=52 and opening>0 and fading>.05:
                blossom(flowers,position,Vector((8,-13,4.0)).normalized(),.07*opening*fading,key);flower_count+=1
            fgrowth=smooth((index-(63+n*.45)+1)/11)
            if fgrowth>0:
                fruit(fruits,position+Vector((0,0,-.037*fgrowth)),.083*fgrowth,key,0 if index<76 else 1);fruit_count+=1
    wood.object('Apple tree · living branches',[BARK])
    if leaves.faces: leaves.object('Curved, veined leaves',LEAVES_AUTUMN if season=='fall' else LEAVES)
    if flowers.faces:flowers.object('Five-petal apple blossoms',[PETAL_WHITE,PETAL_PINK,POLLEN])
    if fruits.faces:fruits.object('Fruit developing from blossoms',[FRUIT_GREEN,FRUIT_RED])
    return {'frame':index,'heightMeters':round(h,4),'trunkRadiusMeters':round(radius,5),'branches':branch_count,'leaves':leaf_count,'blossoms':flower_count,'fruit':fruit_count,'season':season}


def setup(args):
    global TEXTURES,BARK,LEAVES,LEAVES_AUTUMN,PETAL_WHITE,PETAL_PINK,POLLEN,FRUIT_GREEN,FRUIT_RED
    TEXTURES=args.output/'.textures';TEXTURES.mkdir(parents=True,exist_ok=True)
    BARK=bark_material();LEAVES=[leaf_material(i) for i in range(6)];LEAVES_AUTUMN=[leaf_material(i,True) for i in range(6)]
    PETAL_WHITE=material('Ivory petals',(.81,.75,.70),.65);PETAL_PINK=material('Apple blossom pink',(.83,.55,.60),.65);POLLEN=material('Warm pollen',(.80,.39,.048),.6)
    FRUIT_GREEN=material('Young fruit',(.23,.35,.022),.3);FRUIT_RED=material('Russet apples',(.39,.025,.010),.25)


def scene_dictionary(args,index):
    # Nursery close-ups retain leaf and bud detail in the early frames. The UI
    # displays these anatomically different images at smoothly increasing sizes.
    scale=min(6.3,max(.30,interp(HEIGHT_KEYS,index)*1.5+.15))
    direction=np.array([8.,-13.,4.28]);direction/=np.linalg.norm(direction)
    target=np.array([0.,0.,scale*.45/math.sqrt(1-direction[2]**2)])
    origin=target+direction*scale*2.4
    camera=mi.ScalarTransform4f.look_at(origin=origin.tolist(),target=target.tolist(),up=[0,0,1])@mi.ScalarTransform4f.scale([scale/2,scale/2,1])
    scene={'type':'scene','integrator':{'type':'path','max_depth':5,'hide_emitters':True},'sensor':{'type':'orthographic','to_world':camera,'near_clip':.01,'far_clip':100,'sampler':{'type':'independent','sample_count':args.samples},'film':{'type':'hdrfilm','width':args.size,'height':args.size,'pixel_format':'rgba','rfilter':{'type':'tent'}}},'sky':{'type':'constant','radiance':{'type':'rgb','value':[.65,.72,.80]}}}
    for number,(origin,power,size,color) in enumerate([([-3,-4,7],4.0,4.5,[1,.94,.84]),([5,-2,4.6],2.0,4,[.85,.94,1]),([-2,4,6],3.0,3,[1,1,.90])]):
        transform=mi.ScalarTransform4f.look_at(origin=origin,target=[0,0,2.5],up=[0,0,1])@mi.ScalarTransform4f.scale([size/2,size/2,1]);scene[f'light{number}']={'type':'rectangle','to_world':transform,'emitter':{'type':'area','radiance':{'type':'rgb','value':[power*v for v in color]}}}
    scene.update(SHAPES);return scene


def render(index,season,args):
    SHAPES.clear();started=time.monotonic();metrics=geometry(index,season);scene=mi.load_dict(scene_dictionary(args,index));image=mi.render(scene,seed=15,spp=args.samples)
    suffix='' if season=='summer' else f'-{season}';path=args.output/f'growth-{index:03d}{suffix}.png';path.parent.mkdir(parents=True,exist_ok=True)
    mi.Bitmap(image).convert(mi.Bitmap.PixelFormat.RGBA, mi.Struct.Type.UInt8, True).write(str(path))
    # Map the renderer's fixed baseline to the scene's 95% root anchor once.
    # Keep every plant at its physical rendered size; do not normalize seedlings
    # to the mature silhouette. Transparent pixels stay genuinely transparent.
    metrics['file']=path.name;metrics['seconds']=round(time.monotonic()-started,2);metrics['sha256']=hashlib.sha256(path.read_bytes()).hexdigest();print('FRAME_DONE '+json.dumps(metrics),flush=True);return metrics


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--frames',default='0,14,28,42,54,66,80,99');parser.add_argument('--output',type=Path,default=ROOT/'assets'/'tree-growth');parser.add_argument('--size',type=int,default=640);parser.add_argument('--samples',type=int,default=12);parser.add_argument('--threads',type=int,default=3);parser.add_argument('--season',default='summer');parser.add_argument('--seasons',action='store_true');args=parser.parse_args()
    frames=list(range(100)) if args.frames=='all' else list(range(*map(int,args.frames.split(':')))) if ':' in args.frames else [int(x) for x in args.frames.split(',')]
    setup(args);metrics=[]
    for index in frames:
        if not 0<=index<=99:raise ValueError('Expected growth image 0–99')
        metrics.append(render(index,args.season,args))
        if args.seasons and index>=80:
            for season in ['fall','winter']:metrics.append(render(index,season,args))
    (args.output/'render-manifest.json').write_text(json.dumps({'renderer':'Mitsuba 3.7.1 scalar CPU path tracer','seed':57124,'growthImages':len(frames),'frames':metrics},indent=2)+'\n')
    print('ATLAS_COMPLETE',len(metrics),flush=True)

if __name__=='__main__': main()
