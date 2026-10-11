# HongKongThreejs · Causeway Bay 銅鑼灣

The Hong Kong implementation is on the [`claude/modest-fermi-witbgu` branch](https://github.com/imsarah/HongKongThreejs/tree/claude/modest-fermi-witbgu). The `main` branch currently contains the original Ocean Drive code and this project overview.

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
files the scene loads are Ocean Drive's car models, built in Blender for that project, the
Mixamo people and their animations, Poly Haven CC0 texture scans for the road, paving and
painted plaster, a Poly Haven HDRI sky, and two Poly Haven normal maps for the car interiors. The city scans include
albedo, normal and packed occlusion/roughness maps, stored locally as WebP at 1K (high/medium)
and 512 px (low). [Sources and asset credits](public/textures/city/README.md).
Modern Evening Street supplies environment lighting and reflections; the visible sky
and haze retain the original afternoon treatment. Local 4K/2K/1K files are used
for high/medium/low quality. [HDRI source and lighting notes](public/environments/README.md).
Nearby canopy tubes cast warm area light onto the paving and surrounding surfaces. High and
medium quality also add subtle contact shading; low quality keeps the lighter rendering path.
The shop and sign names are invented: there is no real business, brand or logo anywhere in the
scene. The street names are real Causeway Bay streets.

## Running it locally

```
git clone --branch claude/modest-fermi-witbgu https://github.com/imsarah/HongKongThreejs.git
cd HongKongThreejs
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
```

The only runtime dependency is `three` (0.186). The build uses a relative base, so `dist/` works
from any sub-path. It runs best on a desktop GPU in a Chromium-based browser, and also runs on
laptops and phones on a lower quality tier.

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
  shelves of goods. Here and there a roller shutter is down.
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
- **People.** Mixamo's Josh, Shannon, Suzie and Martha form most of the Hong Kong crowd,
  alongside a few of the original characters. Suzie is also the player's body on foot and
  in cars. Characters walk and hurry along both sidewalks, stand on the phone outside
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
  across the street. The sky fill is raised for the canyon of towers, and the shadow box
  reaches the tower tops.

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
- **City:**
  - the beach, ocean, surf, park, promenade and palms are gone, and the east side is a second
    row of buildings (`world/ground.js`);
  - the hotels are replaced by the generated Hong Kong frontage (`world/hk-buildings.js`).
- **Street:**
  - the street furniture, markings and signs are rebuilt to Hong Kong conventions
    (`world/street.js`);
  - traffic keeps left, parked cars face the way the near lane runs, and there are red taxis
    and Hong Kong plates (`world/hk-plates.js`);
  - the lifeguard ATV is gone.
- **Player:**
  - the third-person body (`player/avatar.js`) and running are new.
- **Light and text:**
  - the sun moves from a sunrise over the Atlantic to a late-afternoon sun in the south-west;
  - the titles, the loading screen and these docs are rewritten.

The original Ocean Drive brief is kept in [PROMPT.md](PROMPT.md) for the record, with the Hong
Kong brief after it.

## Not done yet

- **The real map.** The street is still Ocean Drive's straight road with side streets from the
  west. Building the real Causeway Bay layout (the bend of Hennessy Road, Yee Wo Street, the
  blocks round Times Square) needs an OpenStreetMap export of the area.
- **Cars.** They are Ocean Drive's models, so their steering wheels are on the left. Hong Kong
  cars are right-hand drive.
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
blender/           the car models (Ocean Drive's): Python build scripts and cars.blend
public/models/     the car and people GLBs
tools/             Playwright capture and test harnesses (from Ocean Drive)
```

## Licence

MIT. See [LICENSE](LICENSE). The original Ocean Drive copyright notice is kept, as the licence
requires.
