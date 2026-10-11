# Changelog

## 2026-10-11: Contact shading and canopy illumination

- Added restrained contact shading around nearby pillars, ledges, people and vehicles. The
  half-resolution pass uses metre-scale distances and depth-aware blur to keep silhouettes clean.
- High and medium quality use contact shading; low quality skips it. The GPU time guard can
  disable and release the pass, and its render targets are included in memory estimates.
- Existing canopy tubes now illuminate the paving and nearby surfaces with warm area lighting.
  Six/four/two nearby fixtures are active on high/medium/low quality, fading between locations
  as the viewer moves. Light sources stay attached to the generated fixtures.
- Browser checks cover all quality tiers, resizing, both sidewalk light pools, the AO override
  and release of the contact pass when the GPU time guard triggers.

## 2026-10-11: Scanned building and shop finishes

- Applied Poly Haven's CC0 Long White Tiles and Concrete Wall 006 to selected facades,
  canopies, ledges, ground-floor piers and roofs, with scanned normals and roughness.
- Added Wood Floor to fashion/jewellery floors and shop counters, and Terrazzo Tiles to
  other shop floors. Cafe floors keep their checkerboards; shop walls retain their signs.
- Packed the four finishes into shared local atlases with smaller low-quality assets,
  source credits, verified download hashes and reproducible imports.
- Corrected interior colour sampling to avoid decoding sRGB twice. Checked the new assets,
  shader rendering, window edges and banner clearance on all three quality tiers.

## 2026-10-11: Facade weathering and shop interiors

- Added varied grout, chipped tiles, repair patches, uneven grime, and runoff attached
  beneath actual air conditioners. Weathering retains the fitted window boundaries.
- Matched shop rooms to their fascia signs using eight interior styles, with product
  packaging, cafe menus and tables, clothing racks, salon mirrors, and display counters.
- Aligned each room and sign with its storefront piers. The shared interior atlas uses
  half resolution on low quality; interior counters add no street geometry.
- Expanded browser checks to cover all eight interior styles, stable shutters, both
  street-facing orientations, window corners, and banner clearance on all quality tiers.

## 2026-10-11: Distant character geometry fix

- Excluded Blender's unskinned bone-display helper from character conversion. It had been
  joined into the far meshes and appeared as large white triangles that vanished up close.
- Rebuilt all four new characters in both texture tiers and added a browser regression check
  for unexpected untextured surfaces and far meshes extending beyond the animated body.

## 2026-10-11: Causeway Bay crowd characters

- Added Mixamo's Josh, Shannon, Suzie and Martha as the main pedestrians and drivers,
  retaining a few of the original characters. Suzie is the player on foot and in cars.
- Rebound the public rigged models to the shared animation skeletons, preserving walking,
  running, phone, sitting and driving clips. Added near/far meshes and both texture tiers.
- Added a reproducible character importer and source credits in `assets/mixamo/MANIFEST.md`.
- Checked walking, idle and driving poses at both mesh detail levels, plus high/low street
  scenes and the player avatar. The production build passes.

## 2026-10-11: Modern Evening Street environment

- Restored the original visible sky and directional haze after the full HDRI treatment made
  the sky grey and the distant street too pale.
- Replaced the misty hilltop HDRI with the requested Modern Evening Street by Grzegorz Wronkowski,
  downloaded at 4K/2K/1K with verified hashes. Its urban lighting drives the environment while
  the original sunlight, sky and haze retain the scene's depth.
- Release the source HDR texture after filtering to avoid retaining its full CPU/GPU allocation.

## 2026-10-11: Photographed HDR sky and lighting

- Downloaded Poly Haven's CC0 Kloofendal 28d Misty HDRI at 4K, 2K and 1K for the three quality tiers.
- The HDR sky now supplies the visible sky, filtered environment lighting and car reflection probes.
  Its solar direction matches the shadow-casting sun; its solar core is excluded from indirect lighting.
- Matched distant haze to the photographed horizon and reduced the extra hemisphere fill.
- Added source credits, verified hashes, a reproducible importer, and HDR texture memory accounting.

## 2026-10-11: Herringbone sidewalk paving

- Applied Poly Haven's Herringbone Brick 03 by Charlotte Baglioni to the sidewalks and ramps,
  using its 2 m tile width, scanned colour, normals, roughness and ambient occlusion.
- Removed the old procedural brick-band overlays so the paving pattern covers the whole sidewalk.
- Packaged both 1K and 512 px local WebP tiers with source credits and verified download hashes.

## 2026-10-11: Poly Haven city materials

- Added CC0 surface scans: Asphalt 02 by Rob Tuytel, Concrete Pavement by Charlotte Baglioni,
  and Painted Plaster Wall by Amal Kumar. See `public/textures/city/README.md` for source links.
- Road and sidewalk materials use albedo, OpenGL normals, and packed ambient occlusion /
  roughness maps, tiled at the assets' real dimensions. Existing road wear and brick bands remain.
