# Technical Notes — First Browser Slice

- The current build intentionally avoids a bundler so it can be deployed as plain static files.
- Three.js is imported as a pinned ES module from jsDelivr.
- The simulation uses delta-time updates and caps large frame steps.
- Rendering resolution is capped at devicePixelRatio 2 to avoid excessive GPU load on high-density displays.
- Placeholder runner geometry is procedural and should later be replaced with optimized skinned GLTF characters.
- The race engine currently lives in one file for speed of iteration; modularization is planned once the first loop is validated.
