# 制作极限压缩的 Material Icons 图标字体

## 0

安装需要的命令行工具。

```sh
pip install --user fonttools # 字体工具
pip install --user brotil    # 制作 woff2 格式所需
```

## 1

解包 `material-icons.woff2` 。

```sh
ttx material-icons.woff2
```

得到 `material-icons.ttx` 。

## 2

用文本编辑器打开 `material-icons.ttx` ，寻找需要的 Glyph Name ，这里最好按照字母序排列，方便后续的寻找。

|Glyph Name|Icon Name|
|-:|:-|
|uniE318|keyboard_capslock|
|uniE037|play_arrow|
|uniE034|pause|
|uniE041|repeat_one|
|uniE040|repeat|
|uniE5DA|subdirectory_arrow_right|
|uniE045|skip_previous|
|uniE044|skip_next|
|uniE043|shuffle|
|uniE047|stop|

存储为 `needed-glyph.txt` 备用。

## 3

制作包含所有所需 Glyph 的 Font Subset 。

```sh
pyftsubset material-icons.woff2 \
--gids=13-39 \
--glyphs=uniE045,uniE044,uniE037,uniE034,uniE047,uniE5DA,uniE041,uniE040,uniE043,uniE318 \
--layout-features-=liga \
--output-file=needed-glyph.ttf
```

参数说明：

`--gids=13-39` 包含 `_` 和 `a` 到 `z` 的 Glyph ID 范围。 Material Icons 是通过 OpenType Ligature 进行字形替换的，没有这些基本字形， Ligature 不能正常工作。

`--glyphs=uniEooo,uniExxx` 第二步中找到的所有所需 Glyph Name 。

`--layout-features-=liga` 在输出的字体文件中禁用 Font Ligature ，否则所有的 Glyph 都会被包含在输出文件中。

`--output-file=needed-glyph.ttf` 输出文件 `needed-glyph.ttf`

更具体的参数说明，参见 `pyfontsubset --help` 。

## 4

将 `needed-glyph.ttf` 转换为 `ttx` 以便编辑。

```sh
ttx needed-glyph.ttf
```

输出：

```sh
Dumping "needed-glyph.ttf" to "needed-glyph.ttx"...
Dumping 'GlyphOrder' table...
Dumping 'head' table...
Dumping 'hhea' table...
Dumping 'maxp' table...
Dumping 'OS/2' table...
Dumping 'hmtx' table...
Dumping 'cmap' table...
Dumping 'cvt ' table...
Dumping 'loca' table...
Dumping 'glyf' table...
Dumping 'name' table...
Dumping 'post' table...
Dumping 'gasp' table...
Dumping 'GDEF' table...
Dumping 'GPOS' table...
Dumping 'GSUB' table...
```

得到 `needed-glyph.ttx` 。

## 5

打开 `needed-glyph.ttx` ，找到它的 `ttFont -> GSUB` 元素：

```xml
<GSUB>
  <Version value="0x00010000"/>
  <ScriptList>
    <!-- ScriptCount=1 -->
    <ScriptRecord index="0">
      <ScriptTag value="latn"/>
      <Script>
        <!-- LangSysCount=0 -->
      </Script>
    </ScriptRecord>
  </ScriptList>
  <FeatureList>
    <!-- FeatureCount=0 -->
  </FeatureList>
  <LookupList>
    <!-- LookupCount=0 -->
  </LookupList>
</GSUB>
```

然后打开 `material-icons.ttx` 文件，也找到它的 `ttFont -> GSUB` 子项，复制其中的 `ScriptList` 与 `FeatureList` 元素，覆盖 `needed-glyph.ttx` 中对应的元素。

