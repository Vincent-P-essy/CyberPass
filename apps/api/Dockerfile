FROM python:3.12-slim@sha256:57cd7c3a7a273101a6485ba99423ee568157882804b1124b4dd04266317710de

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install --no-install-recommends -y curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 cyberpass \
    && useradd --uid 10001 --gid cyberpass --create-home --shell /usr/sbin/nologin cyberpass

WORKDIR /app

COPY pyproject.toml requirements-prod.lock ./
RUN pip install --require-hashes -r requirements-prod.lock

COPY app ./app

COPY alembic.ini ./
COPY alembic ./alembic
COPY data ./data
COPY scripts ./scripts

RUN mkdir -p /app/uploads \
    && chown -R cyberpass:cyberpass /app

USER cyberpass

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