- Painted facades use scanned discoloration, normals and roughness while retaining their paint
  colours. The scan is masked away from windows and shop glazing.
- Assets are local WebP files: 1K for high/medium quality and 512 px for low quality. Downloads
  start with the car and people loads; missing texture sets fall back to procedural materials.
- `tools/import-polyhaven.mjs` regenerates both tiers and records source URLs and verified
  hashes in `public/textures/city/sources.json`. Browser previews cover all quality tiers.

## 2026-10-10: Causeway Bay, Hong Kong (rebuilt on top of Ocean Drive)

The scene is no longer Ocean Drive. It keeps Ocean Drive's engine (renderer, sky and shadows,
walker, vehicle and traffic simulations, Blender cars, Mixamo crowd, audio engine) and replaces
everything on top of it with a Causeway Bay street. The entries below this one are Ocean
Drive's own history.

- **City.**
  - The beach, ocean, surf, park, promenade, seawall, lifeguard towers and palms are gone.
  - The east side of the road is a second row of buildings over a city sidewalk
    (`src/world/ground.js` answers the height and water queries the old beach module did).
- **Buildings** (`src/world/hk-buildings.js`).
  - Kinds: tong lau, residential towers, older ribbon-window commercial blocks and glass office
    towers, planned along both sides.
  - Windows (facade shader):
    - interior-mapped rooms with furniture, curtains and ceiling tubes;
    - glass recessed behind parallax reveals;
    - sills with drip stains, and grilles on the low tong lau floors;
    - a distance fade of the window pattern to its average colour.
  - Wall finishes: mosaic tiles, render or large tiles, with rain streaks.
  - Geometry: balconies with railings, bay windows, aligned AC units, laundry poles, round
    water tanks, rooftop huts, parapets and billboards.
  - Shops under concrete canopies with tube lights, lit bilingual fascia signs and deep
    interiors with shelves, and the odd roller shutter down.
  - Projecting vertical neon and lightbox signs from a canvas atlas. All names are invented.
- **Street** (`src/world/street.js`).
  - Markings: double white centre lines, double yellow kerb lines, zebra crossings, and
    望右 LOOK RIGHT at every crossing.
  - Furniture: guard railings, tall lit street lamps, orange bins, red hydrants and black
    traffic-light housings.
  - Signs: Hong Kong street plates (軒尼詩道 Hennessy Road and real Causeway Bay side streets),
    停 STOP signs, metered-parking and pedestrian-crossing signs.
- **Traffic keeps left.**
  - The lanes, stop lines, signal heads, cross-street stop signs and parked-car headings are all
    mirrored.
  - About a third of the traffic is red taxis with a lit roof sign.
  - Every car has a Hong Kong plate, yellow at the rear and white at the front, with planar UVs
    added to the models' blank plates at load (`src/world/hk-plates.js`).
- **Player.**
  - A third-person view on foot (V / C), with a Mixamo body that blends idle, walk and run by
    speed, and a shoulder camera that pulls in at walls (`src/player/avatar.js`).
  - Running on Shift or Caps Lock.
  - The speedometer defaults to km/h.
  - The lifeguard ATV is gone, and the bike is parked on the east sidewalk.
- **Light.** A late-afternoon sun in the south-west (az 238°, el 24°), more sky fill for the
  street canyon, and a shadow box and map tall enough for the towers. The road surface is split
  into short rows, so its shadow coordinates keep their precision.
- **Text.** New loading screen, titles, README and this entry.

## 2026-10-01: fast travel (Ocean Drive)

- The number keys 1–0 (touch: a pin button top right with the same list) jump to ten places
  through a quick fade to warm white: the beach waterline, your car, the hotel sidewalk, the
  promenade, the 11 ST crossing, a café, the convertible, the ATV, the lifeguard tower deck and
  the start. Each spot is resolved when used, clear of every collider and facing the sea or
  down the street. Driving, the road destinations take the car along and set it down at rest in
  a lane; the others get out first. A small art-deco caption names the place.
  (`src/player/fasttravel.js`, checked by `node tools/fasttravel-test.mjs`.)

## 2026-09-30: cars, people and the open world

The walk became a drive. The street's cars are now models built in Blender, the 1950s
convertible at the curb can be driven, the drive has traffic, the sidewalks, cafés and benches
have people, and the whole district is an open world: any parked car or stopped traffic car can
be taken, and the car can go over the park lawn, down the seawall ramps, onto the sand and into
the surf. There are no weapons, no fighting and no real brands; taking a traffic car is a
borrowing, and its driver gets out and waves.

### Cars, modelled in Blender

- A hero convertible (a two-tone 1950s car with fins, a chrome spear, wide whitewalls, a
  tuck-and-roll bench, a banded dash cluster with a working speedometer, pedals, wipers, vents
  and a rear-view mirror) and a fleet of seven modern bodies (sedan, SUV, hatch, coupe, pickup,
  wagon, crossover), all authored in Blender by Python scripts in `blender/` and exported as
  Meshopt-compressed GLBs (`public/models/`).
