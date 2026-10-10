# Scene HDRI

[Kloofendal 28d Misty](https://polyhaven.com/a/kloofendal_28d_misty), photographed by
Jenelle van Heerden and processed by Greg Zaal, is licensed [CC0](https://polyhaven.com/license).
The original Radiance HDR files are hosted locally: 4K for high, 2K for medium, and 1K for low quality.

The photographed sky contributes 18% of the filtered diffuse/specular environment lighting.
The original analytic sky supplies the remaining lighting, visible dome, directional haze and
the sky in the cars' street reflection probes, preserving the afternoon colour and depth.
The HDRI's measured sun direction matches the scene's shadow-casting sun. Its solar core is
suppressed in indirect lighting because direct sun is supplied by the directional light.
A neutral lower hemisphere represents city pavement bounce. The source HDR texture is released
after filtering; only the smaller filtered lighting map stays on the GPU.

`source.json` records the original URLs, authors, source MD5 hashes, and sky measurements.
Run `node tools/import-hdri.mjs` to regenerate the downloads and metadata. Runtime loading uses
the application's base path and falls back to the original procedural sky if unavailable.
