# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps for bcrypt/cryptography wheels are prebuilt; keep the image slim.
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Optional ML tier - uncomment to enable Presidio/Detoxify/embeddings.
# COPY requirements-ml.txt ./
# RUN pip install -r requirements-ml.txt

COPY app ./app

RUN addgroup --system guardian && adduser --system --ingroup guardian guardian
USER guardian

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/health').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
