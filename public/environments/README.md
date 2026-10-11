# Scene HDRI

[Modern Evening Street](https://polyhaven.com/a/modern_evening_street) by Grzegorz Wronkowski
is licensed [CC0](https://polyhaven.com/license).
The original Radiance HDR files are hosted locally: 4K for high, 2K for medium, and 1K for low quality.

The photographed urban HDRI supplies filtered diffuse/specular environment lighting, including
the street's cooler sky, surrounding buildings and warm lamps. Its horizon stays level; bright
lamps are not treated as a sun. The original visible sky, directional haze and shadow-casting
sun retain the previous afternoon depth. Cars retain their local street reflection probes.
The source HDR texture is released after filtering; only the smaller filtered lighting map
stays on the GPU. The earlier Kloofendal downloads are retained locally but are no longer loaded.

`source.json` records the original URLs, authors, source MD5 hashes, and sky measurements.
Run `node tools/import-hdri.mjs` to regenerate the downloads and metadata. Runtime loading uses
the application's base path and falls back to the original procedural sky if unavailable.
