# City surface scans

Local copies of Poly Haven textures, licensed [CC0](https://polyhaven.com/license).

| Asset | Artist | Use | Tile width |
| --- | --- | --- | --- |
| [Asphalt 02](https://polyhaven.com/a/asphalt_02) | Rob Tuytel | Main road and cross streets | 3 m |
| [Herringbone Brick 03](https://polyhaven.com/a/herringbone_brick_03) | Charlotte Baglioni | Sidewalks and curb ramps | 2 m |
| [Concrete Pavement](https://polyhaven.com/a/concrete_pavement) | Charlotte Baglioni | Previous paving, retained as a spare asset | 1.8 m |
| [Painted Plaster Wall](https://polyhaven.com/a/painted_plaster_wall) | Amal Kumar | Painted building facades | 2 m |
| [Long White Tiles](https://polyhaven.com/a/long_white_tiles) | Sergej Majboroda, Jenelle van Heerden | Selected tiled facades | 1.27 m |
| [Concrete Wall 006](https://polyhaven.com/a/concrete_wall_006) | Charlotte Baglioni, Dario Barresi | Canopies, ledges, piers and roofs | 2 m |
| [Wood Floor](https://polyhaven.com/a/wood_floor) | Dimitrios Savva | Fashion and jewellery floors; shop counters and tables | 1.7 m |
| [Terrazzo Tiles](https://polyhaven.com/a/terrazzo_tiles) | Amal Kumar | Other shop floors, except cafe checkerboards | 2 m |

Each set includes albedo, OpenGL normals, and packed ambient occlusion / roughness / metalness
(ARM: red / green / blue). Only albedo uses sRGB; data maps use linear sampling. The surfaces
are nonmetallic. The 1024 px files serve high and medium quality; 512 px files serve low quality.

The last four scans are packed into matching 2×2 `building_surfaces` atlases, so buildings
need only three additional samplers. Each cell has a wrapping gutter and contains a 510 px
scan on high/medium quality or 254 px on low quality. Facades and concrete use albedo,
normals, roughness and occlusion. Ray-traced shop rooms use albedo and occlusion.

`sources.json` records the original download URLs, verified MD5 hashes, authors, and generated
file sizes. Run `node tools/import-polyhaven.mjs` from the repository root to regenerate these
WebP files. Pass one or more texture IDs to download only those assets; the building atlases
are rebuilt when all four source sets are available. Raw source maps are kept in the ignored
`.perf/polyhaven/` directory.

The browser loads these files from the application's own base path; it does not contact
Poly Haven at runtime. If a set fails to load, the existing procedural material is used.
