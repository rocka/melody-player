#!/usr/bin/env python3

from io import StringIO, BytesIO
from re import sub
from copy import deepcopy
from subprocess import call
from collections import defaultdict
from lxml import etree

def remove_elm(doc, xpath):
    elm = doc.xpath(xpath)[0]
    elm.getparent().remove(elm)

def create_ligature_set(glyph):
    elm = etree.Element('LigatureSet')
    elm.set('glyph', glyph)
    return elm

glyphs = []
liga_map = defaultdict(list)
xpath_tmpl = "/ttFont/GSUB/LookupList/Lookup/LigatureSubst/LigatureSet[@glyph='{}']//Ligature[@components='{}']"

call([
    'ttx',
    'material-icons.woff2'
])

md_icons = etree.parse('material-icons.ttx')

call(['rm', 'material-icons.ttx'])

with open('icon-names.txt') as f:
    ic_names = [i.strip() for i in f.readlines()]
    ic_names.sort()
    for i in ic_names:
        liga_map[i[0]].append(i)
    for letter, names in liga_map.items():
        for name in names:
            compo = sub(r'(\w)', r'\1,', name)[2:-1].replace('_', 'underscore')
            try:
                ligature = md_icons.xpath(xpath_tmpl.format(letter, compo))[0]
                glyphs.append(ligature.get('glyph'))
            except IndexError:
                print("Error: no such icon name={}".format(name))

with open('glyph_names.txt', 'w') as the_file:
    the_file.write(','.join(glyphs))

call([
    'pyftsubset', 
    'material-icons.woff2', 
    '--gids=13-39', 
    '--glyphs={}'.format(','.join(glyphs)),
    '--layout-features-=liga',
    '--output-file=needed-glyph.ttf'
])

call([
    'ttx',
    'needed-glyph.ttf'
])

call(['rm', 'needed-glyph.ttf'])

needed = etree.parse('needed-glyph.ttx')
gsub = needed.xpath('/ttFont/GSUB')[0]

remove_elm(gsub, '/ttFont/GSUB/ScriptList')
remove_elm(gsub, '/ttFont/GSUB/FeatureList')
gsub.append(deepcopy(md_icons.xpath('/ttFont/GSUB/ScriptList')[0]))
gsub.append(deepcopy(md_icons.xpath('/ttFont/GSUB/FeatureList')[0]))

lookup_list = gsub.xpath('/ttFont/GSUB/LookupList')[0]
lookup = etree.Element('Lookup')
lookup.set('index', '0')
lookup_list.append(lookup)
lookup.append(deepcopy(md_icons.xpath('/ttFont/GSUB/LookupList/Lookup/LookupType')[0]))
lookup.append(deepcopy(md_icons.xpath('/ttFont/GSUB/LookupList/Lookup/LookupFlag')[0]))

ligature_subst = etree.Element('LigatureSubst')
ligature_subst.set('index', '0')
ligature_subst.set('Format', '1')

lookup.append(ligature_subst)

for letter, names in liga_map.items():
    ligature_set = create_ligature_set(letter)
    ligature_subst.append(ligature_set)
    for name in names:
        compo = sub(r'(\w)', r'\1,', name)[2:-1].replace('_', 'underscore')
        try:
            ligature = md_icons.xpath(xpath_tmpl.format(letter, compo))[0]
            ligature_set.append(deepcopy(ligature))
        except IndexError:
            print("Error: no such Ligature glyph={}, components={}".format(letter, compo))

needed.write('needed-glyph-liga.ttx', pretty_print=True, xml_declaration=True, encoding="utf-8")

call([
    'ttx',
    '--flavor', 'woff2',
    '-o', 'ic.min.woff2',
    'needed-glyph-liga.ttx'
])
