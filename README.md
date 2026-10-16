# ChromaFlux

A personal image workspace, made by AKSHAY ♥.

Compress, resize, crop, convert formats, prepare passport photos, upscale to an 8K long edge, straighten document photos with scan filters, and create typed or drawn signatures. Includes phone layouts, touch controls, and local image, audio and video processing.

## Use the website

Open https://ak5h88.github.io/chromaflux/ once GitHub Pages finishes deploying.

Your images and drawn signatures are processed in your browser. They are not uploaded to GitHub or another image service. The site has no analytics, external scripts, remote font requests, or remote font dependencies. The YouTube downloader separately requires your private service access key. Closing or refreshing clears the editing session.

The website itself is public. Image privacy does not restrict who can open the website.

## Files

`index.html` is a self-contained website with the interface, image tools, styles, fonts, and font licenses embedded. Download it and open it locally to use the tools offline. `FONT-LICENSES.txt` also provides the bundled font notices separately.

Media tools also require media-worker.js, ffmpeg-core.js, media-engine.json and all three media-core-*.bin files beside index.html. The media engine is downloaded from this site on first use (about 10 MB compressed); selected media never leaves the browser. Engine licenses and source information are in MEDIA-LICENSES.txt.

There is no build step. GitHub Pages serves the `main` branch from the repository root. To update the site, replace `index.html` and commit the change; preserve the embedded font licenses.

## Limits

The upscaler resizes and optionally sharpens; it does not use AI to recover missing detail. Scan output is an image, without OCR or PDF generation. Signature styles use six bundled handwriting fonts, with twelve variations and freehand drawing.

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

## YouTube downloader

The online downloader connects to https://chromaflux-downloader.onrender.com. Open the YouTube downloader tool and enter your private DOWNLOAD_ACCESS_KEY from Render → chromaflux-downloader → Environment. Never commit or share the key. It is held in page memory, sent only to your downloader service, and cleared on refresh or disconnect.

Choose highest-available video with audio, an available resolution cap, original-quality audio, or converted MP3. Original streams are preserved; video and audio are combined into MKV without re-encoding. 4K/8K options depend on the actual source. MP3 conversion does not improve quality.

YouTube links are sent to this separate service. Other image, audio and video files continue to be processed locally. Files are temporary, expire after one hour or a service restart, and are limited to 2 GiB. One download runs at a time. Free hosting can take 50 seconds or more to wake up. YouTube may refuse requests from hosting providers; successful hosting does not guarantee a video can be downloaded. Login-restricted, private and protected content is not supported.

The service uses yt-dlp and FFmpeg. Deployment files and YOUTUBE-SERVICE.md are included. youtube-service.json contains only the public service URL, never a key.
