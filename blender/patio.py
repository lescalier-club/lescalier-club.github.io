# Patio méditerranéen en colimaçon pour le site de L'Escalier. Rendu Cycles, lumière simulée (rebonds réels).
# Usage :
#   blender -b -P blender/patio.py -- --essai 0,0.5,1 --largeur 1600 --hauteur 900 --sortie rendu/essai
#   blender -b -P blender/patio.py -- --images 240 --largeur 1600 --hauteur 900 --sortie rendu/desktop
# La trajectoire de caméra reprend exactement montee/spirale.js (mêmes constantes).
import bpy, bmesh, math, sys, os, random
from mathutils import Vector

# ---------- paramètres (identiques à spirale.js) ----------
ETAGES, TOURS, RAYON, HAUTEUR = 9, 3.5, 11.2, 30.0
MUR_R = 13.0
ARCHES = 6
DENSITE_BRUME = 0.03
ROTATION_CIEL = 140   # oriente le soleil du ciel photographié pour qu'il entre par l'ouverture

def borne(t): return min(1.0, max(0.0, t))
def point_spirale(t, rayon=RAYON):
    a = borne(t) * TOURS * math.pi * 2
    # Blender : Z vers le haut. spirale.js : (x, y=hauteur, z) -> Blender (x, -z, y)
    return Vector((math.cos(a) * rayon, -math.sin(a) * rayon, borne(t) * HAUTEUR))
def camera_a(t):
    """Caméra proche de l'axe du patio : elle monte en tournant lentement et regarde l'escalier s'enrouler
    vers l'ouverture lumineuse ; au sommet, le regard se pose sur l'horizon."""
    u = borne(t)
    a = u * math.pi * 2 * 1.25 + 0.6
    z = 1.7 + u * (HAUTEUR - 0.6)
    pos = Vector((math.cos(a) * 4.2, -math.sin(a) * 4.2, z))
    haut = Vector((-math.cos(a) * 3.0, math.sin(a) * 3.0, z + 13.0 * (1 - 0.55 * u)))   # le tourbillon ; le regard s'abaisse en montant
    k = min(1.0, max(0.0, (u - 0.82) / 0.16)); lisse = k * k * (3 - 2 * k)
    loin = Vector((math.cos(a) * 60.0, -math.sin(a) * 60.0, z + 0.5))    # au sommet : l'horizon, au-delà du mur
    return pos, haut.lerp(loin, lisse)

def args():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    d = {'export': None, 'essai': None, 'images': 0, 'largeur': 1600, 'hauteur': 900, 'sortie': 'rendu/essai', 'echantillons': 128, 'debut': 0}
    for i in range(0, len(a), 2):
        k = a[i].lstrip('-'); v = a[i + 1]
        d[k] = v if k in ('essai', 'sortie', 'export') else int(v)
    return d

# ---------- matières ----------
def hexa(h, a=1.0):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b), a)

def matiere(nom, couleur, rugosite=0.5, metal=0.0, **extra):
    m = bpy.data.materials.new(nom); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexa(couleur)
    b.inputs['Roughness'].default_value = rugosite
    b.inputs['Metallic'].default_value = metal
    for k, v in extra.items(): b.inputs[k].default_value = v
    return m

def marbre(nom, fond, veine, rugosite=0.3, echelle=1.6):
    m = bpy.data.materials.new(nom); m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n['Principled BSDF']; b.inputs['Roughness'].default_value = rugosite
    coord = n.new('ShaderNodeTexCoord')
    bruit = n.new('ShaderNodeTexNoise'); bruit.inputs['Scale'].default_value = echelle; bruit.inputs['Detail'].default_value = 8
    onde = n.new('ShaderNodeTexWave'); onde.inputs['Scale'].default_value = echelle * 0.8
    onde.inputs['Distortion'].default_value = 4; onde.inputs['Detail'].default_value = 4; onde.inputs['Detail Scale'].default_value = 1.5
    rampe = n.new('ShaderNodeValToRGB')
    rampe.color_ramp.elements[0].position = 0.0; rampe.color_ramp.elements[0].color = hexa(veine)
    rampe.color_ramp.elements[1].position = 0.045; rampe.color_ramp.elements[1].color = hexa(fond)
    l.new(coord.outputs['Object'], bruit.inputs['Vector']); l.new(bruit.outputs['Color'], onde.inputs['Vector'])
    l.new(onde.outputs['Fac'], rampe.inputs['Fac']); l.new(rampe.outputs['Color'], b.inputs['Base Color'])
    return m

