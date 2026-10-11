# HongKongThreejs · Causeway Bay 銅鑼灣

The `main` branch contains the Hong Kong scene described below.

A walk, a run and a drive down a Causeway Bay street in Hong Kong on a late afternoon, built in
Three.js and generated in code. Tong lau walk-ups with balconies and burglar grilles, slim
residential towers with bay windows, older ribbon-window commercial blocks and glass office
towers line both sides of the road. Their ground floors are shops under concrete canopies, with
lit fascia signs in Chinese and English, and vertical neon signs hang out over the sidewalks.
Red taxis and the rest of the traffic keep left, the crossings say 望右 LOOK RIGHT, and the
crowd walks both sidewalks. You can walk it in first person, switch to third person and run,
or take any car on the street and drive it.

**This project is built on top of [Ocean Drive](https://github.com/StarKnightt/ocean-drive)
by StarKnightt, then completely changed.** Ocean Drive was a first-person sunrise walk along
Miami Beach's Art Deco hotels, palms, beach and ocean. The engine underneath it is kept: the
renderer and post chain, the sky and shadow system, the walker, the vehicle and traffic
simulations, the Blender-built cars, the Mixamo crowd and the synthesized audio. The scene on
top of it is new: the city, the street, the buildings, the signs, the markings, the traffic
rules, the light and the controls. Nothing of Miami is left on screen. See
[Where it came from](#where-it-came-from) for what was kept and what was replaced.

The buildings, signs, street and every sound are generated in code at load time. The only
files the scene loads are Ocean Drive's Blender car models, adapted here for right-hand drive, the
Mixamo people and their animations, Poly Haven CC0 texture scans for the road, paving,
facades, concrete details and shop floors, a Poly Haven urban HDRI for environment lighting,
and two Poly Haven normal maps for the car interiors. The city scans include
albedo, normal and packed occlusion/roughness maps, stored locally as WebP at 1K (high/medium)
and 512 px (low). [Sources and asset credits](public/textures/city/README.md).
The Modern Evening Street HDRI adds urban ambient lighting and reflections; the visible sky
and haze retain the afternoon treatment. Local 4K/2K/1K files are used
for high/medium/low quality. [HDRI source and lighting notes](public/environments/README.md).
The shop and sign names are invented: there is no real business, brand or logo anywhere in the
scene. The street names are real Causeway Bay streets.

## Running it locally

```
git clone https://github.com/imsarah/HongKongThreejs.git
cd HongKongThreejs
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
```

The only runtime dependency is `three` (0.186). The build uses a relative base, so `dist/` works
from any sub-path. It runs best on a desktop GPU in a Chromium-based browser, and also runs on
laptops and phones on a lower quality tier.

Check the shipped car models and driving interactions with:

```sh
node tools/right-hand-drive-test.mjs
node tools/car-ride-test.mjs
node tools/any-car-test.mjs
node tools/car-cockpit-test.mjs
node tools/car-glass-mobile-test.mjs
```

These check the right-hand cockpit anchors in all eight car models, door sides at different
headings, driver-camera placement, and the convertible and parked-car driving flows.
The browser checks need the dev server running and Playwright Chromium installed; set
`BROWSER_CHANNEL=chrome` to use an installed Chrome. They check both hands against the rim
through full-lock turns in all eight cars, compare the inside view with and without windshield
glass, and exercise iPhone SE, iPhone 13, Pixel 7 and iPad layouts in both orientations.
Screenshots are saved under `shots/cockpit/` and `shots/glass-mobile/`.

Phone and tablet views keep enough horizontal field of view in portrait, with a driving HUD,
readable touch buttons of at least 44 px, and a radio card that fits around the minimap.
Rotating the screen releases held steering and braking inputs. The low quality tier uses
1024 px sun-shadow maps and 14 shadow samples per pixel to reduce mobile rendering cost.

## Controls

| Action | Keyboard and mouse | Touch |
|---|---|---|
| Start | Click (locks the pointer; the sound starts on the same click) | Tap (goes fullscreen where the browser allows it) |
| Look | Mouse | Drag anywhere off the joystick |
| Walk | W A S D | Left-thumb joystick |
| Run | Hold Shift, or turn Caps Lock on to keep running | Joystick at full tilt |
| Jump | Space | Jump button |
| First person / third person (on foot) | V (or C) | Camera button |
| Get in / out | E (or F): the bike, the convertible, any parked car, or a stopped traffic car at its driver's door (the driver gets out and waves) | Ride / Enter button |
| Throttle, brake / reverse, steer | W S A D | Joystick |
| Handbrake | Space: held with the wheel turned, the tail steps out | Jump button, held |
| Driver's view / chase camera (in a car) | C (or V) | Camera button |
| Horn | H | |
| Car radio | Q | Radio button |
| Minimap | N hides / shows it, Shift+N north up / heading up | |
| Back to the nearest road (stuck) | R (or Backspace) | |
| Mute | M | Mute button |
| Release the pointer | Esc | |

All cars are right-hand drive: the driver's door is on the right when facing forward.
Either door can be used to enter a parked car; the passenger side slides you across to the
driver's seat.

The last car you got out of stays where you left it, across reloads (`localStorage`
`ocean-drive.car`, the key kept from Ocean Drive); the minimap marks it.

| URL option | Effect |
|---|---|
| `quality=low\|medium\|high` | Pins a quality tier instead of detecting one |
| `dynres=0` | Turns dynamic resolution off |
| `gpuguard=0` | Turns off the GPU-time guard that lowers resolution and shadows on a struggling GPU |
| `hud=1` | Shows the frame-rate readout |
| `nofs=1` | Does not go fullscreen on the starting tap |
| `openworld=0` | The road-only rules: cars stay on the road, no parked car to enter |
| `units=mph` | The driving speedometer in mph (km/h by default) |
| `prof` | Per-section main-thread timings in `window.__prof()` |

## What is in it

- **The street.** A two-lane road with traffic keeping left, between two continuous rows of
  buildings, with metered parking bays on the west kerb. Six side streets meet it from the west,
  named after real Causeway Bay streets (波斯富街 Percival Street, 利園山道 Lee Garden Road,
  白沙道 Pak Sha Road, 啟超道 Kai Chiu Road, 恩平道 Yun Ping Road, 糖街 Sugar Street). The main road
  is signed 軒尼詩道 Hennessy Road. The layout is not yet the real map of Causeway Bay; see
  [Not done yet](#not-done-yet).
- **Buildings, generated per lot.** Tong lau, residential towers, older commercial blocks and
  glass office towers, each with its own height, colour, wall finish (small mosaic tiles,
  painted render or large tiles), window style and seed. The windows are drawn by the facade
  shader:
  - each has a room behind it (interior mapping: back wall, side walls, floor and ceiling,
    furniture, curtains and a ceiling tube in the lit rooms);
  - the glass sits recessed behind the wall, so the reveals show as you move;
  - the glass reflects the sky;
  - there are sills with drip stains, and burglar grilles on the lower tong lau floors;
  - far away, the window pattern fades to its average colour, so it doesn't shimmer.
- **Building geometry.** Balconies with railings on the tong lau, bay windows on the towers,
  air conditioners under the windows, laundry poles, round water tanks, rooftop huts and
  parapets, and rooftop billboards.
- **Shops.** Every ground floor is a row of shops under a concrete canopy with tube lights.
  Each shop has a lit fascia sign in Chinese and English and glazing into a deep interior with
  shelves of goods. Eight interior styles vary the shops, with wood and terrazzo floors.
  Here and there a roller shutter is down.
- **Signs.** Vertical neon and lightbox signs hang out over the sidewalks (酒家, 押, 麻雀, 藥房, 金行,
  冰室, 找換, 牙科醫生 and so on), and boards and billboards sit on the facades and rooftops. All are
  drawn into one canvas atlas at load time.
- **Street furniture and markings, Hong Kong style.**
  - double white centre lines, double yellow no-stopping lines and zebra crossings;
  - 望右 LOOK RIGHT painted at every crossing;
  - galvanised guard railings along the kerbs, tall street lamps lit at dusk;
  - orange litter bins, red pillar hydrants, black traffic-light housings;
  - white street-name plates (Chinese over English), 停 STOP signs, metered-parking and
    pedestrian-crossing signs.
- **Traffic that keeps left.** Cars cruise at 20–30 km/h, keep their distance and stop for
  pedestrians, for the Lee Garden Road signal and for you. About a third of them are red taxis
  with a lit TAXI roof sign. Every car carries a Hong Kong plate: black on yellow at the rear,
  black on white at the front (the numbers are invented).
- **Right-hand-drive cars.** The convertible and all seven modern body styles put the steering
  wheel, instruments, pedals, driver and first-person camera on the right. Modern cars have
  narrow windscreen borders and slimmer front pillars for a clearer view from the seat.
- **People.** Mixamo characters walk and hurry along both sidewalks, stand on the phone outside
  the shops, and sit in every traffic car. They step out of a car's way.
- **You.** First person, or third person (V): your character turns to face where you're going
  and blends from idle to walk to run with its speed. The camera sits over the right shoulder
  and pulls in when a building is in the way. Shift or Caps Lock runs.
- **Open world.** Ocean Drive's open-world driving carries over:
  - any parked or stopped traffic car can be taken, and its driver gets out and walks off;
  - knockable bins, and road-closed barricades and cones at the ends;
  - dents on the modern cars;
  - a minimap and a generative car radio.
- **Light.** A late-afternoon sun from the south-west, low enough to throw the towers' shadows
  across the street. Urban environment lighting, warm canopy lights and contact shading
  add depth around shopfronts. The shadow box reaches the tower tops.

## Where it came from

This repository started as a copy of [Ocean Drive](https://github.com/StarKnightt/ocean-drive)
(MIT, © 2026 Prasenjit / StarKnightt). Ocean Drive was a first-person walk along Ocean Drive in
Miami Beach at sunrise. It had about forty pastel Art Deco hotels, 160 palms, a park and
promenade, a beach with footprints, swash and lifeguard towers, an ocean with a glitter path,
pelicans and gulls, and a bossa nova drifting from a hotel patio. It was built overnight by AI
agents from the brief in [PROMPT.md](PROMPT.md), then extended with Blender cars, traffic, a
Mixamo crowd and open-world driving ([CHANGELOG.md](CHANGELOG.md) has its full history).

**Kept from Ocean Drive (the engine):**
- the renderer, post chain, quality tiers, dynamic resolution and GPU guard;
- the sky model, haze and contact-hardening sun shadows;
- the walker and touch controls, and the vehicle simulation and chase camera;
- the traffic simulation (the Intelligent Driver Model), the Blender car models and their
  materials;
- the Mixamo crowd system, the synthesized audio engine, the minimap, the HUD and the radio.

**Replaced or new for Causeway Bay:**

- **City and walkable ground.** The beachfront setting is replaced by a dense street with
  buildings and shops on both sides. The beach, ocean, surf, park, promenade, seawall,
  lifeguard towers and palms are removed from the scene. A city ground module supplies the
  pavement heights and ground queries used by the walker, pedestrians and cars, including
  the road crown and crossing ramps. See [ground.js](src/world/ground.js) and
  [layout.js](src/world/layout.js).
- **Building types and geometry.** The pastel Art Deco hotels become four generated Hong
  Kong building types: tong lau walk-ups, slim residential towers, older commercial blocks
  with ribbon windows, and glass office towers. Each lot varies its height, floor spacing,
  colour, wall finish and setbacks. Tong lau can have projecting balconies and railings;
  residential towers have bay windows. Air-conditioning units, laundry poles, rooftop water
  tanks, huts, parapets and billboards add detail to the frontage and skyline. See
  [hk-buildings.js](src/world/hk-buildings.js).
- **Windows and facade finish.** Windows are fitted to complete bays within each building
  face, keeping openings clear of the corners. Recessed glass and parallax reveals give the
  openings depth; interior mapping supplies rooms with floors, walls, furniture, curtains
  and ceiling lights. Lower tong lau floors can have burglar grilles, and sills have drip
  stains. Mosaic tiles, painted plaster and larger tiles vary the walls, with uneven grout,
  chipped edges, repair patches, rain streaks and grime. Runoff is placed beneath actual
  air-conditioning units. Small window patterns fade at distance to reduce shimmer. See
  [hk-buildings.js](src/world/hk-buildings.js) and [facade-weather.js](src/textures/facade-weather.js).
- **Shopfronts and interiors.** Ground floors have concrete canopies, storefront piers,
  fluorescent tubes, lit bilingual fascia signs, glazing and occasional closed roller
  shutters. The rooms behind the glass use eight styles matched to their signs: grocery,
  cafe, pharmacy, fashion, salon, electronics, jewellery and hardware. Shelves and product
  packaging, cafe menus and tables, clothing racks, salon mirrors and display counters
  distinguish the interiors. Rooms and signs align with the storefront divisions; fashion
  and jewellery shops use wood floors, other shops use terrazzo, and cafes keep checkerboards.
  See [shop-interiors.js](src/textures/shop-interiors.js).
- **Bilingual signs and banners.** Projecting vertical neon and lightbox signs, shop fascia
  boards and rooftop advertisements replace the hotel signage. Chinese and English lettering
  is drawn into a shared sign atlas, with invented business names. Commercial banners share
  the ground-floor fascia below the upstairs windows, keeping the first residential floor
  clear. See [hk-buildings.js](src/world/hk-buildings.js).
- **Hong Kong street furniture and markings.** The road has double white centre lines,
  double yellow no-stopping kerb lines, zebra crossings and 望右 LOOK RIGHT markings. Guard
  railings, tall street lamps, orange bins, red hydrants and black traffic-light housings
  replace the beachfront furniture. Street plates show Chinese above English: the main road
  is Hennessy Road, with Percival Street, Lee Garden Road, Pak Sha Road, Kai Chiu Road, Yun
  Ping Road and Sugar Street at the side streets. Stop, parking and pedestrian-crossing signs
  follow the new setting. See [street.js](src/world/street.js).
- **Traffic and vehicle presentation.** The inherited traffic simulation is adapted to
  keep left: lane directions, stop lines, signal placement, cross-street stop signs and
  parked-car headings change together. About a third of the moving cars are red taxis with
  illuminated TAXI roof signs. Cars receive invented Hong Kong registration plates, white
  at the front and yellow at the rear, and the speedometer defaults to km/h. The lifeguard
  ATV is removed and the bike is placed on the east sidewalk. Ocean Drive's car models are
  rebuilt for right-hand drive: cockpit controls, seated characters, pedal animation, camera
  anchors and driver-door interactions move together. The modern cars' windscreen borders
  use narrow strips along the glass edges (12 mm for black trim, 6 mm for chrome), and the
  front pillars leave more of the curved windscreen transparent. From the driver's seat,
  glass has visible tint, edge reflections and a faint reflection of the dashboard. Both
  hands grip the rim with curled fingers, sliding around it as the wheel turns; the modern
  seated pose and camera move forward together so the arms reach. Both detail levels are
  rebuilt; the driving simulation is retained. See [hero.py](blender/hero.py),
  [modern.py](blender/modern.py), [traffic.js](src/world/traffic.js),
  [cars-glb.js](src/world/cars-glb.js) and [hk-plates.js](src/world/hk-plates.js).
- **Crowd and player characters.** Mixamo's Josh, Shannon, Suzie and Martha are added as the
  main pedestrians and drivers, alongside some retained characters. Suzie is the player
  on foot and at the wheel. The new models use the shared walking, running, phone, sitting
  and driving animations, with near/far mesh variants and reduced texture sizes for lighter
  quality tiers. Character conversion excludes the unskinned bone-display helpers that
  previously appeared as large white triangles at distance. See [mixamo.js](src/world/mixamo.js)
  and the [character sources](assets/mixamo/MANIFEST.md).
- **Third-person walking and running.** A visible player body turns toward the direction of
  movement and blends idle, walk and run animations according to speed. V or C switches
  between first person and a camera over the right shoulder; the camera pulls closer when
  walls obstruct it. Shift runs while held, Caps Lock keeps running enabled, and full joystick
  tilt runs on touch devices. The body is hidden in first person and while riding. See
  [avatar.js](src/player/avatar.js) and [walker.js](src/player/walker.js).
- **Scanned city materials.** Local Poly Haven CC0 scans add asphalt roads, herringbone
  paving, painted plaster, selected tiled facades, concrete canopies and ledges, and wood
  and terrazzo shop finishes. Colour, normals, roughness and occlusion give the surfaces
  variation beyond their generated geometry. Shared building atlases limit texture sampling;
  high/medium quality uses 1K source maps and low uses 512 px maps. Assets load from this
  project, with procedural fallbacks if a set is unavailable. See the
  [texture credits and import notes](public/textures/city/README.md).
- **Lighting and contact shading.** The Atlantic sunrise becomes a south-west afternoon
  sun, at 238° azimuth and 24° elevation, with shadow coverage sized for the towers. The
  Modern Evening Street HDRI adds urban ambient lighting and reflections while the visible
  sky and haze retain the afternoon treatment. Warm area lights illuminate the paving under
  nearby canopy tubes; six, four or two fixtures are active on high, medium or low quality.
  Contact shading adds depth around pillars, ledges, people and vehicles on high/medium
  quality, and can be released by the GPU guard. See the
  [HDRI notes](public/environments/README.md), [canopy-lighting.js](src/world/canopy-lighting.js)
  and [contact-ao.js](src/renderer/contact-ao.js).
- **Project presentation.** The page title, loading screen, control hints and documentation
  describe HongKongThreejs and Causeway Bay. The Hong Kong implementation is published on
  `main`; Ocean Drive's original brief, history and licence attribution remain in the repo.

The original Ocean Drive brief is kept in [PROMPT.md](PROMPT.md) for the record, with the Hong
Kong brief after it.

## Not done yet

- **The real map.** The street is still Ocean Drive's straight road with side streets from the
  west. Building the real Causeway Bay layout (the bend of Hennessy Road, Yee Wo Street, the
  blocks round Times Square) needs an OpenStreetMap export of the area.
- **Sound, birds and music.** Some of Ocean Drive's ambience code is still in place (waves,
  gulls and the bossa nova station). A city soundscape (crossing beeps, tram bells, the hum of
  the street) is still to do.
- **Fast travel.** `src/player/fasttravel.js` is Ocean Drive's and is not wired into the scene.

## Layout

```
src/
  main.js          boot, render loop, dynamic resolution, input
  sky.js           sky, clouds, sun and its shadow box
  quality.js       quality tiers
  renderer/        post chain: bloom, anti-aliasing, grade
  world/
    hk-buildings.js  the Causeway Bay frontage: plan, facade shader, signs atlas, shops
    hk-plates.js     Hong Kong number plates for the car models
    ground.js        the city ground (heights for the walker, people and cars)
    street.js        road, kerbs, sidewalks, markings, railings, lamps, signals, plates
    layout.js        the street's dimensions, the cross streets and the sun
    traffic*.js      keep-left traffic, taxis; cars-glb.js the Blender cars
    crowd.js         the Mixamo crowd; mixamo.js the characters and clips
  vehicles/        the bike and the cars: simulation, chase camera, skids, dents
  player/          walker (first / third person, running), avatar, touch controls
  ui/              driving HUD, minimap, radio card
  audio/           synthesis, spatial audio, car, music, radio, footsteps
blender/           adapted right-hand-drive car models: Python build scripts and cars.blend
public/models/     the car and people GLBs
tools/             Playwright capture and test harnesses (from Ocean Drive)
```

## Licence

MIT. See [LICENSE](LICENSE). The original Ocean Drive copyright notice is kept, as the licence
requires.
