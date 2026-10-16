# ChromaFlux

A personal image workspace, made by AKSHAY ♥.

Compress, resize, crop, convert formats, prepare passport photos, upscale to an 8K long edge, straighten document photos with scan filters, and create typed or drawn signatures. Includes phone layouts, touch controls, and local image, audio and video processing.

## Use the website

Open https://ak5h88.github.io/chromaflux/ once GitHub Pages finishes deploying.

Your images and drawn signatures are processed in your browser. They are not uploaded to GitHub or another image service. The site has no upload service or analytics. Fonts are bundled locally. Music plays a bundled MP3 directly from this website, with no third-party player. Closing or refreshing clears the editing session.

The website itself is public. Image privacy does not restrict who can open the website.

## Files

`index.html` is a self-contained website with the interface, image tools, styles, fonts, and font licenses embedded. Download it and open it locally to use the tools offline. `FONT-LICENSES.txt` also provides the bundled font notices separately.

Media tools also require media-worker.js, ffmpeg-core.js, media-engine.json and all three media-core-*.bin files beside index.html. The media engine is downloaded from this site on first use (about 10 MB compressed); selected media never leaves the browser. Engine licenses and source information are in MEDIA-LICENSES.txt.

There is no build step. GitHub Pages serves the `main` branch from the repository root. To update the site, replace `index.html` and commit the change; preserve the embedded font licenses.

## Limits

The upscaler resizes and optionally sharpens; it does not use AI to recover missing detail. Scan output is an image, without OCR or PDF generation. Signature styles use twelve bundled handwriting fonts, with eighteen variations and freehand drawing.

Input images are limited to 30 MB and 64 megapixels; output is limited to 64 megapixels and 16,000 pixels per side. Large images may exceed a phone's available memory. Supported input formats depend on the browser.

Instagram: https://www.instagram.com/ak5hayyy/  
YouTube: https://www.youtube.com/@1tapzlive  
Kick: https://kick.com/r0n4n-xd

## Audio and video

- Audio converter: MP3, M4A/AAC, WAV, FLAC and Ogg/Vorbis.
- Audio extractor: save sound from a video, with optional trimming.
- Audio cutter: start/end fields, sliders, playhead controls and selection preview.
- Audio compressor: Smallest, Balanced and High quality presets; optional mono audio.
- Video converter: MP4 (H.264/AAC) and WebM (VP8/Vorbis), without upscaling.
- Video cutter / trim: precise re-encoded clips; optional silent video.

Actual result previews, download links, size comparison, progress and cancellation are included.
File limits: 80 MB on mobile layouts, 200 MB on larger layouts. Video output is capped at a 1920px long edge. Processing may be slower than playback, especially on phones. Keep the tab open. The engine requires a current browser with WebAssembly, Workers and DecompressionStream. No SharedArrayBuffer or cross-origin isolation is required.

Source preview support varies by browser; conversion supports more inputs than a browser can preview. Audio/video tools require HTTP(S); local file opening continues to support the image tools. For local media use, run the included launcher with all engine assets.

## Music player

A single circular Play/Pause button sits in the top-right corner. It plays the user-provided soundtrack.mp3 directly from this website, without a video, track title, or external player. Playback is attempted when the site opens, initially at 35% volume. Browser autoplay restrictions may require Play or a first interaction. Pause preserves the playback position. Music pauses when the tab goes into the background or a local audio/video preview starts. Playback errors are announced accessibly, with a retry hint on the button.

Keep soundtrack.mp3 alongside index.html (or alongside ChromaFlux.html for the standalone version). The MP3 is also included in the phone and GitHub packages. There are no third-party music requests. Editing files remain in the browser.

## Glass workspace refresh

Translucent surfaces, rounded controls, soft color gradients, and gentle animations with reduced-motion support. Resize includes four adjustable corner handles, exact output dimensions, and Original, Freeform, Square, Wallpaper 9:16, 4:5, 5:7, 3:4, 3:5, 2:3, and 16:9 shapes. Framing crops the selected area before resizing; changing width and height sets the final export dimensions.

Signature previews start with “text here”. Six user-provided font families add to the six existing fonts (18 variations total). Duplicate TTF/OTF versions are included only once per family. User-provided font notices are preserved in FONT-LICENSES.txt and fonts/USER-FONT-README.pdf. Some are personal-use/demo fonts.

## Background remover

A local AI cutout tool with transparent PNG export at the original dimensions, Erase/Restore brushes with size and softness, 100%–400% zoom, view panning, undo/redo, original comparison and edge cleanup/feathering. Preview background colours do not alter the transparent download. Selected images are never uploaded. AI results vary and can be corrected with the brushes. Input limits: 30 MB; 12 megapixels on larger layouts or 6 megapixels on mobile layouts.

The pinned BRIA RMBG 1.4 quantized ONNX model and ONNX Runtime Web 1.20.1 are self-hosted. First use downloads about 40 MB. Inference runs in a cancellable Worker with a single WASM thread, without SharedArrayBuffer or a server. Downloaded model chunks and decompressed model bytes are checked with SHA-256. No third-party scripts or image-upload service is used. Keep background-worker.js, bg-engine.json, bg-model-1.bin, bg-model-2.bin, ort.wasm.min.js, ort-wasm-simd-threaded.mjs, ort-wasm-simd-threaded.wasm, and BACKGROUND-LICENSES.txt beside the published HTML.

The model is provided for personal/non-commercial use under the provider terms; commercial use requires a provider license. Runtime MIT license and third-party notices, model attribution, revision and model card are in BACKGROUND-LICENSES.txt.