RES = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ressources')
EXPORT = '--export' in sys.argv          # mode « fichier 3D pour le web » : UV, textures précuites, pas de brume

def texture_teintee(dossier, teinte, taille=1024):
    """Pour le web : la couleur de la DA est précuite dans la texture (72 % teinte, 28 % grain réel)."""
    import numpy as np
    dst = os.path.join(RES, 'textures_web', f'{dossier}_{teinte.strip("#")}.jpg')
    if os.path.exists(dst): return dst
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = bpy.data.images.load(os.path.join(RES, 'textures', dossier, 'diff.jpg'))
    im.scale(taille, taille)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(-1, 4)
    t = np.array(hexa(teinte)[:3], dtype=np.float32)
    # les pixels de Blender sont linéaires ; on mélange en linéaire comme dans le rendu
    px[:, :3] = px[:, :3] * 0.28 + t * 0.72
    im.pixels = px.ravel().tolist()
    im.filepath_raw = dst; im.file_format = 'JPEG'; im.save()
    return dst

def pbr(nom, dossier, echelle=1.0, teinte=None, rugosite_mult=1.0):
    """Matière à partir des cartes Poly Haven (couleur, rugosité, relief), projetée en boîte : pas de dépliage nécessaire."""
    m = bpy.data.materials.new(nom); m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links; b = n['Principled BSDF']
    if EXPORT:   # version web : coordonnées UV (en mètres), couleur précuite, rugosité fixe, relief gardé
        coord = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (echelle, echelle, 1)
        l.new(coord.outputs['UV'], mp.inputs['Vector'])
        d = n.new('ShaderNodeTexImage')
        d.image = bpy.data.images.load(texture_teintee(dossier, teinte) if teinte else os.path.join(RES, 'textures', dossier, 'diff.jpg'))
        l.new(mp.outputs['Vector'], d.inputs['Vector']); l.new(d.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = min(1.0, 0.75 * rugosite_mult)
        nt = n.new('ShaderNodeTexImage'); nt.image = bpy.data.images.load(os.path.join(RES, 'textures', dossier, 'nor_gl.jpg'))
        nt.image.colorspace_settings.name = 'Non-Color'; l.new(mp.outputs['Vector'], nt.inputs['Vector'])
        nm = n.new('ShaderNodeNormalMap'); l.new(nt.outputs['Color'], nm.inputs['Color']); l.new(nm.outputs['Normal'], b.inputs['Normal'])
        return m
    coord = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (echelle,) * 3
    l.new(coord.outputs['Object'], mp.inputs['Vector'])
    def img(fichier, couleur):
        t = n.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(RES, 'textures', dossier, fichier))
        t.projection = 'BOX'; t.projection_blend = 0.25
        if not couleur: t.image.colorspace_settings.name = 'Non-Color'
        l.new(mp.outputs['Vector'], t.inputs['Vector']); return t
    d = img('diff.jpg', True)
    if teinte:
        mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MIX'; mix.inputs['Factor'].default_value = 0.72
        l.new(d.outputs['Color'], mix.inputs['A']); mix.inputs['B'].default_value = hexa(teinte)   # 72 % la couleur de la DA, 28 % le grain réel
        l.new(mix.outputs['Result'], b.inputs['Base Color'])
    else: l.new(d.outputs['Color'], b.inputs['Base Color'])
    r = img('rough.jpg', False)
    if rugosite_mult != 1.0:
        mm = n.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = rugosite_mult
        l.new(r.outputs['Color'], mm.inputs[0]); l.new(mm.outputs['Value'], b.inputs['Roughness'])
    else: l.new(r.outputs['Color'], b.inputs['Roughness'])
    nm = n.new('ShaderNodeNormalMap'); nt = img('nor_gl.jpg', False)
    l.new(nt.outputs['Color'], nm.inputs['Color']); l.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m

