from PIL import Image, ImageDraw

BLUE=(11,31,58); BLUE2=(15,39,71); GOLD=(232,181,77)

def draw_facade(d, S, inset):
    """Draw a classical courthouse facade centered, scaled to area [inset, S-inset]."""
    x0=inset; x1=S-inset; w=x1-x0
    cx=S/2
    top=x0
    # Pediment (triangle)
    ph=w*0.22
    d.polygon([(cx, top), (x0, top+ph), (x1, top+ph)], fill=GOLD)
    # Architrave bar
    ay=top+ph
    bar=w*0.10
    d.rectangle([x0+w*0.04, ay, x1-w*0.04, ay+bar], fill=GOLD)
    # Columns
    col_top=ay+bar+w*0.04
    base_h=w*0.08
    col_bottom=x1- base_h
    ncols=4
    span=(x1-w*0.10)-(x0+w*0.10)
    cw=span/(ncols*2-1)
    sx=x0+w*0.10
    for i in range(ncols):
        lx=sx+i*2*cw
        d.rectangle([lx, col_top, lx+cw, col_bottom], fill=GOLD)
    # Base steps
    d.rectangle([x0+w*0.02, col_bottom, x1-w*0.02, col_bottom+base_h*0.5], fill=GOLD)
    d.rectangle([x0-0+w*-0.0, col_bottom+base_h*0.5, x1, col_bottom+base_h], fill=GOLD)

def make(size, maskable=False, fname="out.png"):
    img=Image.new("RGB",(size,size),BLUE)
    # subtle vertical gradient
    top=BLUE; bot=BLUE2
    for y in range(size):
        t=y/size
        r=int(top[0]+(bot[0]-top[0])*t); g=int(top[1]+(bot[1]-top[1])*t); b=int(top[2]+(bot[2]-top[2])*t)
        for x in range(0,size,size): pass
        img.paste((r,g,b),[0,y,size,y+1])
    d=ImageDraw.Draw(img)
    inset = size*(0.22 if maskable else 0.16)  # maskable keeps content in safe zone
    draw_facade(d, size, inset)
    img.save(fname)
    print("wrote", fname)

make(192, False, "site/icons/icon-192.png")
make(512, False, "site/icons/icon-512.png")
make(180, False, "site/icons/icon-180.png")
make(512, True,  "site/icons/icon-maskable-512.png")

svg='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="18" fill="#0b1f3a"/>
<g fill="#e8b54d">
<polygon points="50,16 18,38 82,38"/>
<rect x="20" y="40" width="60" height="7"/>
<rect x="22" y="50" width="9" height="30"/>
<rect x="38" y="50" width="9" height="30"/>
<rect x="54" y="50" width="9" height="30"/>
<rect x="70" y="50" width="9" height="30"/>
<rect x="18" y="80" width="64" height="5"/>
</g></svg>'''
open("site/icons/icon.svg","w").write(svg)
print("wrote icon.svg")
