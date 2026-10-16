# ChromaFlux YouTube downloader service

This service supplies the server side of ChromaFlux's YouTube downloader. GitHub Pages remains the website host. The server uses yt-dlp and FFmpeg in a Docker container, with Node 24 for the JavaScript runtime required by current YouTube extraction.

## Deployment

Copy these files to the root of the ChromaFlux GitHub repository. Deploy the repository on Render using its Blueprint support and the included `render.yaml`, which selects a **free** web service. The blueprint generates a private `DOWNLOAD_ACCESS_KEY`; preserve it as a Render secret and never put it in the public GitHub repository.

After deployment, use the prepared frontend and run `node configure-youtube.cjs https://YOUR-ACTUAL-SERVICE.onrender.com WEBSITE_FOLDER`. This sets `youtube-service.json` and allows only that exact service origin in the website's connection policy. The website asks for your private downloader access key. The key stays in memory for that page session; it is sent only to your configured service through the Authorization header. The key is not embedded in the public website. Never put the access key in the service URL, frontend files or GitHub.

Free Render services can sleep when idle, have bandwidth limits, and use temporary storage. Completed files expire after one hour or on a service restart. The default maximum final file is 2 GiB; adjust `MAX_FILE_BYTES` on the host if appropriate. One download runs at a time. The service does not require a paid plan or persistent disk.

## Quality

- Highest available video: `bv+ba/b`, merging the highest selected video and audio streams into MKV without re-encoding.
- Optional resolution caps use `bv[height<=N]+ba/b[height<=N]`.
- Original-quality audio: `ba`, keeping the source codec and container.
- Optional MP3: converts the best available audio; conversion does not improve source quality.

4K or 8K appears only when those streams are actually available. Highest-quality video may use AV1 or VP9 and may need a compatible player. Downloading does not enlarge or enhance video.

## Access and operation

Only canonical YouTube video links are accepted. Playlists, arbitrary website URLs and command-line options are rejected. Requests need the private service key. Cross-origin requests are restricted to `ALLOWED_ORIGINS`. Download files use separate temporary tokens. No YouTube cookies, browser credentials, proxy services, login bypass or DRM decryption are included.

Unlike the image/audio/video editing tools, this tool sends the submitted YouTube link to your downloader server, which fetches the streams and provides a temporary download. It does not upload files from your device.

YouTube sometimes refuses cloud-hosted downloaders or individual videos. The service reports access errors; it cannot guarantee access to every link. A real download must be tested from the selected host after deployment.

## Local development

Install Python 3.10+, `yt-dlp[default]`, FFmpeg and Node 24+. Configure `DOWNLOAD_ACCESS_KEY` with a random value of at least 24 characters, `ALLOWED_ORIGINS` with the frontend origin, and optional `PYTHON_BIN` / `JS_RUNTIME_BIN` executable paths. Run `npm start`.

Dependencies and documentation:
- https://github.com/yt-dlp/yt-dlp
- https://github.com/yt-dlp/yt-dlp/wiki/EJS
- https://ffmpeg.org/
- https://render.com/docs/free

yt-dlp is licensed under the Unlicense, with third-party dependency notices in its distribution. FFmpeg and its linked codecs retain their respective licenses in the container's Debian packages.
