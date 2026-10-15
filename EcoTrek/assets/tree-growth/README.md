# Apple-tree growth atlas

100 separately ray-traced images of **one** deterministic apple tree, plus 40
adult seasonal images (`growth-080`…`growth-099` in autumn and leafless winter).
Every image adds real geometry—stem thickness, side shoots, curved serrated
leaves with midribs and veins, flower buds, five-petal blossoms, and fruit—so
growth is continuous rather than a few swapped silhouettes.

- Renderer: Mitsuba 3.7.1 scalar CPU path tracer, seed 57124 (optional
  tooling in `tools/tree-art`). Textures and meshes are author-generated.
- Images 1–79 are nursery close-ups so early leaves/buds stay legible; the UI
  presents them at smoothly increasing sizes. They are not scaled adult trees.
- `render-manifest.json` records per-image height, trunk radius, branch, leaf,
  blossom and fruit counts plus SHA-256 hashes.
- `pack_atlas.py` verifies 100 unique images, strictly gradual height and trunk
  growth, no repeated art, first buds before first blossom, and leafless adult
  winter frames.
- These are decorative virtual-game images. EcoTrek does not plant real trees.
