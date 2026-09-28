# Computational Mechanics Solver web app. Serves the browser front end (web/) and the
# Python API; accounts live in the database named by CMS_DATABASE_URL, project data
# and avatars under CMS_DATA_DIR. Configuration comes from environment variables only.
FROM python:3.12-slim

WORKDIR /app

ARG GIT_COMMIT=unknown
ARG GIT_DIRTY=false

COPY requirements.txt ./
RUN pip install \
    --default-timeout=300 \
    --retries 10 \
    -i https://mirrors.aliyun.com/pypi/simple/ \
    --no-cache-dir \
    -r requirements.txt

COPY . .

RUN groupadd -r cms && useradd -r -g cms -d /app cms \
    && mkdir -p /var/lib/cms && chown -R cms:cms /var/lib/cms /app

ENV HOST=0.0.0.0 \
    PORT=8765 \
    CMS_DATA_DIR=/var/lib/cms \
    MECHANICS_GIT_COMMIT=${GIT_COMMIT} \
    MECHANICS_GIT_DIRTY=${GIT_DIRTY}

USER cms
VOLUME ["/var/lib/cms"]
EXPOSE 8765

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8765/api/version', timeout=4).status == 200 else 1)"

CMD ["python", "run_webapp.py"]