_MODELES = {}
def importer(nom, position, hauteur_voulue=None, rotation=0.0):
    """Charge une fois un modèle Poly Haven (gltf) dans une collection cachée, puis le pose en instance (rapide)."""
    if nom not in _MODELES:
        avant = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(RES, 'modeles', nom, nom + '.gltf'))
        neufs = [o for o in bpy.data.objects if o not in avant]
        coll = bpy.data.collections.new('modele_' + nom)
        for o in neufs:
            for c in list(o.users_collection): c.objects.unlink(o)
            coll.objects.link(o)
        bpy.context.view_layer.update()
        zs = [(o.matrix_world @ Vector(c)).z for o in neufs if o.type == 'MESH' for c in o.bound_box]
        _MODELES[nom] = (coll, (max(zs) - min(zs)) if zs else 1.0, min(zs) if zs else 0.0)
    coll, h, zmin = _MODELES[nom]
    inst = bpy.data.objects.new(nom, None); inst.instance_type = 'COLLECTION'; inst.instance_collection = coll
    bpy.context.scene.collection.objects.link(inst)
    k = (hauteur_voulue / h) if hauteur_voulue else 1.0
    inst.scale = (k,) * 3; inst.location = (position[0], position[1], position[2] - zmin * k); inst.rotation_euler.z = rotation
    return inst

def appliquer(obj, m): obj.data.materials.clear(); obj.data.materials.append(m)
def lisser(obj):
    for p in obj.data.polygons: p.use_smooth = True

# ---------- scène ----------
def vider():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mur(m_marbre, m_corniche):
    # Mur épais avec des arches creusées à chaque étage : la lumière y entre et y meurt doucement
    bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=MUR_R + 0.6, depth=HAUTEUR + 1, location=(0, 0, (HAUTEUR + 1) / 2))
    exterieur = bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=MUR_R, depth=HAUTEUR + 3, location=(0, 0, (HAUTEUR + 1) / 2))
    interieur = bpy.context.object
    bm = exterieur.modifiers.new('creux', 'BOOLEAN'); bm.operation = 'DIFFERENCE'; bm.object = interieur; bm.solver = 'EXACT'
    bpy.context.view_layer.objects.active = exterieur; bpy.ops.object.modifier_apply(modifier='creux')
    bpy.data.objects.remove(interieur)
    # Les arches : toutes les formes coupantes dans une collection, un seul booléen
    coll = bpy.data.collections.new('arches'); bpy.context.scene.collection.children.link(coll)
    def dans_coll(o):
        for c in list(o.users_collection): c.objects.unlink(o)
        coll.objects.link(o)
    for e in range(ETAGES - 1):
        z0 = e / (ETAGES - 1) * HAUTEUR + 0.5
        for k in range(ARCHES):
            a = k / ARCHES * math.pi * 2
            x, y = math.cos(a) * (MUR_R + 0.3), math.sin(a) * (MUR_R + 0.3)
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z0 + 1.0))
            bas = bpy.context.object; bas.scale = (1.4, 2.2, 2.0); bas.rotation_euler.z = a; dans_coll(bas)
            bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.1, depth=1.4, location=(x, y, z0 + 2.0))
            haut = bpy.context.object; haut.rotation_euler = (math.pi / 2, 0, a + math.pi / 2); dans_coll(haut)
    bm = exterieur.modifiers.new('arches', 'BOOLEAN'); bm.operation = 'DIFFERENCE'
    bm.operand_type = 'COLLECTION'; bm.collection = coll; bm.solver = 'EXACT'
    bpy.context.view_layer.objects.active = exterieur; bpy.ops.object.modifier_apply(modifier='arches')
    for o in list(coll.objects): bpy.data.objects.remove(o)
    bpy.data.collections.remove(coll)
    exterieur.name = 'mur'; appliquer(exterieur, m_marbre)
    # Fond des arches : un cylindre sombre et chaud juste derrière, pour la profondeur
    bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=MUR_R + 0.62, depth=HAUTEUR + 1, end_fill_type='NOTHING', location=(0, 0, (HAUTEUR + 1) / 2))
    appliquer(bpy.context.object, M_FOND_DORE)   # le fond des arches est doré : il capte la lumière

