# City surface scans

Local copies of Poly Haven textures, licensed [CC0](https://polyhaven.com/license).

| Asset | Artist | Use | Tile width |
| --- | --- | --- | --- |
| [Asphalt 02](https://polyhaven.com/a/asphalt_02) | Rob Tuytel | Main road and cross streets | 3 m |
| [Herringbone Brick 03](https://polyhaven.com/a/herringbone_brick_03) | Charlotte Baglioni | Sidewalks and curb ramps | 2 m |
| [Concrete Pavement](https://polyhaven.com/a/concrete_pavement) | Charlotte Baglioni | Previous paving, retained as a spare asset | 1.8 m |
| [Painted Plaster Wall](https://polyhaven.com/a/painted_plaster_wall) | Amal Kumar | Painted building facades | 2 m |

Each set includes albedo, OpenGL normals, and packed ambient occlusion / roughness / metalness
(ARM: red / green / blue). Only albedo uses sRGB; data maps use linear sampling. The surfaces
are nonmetallic. The 1024 px files serve high and medium quality; 512 px files serve low quality.

`sources.json` records the original download URLs, verified MD5 hashes, authors, and generated
file sizes. Run `node tools/import-polyhaven.mjs` from the repository root to regenerate these
WebP files. Raw source maps are kept in the ignored `.perf/polyhaven/` directory.

The browser loads these files from the application's own base path; it does not contact
Poly Haven at runtime. If a set fails to load, the existing procedural material is used.