```xml
<ScriptList>
  <!-- ScriptCount=1 -->
  <ScriptRecord index="0">
  <ScriptTag value="latn"/>
  <Script>
    <DefaultLangSys>
    <ReqFeatureIndex value="65535"/>
    <!-- FeatureCount=1 -->
    <FeatureIndex index="0" value="0"/>
    </DefaultLangSys>
    <!-- LangSysCount=0 -->
  </Script>
  </ScriptRecord>
</ScriptList>
<FeatureList>
  <!-- FeatureCount=1 -->
  <FeatureRecord index="0">
  <FeatureTag value="liga"/>
  <Feature>
    <!-- LookupCount=1 -->
    <LookupListIndex index="0" value="0"/>
  </Feature>
  </FeatureRecord>
</FeatureList>
```

## 6

**关键步骤** ：将所需的 Font Ligature 信息写入。

在 `material-icons.ttx` 找到 `GSUB -> LookupList -> Lookup -> LigatureSubst` 元素。它包含很多子元素，结构为：

```xml
<GSUB>
  <Version value="0x00010000"/>
  <!-- ... -->
  <LookupList>
    <!-- LookupCount=1 -->
    <Lookup index="0">
      <LookupType value="4"/>
      <LookupFlag value="0"/>
      <!-- SubTableCount=1 -->
      <LigatureSubst index="0" Format="1">
        <LigatureSet glyph="a">
          <!-- ... -->
          <Ligature components="d,b" glyph="uniE60E"/>
```

最内层的 `Ligature` 就是我们需要的。还记得 `needed-glyph.txt` 吗？找到所有对应的 `Ligature` 元素，复制到 `needed-glyph.ttx` 对应的位置。

```xml
<LookupList>
  <!-- LookupCount=1 -->
  <Lookup index="0">
  <LookupType value="4"/>
  <LookupFlag value="0"/>
  <!-- SubTableCount=1 -->
  <LigatureSubst index="0" Format="1">
    <LigatureSet glyph="k">
      <Ligature components="e,y,b,o,a,r,d,underscore,c,a,p,s,l,o,c,k" glyph="uniE318"/>
    </LigatureSet>
    <LigatureSet glyph="p">
      <Ligature components="l,a,y,underscore,a,r,r,o,w" glyph="uniE037"/>
      <Ligature components="a,u,s,e" glyph="uniE034"/>
    </LigatureSet>
      <LigatureSet glyph="r">
      <Ligature components="e,p,e,a,t,underscore,o,n,e" glyph="uniE041"/>
      <Ligature components="e,p,e,a,t" glyph="uniE040"/>
    </LigatureSet>
      <LigatureSet glyph="s">
      <Ligature components="u,b,d,i,r,e,c,t,o,r,y,underscore,a,r,r,o,w,underscore,r,i,g,h,t" glyph="uniE5DA"/>
      <Ligature components="k,i,p,underscore,p,r,e,v,i,o,u,s" glyph="uniE045"/>
      <Ligature components="k,i,p,underscore,n,e,x,t" glyph="uniE044"/>
      <Ligature components="h,u,f,f,l,e" glyph="uniE043"/>
      <Ligature components="t,o,p" glyph="uniE047"/>
    </LigatureSet>
  </LigatureSubst>
  </Lookup>
</LookupList>
```

## 7

编译字体。

```sh
ttx --flavor woff2 -o ic.min.woff2 needed-glyph.ttx
```

输出：

```sh
Compiling "needed-glyph.ttx" to "ic.min.woff2"...
Parsing 'GlyphOrder' table...
Parsing 'head' table...
Parsing 'hhea' table...
Parsing 'maxp' table...
Parsing 'OS/2' table...
Parsing 'hmtx' table...
Parsing 'cmap' table...
Parsing 'cvt ' table...
Parsing 'loca' table...
Parsing 'glyf' table...
Parsing 'name' table...
Parsing 'post' table...
Parsing 'gasp' table...
Parsing 'GDEF' table...
Parsing 'GPOS' table...
Parsing 'GSUB' table...
```

成功。来看一下字体大小

```sh
$ ls -lh ic.min.woff2
-rw-r--r-- 1 rocka rocka 968 Apr  24 14:42 ic.min.woff2
```

只有 968B 。欢呼吧。