def sol(m_sol, m_corniche):
    bpy.ops.mesh.primitive_circle_add(vertices=160, radius=MUR_R + 0.6, fill_type='NGON', location=(0, 0, 0))
    appliquer(bpy.context.object, m_sol)
    bpy.ops.mesh.primitive_torus_add(major_radius=2.6, minor_radius=0.18, location=(0, 0, 0.05)); appliquer(bpy.context.object, m_corniche)

def escalier(m_marche, m_or, m_laiton, m_balustre):
    n = 140
    for i in range(n):
        t = i / (n - 1); p = point_spirale(t); a = t * TOURS * math.pi * 2
        bpy.ops.mesh.primitive_cube_add(size=1, location=(p.x, p.y, p.z))
        m = bpy.context.object; m.scale = (2.7, 1.9, 0.26); m.rotation_euler.z = -a
        bev = m.modifiers.new('arrondi', 'BEVEL'); bev.width = 0.05; bev.segments = 3
        appliquer(m, m_marche)
        if i % 3 == 0:   # balustres côté patio
            q = point_spirale(t, RAYON - 1.2)
            bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.05, depth=1.0, location=(q.x, q.y, q.z + 0.65))
            appliquer(bpy.context.object, m_balustre)
    for k in range(ETAGES):   # liseré doré au nez de chaque palier
        t = k / (ETAGES - 1); p = point_spirale(t); a = t * TOURS * math.pi * 2
        bpy.ops.mesh.primitive_cube_add(size=1, location=(p.x, p.y, p.z + 0.16))
        l = bpy.context.object; l.scale = (2.72, 0.08, 0.04); l.rotation_euler.z = -a
        th = -a; l.location -= Vector((math.sin(th), -math.cos(th), 0)) * 0.87   # nez de la marche, côté descente
        appliquer(l, m_or)
    # Main courante en laiton : une courbe qui suit la spirale
    courbe = bpy.data.curves.new('rampe', 'CURVE'); courbe.dimensions = '3D'; courbe.bevel_depth = 0.05; courbe.bevel_resolution = 4
    s = courbe.splines.new('POLY'); pts = 300; s.points.add(pts - 1)
    for i in range(pts):
        q = point_spirale(i / (pts - 1), RAYON - 1.2); s.points[i].co = (q.x, q.y, q.z + 1.18, 1)
    o = bpy.data.objects.new('rampe', courbe); bpy.context.collection.objects.link(o); o.data.materials.append(m_laiton)

def olivier(m_tronc, m_feuilles):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.45, depth=5.2, location=(0, 0, 2.6))
    tr = bpy.context.object; tr.rotation_euler.x = 0.06
    tw = tr.modifiers.new('torsion', 'SIMPLE_DEFORM'); tw.deform_method = 'TWIST'; tw.angle = 0.9
    appliquer(tr, m_tronc); lisser(tr)
    tex = bpy.data.textures.new('feuillage', 'CLOUDS'); tex.noise_scale = 0.35
    for (x, y, z, r) in [(0, 0, 6.0, 2.3), (1.4, 0.5, 5.4, 1.6), (-1.3, -0.4, 5.6, 1.7), (0.2, -0.6, 7.0, 1.4), (-0.6, 1.0, 6.5, 1.3)]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=r, location=(x, y, z))
        f = bpy.context.object; d = f.modifiers.new('relief', 'DISPLACE'); d.texture = tex; d.strength = 0.6
        lisser(f); appliquer(f, m_feuilles)