- Each modern body has a generic cockpit (steering pivot and grips, eye anchor, speedo binnacle
  and needle, headliner, pillars, door cards, pedals, mirror) and a collapsed far level of detail.
- The parked fleet is drawn as BatchedMesh LODs with chunked culling; lacquer paint, chrome and
  glass take a local reflection probe; contact shadows are computed textures.

### The drivable convertible

- A sim with a sprung body (squat, dive, roll), a synthesized V8 (starter, lope at idle, load),
  a horn, the driver's view and a chase camera, and touch controls.
- The player's body at the wheel: hands hand-over-hand on the rim with a curled grip, feet on
  the pedals, the head hidden from the driver's eye.

### Traffic

- An IDM traffic sim on the drive, 30 cars of all eight bodies and classic convertibles, stopping
  at the crosswalks for pedestrians, at the cycling 11 ST signal (three-lens heads on a
  Miami-Dade-style mast arm) and for the player, with positional engines, Doppler, brake lights
  with a crimson halo and contact shadows.
- It reacts to the player: predictive braking, a startle beep with the driver's honk gesture,
  swerving round a partial block and passing a car left standing in the lane.

### People and drivers (Mixamo)

- A crowd of walkers, joggers, skaters and people sitting at cafés and on benches, and a seated
  driver in every traffic car, all Mixamo characters with Mixamo animation clips (walks, jogs,
  idles, sitting, talking, phoning, driving, honking, waving), retargeted and optimized into
  `public/models/people/`.
- Grounded with foot contact patches and long low-sun shadows; they dodge vehicles, never
  sidestep into one, and turn their heads to a car coming their way.

### Open world, phase 1

- Enter any parked car at its door (E / F, either side), drive it anywhere, get out anywhere.
- Surfaces: the park lawn, seawall ramps down to the beach, soft sand you can sink and bog in
  (rock it free, or R to recover), wet sand and the shallow surf, where the engine drowns if the
  water reaches the intake.
- Curbs, collisions and impulses against the street furniture; soft world ends that turn you
  back; skid marks on a handbrake slide; a speedometer HUD in the loading card's Art Deco manner.

### Open world, phase 2

- Take a stopped traffic car at its driver's door: the driver gets out, waves and walks off.
- The last car you got out of is saved across reloads, dents included.
- A minimap (heading up or north up, the saved car marked), a car radio with three generative
  stations (Bossa at Dawn, Sunrise Synth, Clave Café), knockable bins, news boxes, barricades and
  cones, road-closed ends, light dents on the modern cars, parked classics in the curb rows,
  and water spray and a foam wake round the wheels in the surf.

### Polish (this release)

- Getting into a car: the camera is in the driver's head from the first frame, and the seated
  body stays hidden until the look has turned (no headless torso or long arms seen from outside).
- A traffic driver getting out: the door swings open and shuts behind them, they have a foot
  contact patch, and they walk off round the car's rear, out of the new driver's way.
- HUD: the riding key hints are small, bottom left, and fade 4 s after getting in; the radio card
  is a transparent caption between gold hairlines that fades after 3 s; the minimap has an
  outline and a drop shadow, a larger chevron, an N badge and lighter roads.
- Skid marks: soft, patchy grey-brown rubber (about 0.35 opacity) on the asphalt only, broken at
  a curb step or a change of surface; ruts in the sand and flattened grass from every tyre.
- Sand and surf: the car sits 8-12 cm into the sand and the water; spray is thin, long streaks
  that glow gold when backlit by the low sun; fine sand is thrown off the tyres on dry sand.
- Dents: each vertex is capped in how far it can be pushed in, with a smooth falloff and normals
  kept on the modelled side, so the grille and panels no longer tear or open black holes.
- World edge: Type III barricades with three striped rails, a sign plate and sandbags; the
  placeholder blocks past the cross streets' barricades fade into the haze.
- Perf on an RTX 4060 at 1920×1080, high tier (`tools/perf-primary.mjs`): GPU median 6.2 ms;
  CPU work p95 by phase: walking 7.9, ATV 5.0, cockpit 5.8, driving 3.7 ms.

### Asset provenance

- **Characters and animations:** Mixamo (Adobe), used under the Mixamo license (free for use in
  projects, including commercial; the raw assets are not redistributed as a standalone library).
  Characters: Bryce, Elizabeth, Lewis, Megan and Sophie; clips as listed above.
- **Normal maps:** Poly Haven, CC0: *Leather White* (the convertible's vinyl) and *Dirty Carpet*
  (the footwells), at 1K, converted to WebP (`public/textures/cars/`).
- **Cars:** modelled in Blender by this project (`blender/*.py`, `blender/cars.blend`).
- Everything else (the hotels, palms, street, beach, ocean, sky, signs and every sound) is still
  generated in code at load time. All hotel names are invented.
