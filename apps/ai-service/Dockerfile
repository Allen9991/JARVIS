FROM python:3.12-slim

WORKDIR /app

RUN pip install uv --no-cache-dir

# Resolve deps from pyproject.toml into a flat requirements list, then install.
# This avoids trying to build the project package (which has no source yet).
COPY pyproject.toml .
RUN uv pip compile pyproject.toml --no-header -o /tmp/requirements.txt \
    && uv pip install --system --no-cache -r /tmp/requirements.txt

COPY . .

# Render injects $PORT at runtime; 10000 is Render's default.
ENV PORT=10000
EXPOSE 10000

CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT}"]