def decor(m_fleur, m_terre, m_buis):
    random.seed(42)
    # De vraies plantes posées dans une niche sur deux (les arches sont aux mêmes angles que dans mur())
    for e in range(ETAGES - 1):
        z0 = e / (ETAGES - 1) * HAUTEUR + 0.5
        for k in range(e % 2, ARCHES, 2):
            a = k / ARCHES * math.pi * 2
            importer('potted_plant_01' if (e + k) % 3 else 'potted_plant_02',
                     (math.cos(a) * (MUR_R + 0.2), math.sin(a) * (MUR_R + 0.2), z0), 1.5, a + random.random())
    for k in range(8):
        a = k / 8 * math.pi * 2 + 0.3; x, y = math.cos(a) * (MUR_R - 1.5), math.sin(a) * (MUR_R - 1.5)
        importer('potted_plant_01' if k % 2 else 'potted_plant_02', (x, y, 0), 1.6, a)
    for e in (2, 4, 6):   # quelques plantes sur les paliers
        p = point_spirale(e / (ETAGES - 1), MUR_R - 0.9)
        importer('potted_plant_02' if e % 4 else 'potted_plant_01', (p.x, p.y, p.z + 0.15), 1.2, e)

def brume():
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=MUR_R - 0.05, depth=HAUTEUR + 0.8, location=(0, 0, (HAUTEUR + 0.8) / 2))
    v = bpy.context.object; v.name = 'brume'
    m = bpy.data.materials.new('brume'); m.use_nodes = True; n = m.node_tree.nodes
    n.remove(n['Principled BSDF']); vol = n.new('ShaderNodeVolumePrincipled')
    vol.inputs['Density'].default_value = DENSITE_BRUME; vol.inputs['Anisotropy'].default_value = 0.8
    vol.inputs['Color'].default_value = hexa('#FFF3DF')
    m.node_tree.links.new(vol.outputs['Volume'], n['Material Output'].inputs['Volume']); appliquer(v, m)

def toit_et_roi(m_toit, m_or):
    bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=MUR_R + 0.6, depth=0.3, location=(0, 0, HAUTEUR + 1.15))
    t = bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=MUR_R - 3.2, depth=1.0, location=(0, 0, HAUTEUR + 1.15))
    trou = bpy.context.object
    b = t.modifiers.new('ouverture', 'BOOLEAN'); b.operation = 'DIFFERENCE'; b.object = trou
    bpy.context.view_layer.objects.active = t; bpy.ops.object.modifier_apply(modifier='ouverture'); bpy.data.objects.remove(trou)
    appliquer(t, m_toit)
    # Le roi : profil du logo, tourné
    profil = [(0, 0), (1.3, 0), (1.3, 0.25), (1.05, 0.35), (0.95, 0.6), (0.6, 0.8), (0.45, 2.2), (0.75, 2.35), (0.75, 2.55),
              (0.5, 2.65), (0.7, 3.3), (0.25, 3.45), (0, 3.45)]
    bm_ = bmesh.new(); verts = [bm_.verts.new((x, 0, z)) for x, z in profil]
    for i in range(len(verts) - 1): bm_.edges.new((verts[i], verts[i + 1]))
    me = bpy.data.meshes.new('roi'); bm_.to_mesh(me); roi = bpy.data.objects.new('roi', me); bpy.context.collection.objects.link(roi)
    sc = roi.modifiers.new('tour', 'SCREW'); sc.steps = 64; sc.render_steps = 64
    fin = point_spirale(1); a = math.atan2(fin.y, fin.x) - 0.55
    roi.location = (math.cos(a) * (MUR_R - 1.6), math.sin(a) * (MUR_R - 1.6), HAUTEUR + 1.3)
    appliquer(roi, m_or); lisser(roi)
    for (sx, sz, z) in [(0.22, 0.9, 3.85), (0.62, 0.2, 3.95)]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(roi.location.x, roi.location.y, roi.location.z + z))
        c = bpy.context.object; c.scale = (sx, 0.22, sz); appliquer(c, m_or)

