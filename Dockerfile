FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/ytdlp && /opt/ytdlp/bin/pip install --no-cache-dir 'yt-dlp[default]'
ENV PYTHON_BIN=/opt/ytdlp/bin/python JS_RUNTIME_BIN=/usr/local/bin/node NODE_ENV=production PORT=10000
WORKDIR /app
COPY youtube-server.cjs package.json ./
USER node
EXPOSE 10000
CMD ["node", "youtube-server.cjs"]