def mer(m_mer):
    # Un anneau : la mer entoure la villa mais ne passe pas au-dessus du patio
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=600, depth=0.2, location=(0, 0, HAUTEUR - 6))
    m = bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=MUR_R + 0.7, depth=2, location=(0, 0, HAUTEUR - 6))
    trou = bpy.context.object
    b = m.modifiers.new('trou', 'BOOLEAN'); b.operation = 'DIFFERENCE'; b.object = trou
    bpy.context.view_layer.objects.active = m; bpy.ops.object.modifier_apply(modifier='trou'); bpy.data.objects.remove(trou)
    appliquer(m, m_mer)

def lumiere(scene):
    # Un vrai ciel de coucher de soleil photographié (HDRI Poly Haven) : il éclaire toute la scène, soleil compris
    w = bpy.data.worlds.new('ciel'); scene.world = w; w.use_nodes = True
    n, l = w.node_tree.nodes, w.node_tree.links
    env = n.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(os.path.join(RES, 'ciel', 'citrus_orchard_puresky_2k.hdr'))
    coord = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, 0, math.radians(ROTATION_CIEL))
    l.new(coord.outputs['Generated'], mp.inputs['Vector']); l.new(mp.outputs['Vector'], env.inputs['Vector'])
    l.new(env.outputs['Color'], n['Background'].inputs['Color']); n['Background'].inputs['Strength'].default_value = 0.7
    # Le soleil de fin d'après-midi, chaud, qui entre par l'ouverture et glisse sur le mur
    soleil = bpy.data.lights.new('soleil', 'SUN'); soleil.energy = 6.0; soleil.angle = math.radians(1.5); soleil.color = (1.0, 0.82, 0.6)
    o = bpy.data.objects.new('soleil', soleil); scene.collection.objects.link(o)
    o.rotation_euler = (math.radians(90 - 62), 0, math.radians(305))

def camera(scene, largeur, hauteur):
    cam = bpy.data.cameras.new('cam'); cam.sensor_fit = 'VERTICAL'; cam.angle_y = math.radians(66 if largeur >= hauteur else 80)
    cam.clip_end = 2000
    o = bpy.data.objects.new('cam', cam); scene.collection.objects.link(o); scene.camera = o
    return o

def placer(cam_o, t):
    # La lumière monte avec le visiteur : exposition et soleil plus forts en haut
    sc = bpy.context.scene; sc.view_settings.exposure = 0.45 + 0.75 * t
    soleil = bpy.data.objects.get('soleil')
    if soleil: soleil.data.energy = 9.0 + 7.0 * t
    brume = bpy.data.materials.get('brume')
    if brume: brume.node_tree.nodes['Principled Volume'].inputs['Density'].default_value = DENSITE_BRUME * (0.6 + 0.8 * t)
    pos, cible = camera_a(t)
    cam_o.location = pos
    d = cible - pos; cam_o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

def construire():
    vider(); scene = bpy.context.scene
    M = {
        'marbre': pbr('enduit', 'painted_plaster_wall', 0.35, '#FBF1E2'),
        'sol': pbr('sol', 'marble_tiles', 0.25, '#FFF8EE', 0.18),
        'corniche': pbr('corniche', 'beige_wall_001', 0.5, '#FFF4E4'),
        'marche': pbr('marche', 'marble_01', 0.45, '#FFF6E8', 0.35),
        'or': matiere('or', '#F4C247', 0.22, 1.0),
        'laiton': matiere('laiton', '#C9A465', 0.3, 0.9),
        'balustre': matiere('balustre', '#E9DFCC', 0.5),
        'tronc': matiere('tronc', '#7A6248', 0.9),
        'feuilles': matiere('feuilles', '#8E9C6E', 0.8),
        'fleur': matiere('fleur', '#D0638F', 0.7),
        'terre': matiere('terre', '#C8673A', 0.75),
        'buis': matiere('buis', '#6F8754', 0.85),
        'toit': pbr('toit', 'painted_plaster_wall', 0.35, '#FBF1E2'),
        'mer': matiere('mer', '#3E7F99', 0.08, 0.0),
    }
    global M_FOND_DORE; M_FOND_DORE = matiere('fond_dore', '#E2B85C', 0.38, 0.75)
    mur(M['marbre'], M['corniche']); sol(M['sol'], M['corniche'])
    if not EXPORT: brume()
    escalier(M['marche'], M['or'], M['laiton'], M['balustre'])
    importer('island_tree_01', (0, 0, 0), 5.5); decor(M['fleur'], M['terre'], M['buis'])
    toit_et_roi(M['toit'], M['or']); mer(M['mer']); lumiere(scene)
    return scene

def regler_rendu(scene, largeur, hauteur, echantillons):
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'METAL'; prefs.get_devices()
        for d in prefs.devices: d.use = True
        scene.cycles.device = 'GPU'
    except Exception: pass
    scene.cycles.samples = echantillons; scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 8; scene.cycles.diffuse_bounces = 4; scene.cycles.volume_bounces = 1; scene.cycles.volume_step_rate = 4
    scene.render.resolution_x, scene.render.resolution_y = largeur, hauteur
    scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = 0.7
    scene.render.image_settings.file_format = 'PNG'

def exporter_web(chemin):
    """UV en mètres pour toutes les formes construites, puis export GLB compressé (Draco, textures WebP)."""
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH' or o.data.users > 1 and o.name.startswith('modele_'): continue
        if any(c.name.startswith('modele_') for c in o.users_collection): continue   # modèles Poly Haven : UV d'origine
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        for mo in list(o.modifiers):
            try: bpy.ops.object.modifier_apply(modifier=mo.name)
            except Exception: pass
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.cube_project(cube_size=1.0, scale_to_bounds=False, correct_aspect=True)
        bpy.ops.object.mode_set(mode='OBJECT')
    for o in [o for o in bpy.context.scene.objects if o.type in ('LIGHT', 'CAMERA')]: bpy.data.objects.remove(o)
    bpy.ops.export_scene.gltf(filepath=chemin, export_format='GLB', export_apply=True, export_image_format='WEBP',
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                              export_lights=False, export_cameras=False, export_yup=True)
    print('EXPORT OK', chemin, os.path.getsize(chemin) // 1024, 'Ko')

def main():
    a = args()
    if a['export']:
        construire(); exporter_web(os.path.abspath(a['export'])); return
    scene = construire(); regler_rendu(scene, a['largeur'], a['hauteur'], a['echantillons'])
    cam = camera(scene, a['largeur'], a['hauteur'])
    os.makedirs(a['sortie'], exist_ok=True)
    if a['essai']:
        for t in [float(x) for x in a['essai'].split(',')]:
            placer(cam, t); scene.render.filepath = os.path.join(a['sortie'], f'essai-{t:.2f}.png')
            bpy.ops.render.render(write_still=True)
    else:
        n = a['images']
        for i in range(a['debut'], n):
            sortie = os.path.join(a['sortie'], f'{i:04d}.png')
            if os.path.exists(sortie): continue        # reprise possible après interruption
            placer(cam, i / (n - 1)); scene.render.filepath = sortie
            bpy.ops.render.render(write_still=True)

main()
