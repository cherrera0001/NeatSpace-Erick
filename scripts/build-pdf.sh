#!/usr/bin/env bash
# Genera docs/Libro-del-Fundador.pdf desde el Markdown, a nivel de edición.
# Requisitos: pandoc + Microsoft Edge (Chromium) en Windows.
# Uso: bash scripts/build-pdf.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/docs/Libro-del-Fundador.md"
HEADER="$ROOT/scripts/print-header.html"
OUT="$ROOT/docs/Libro-del-Fundador.pdf"

TMP="$(mktemp -d)"
BUILD="$TMP/build.md"
HTML="$TMP/libro.html"

# Saltos de página para que la portada, la página legal y la nota editorial
# ocupen su propia hoja (el índice, los tomos y los capítulos ya saltan por CSS).
sed -e 's|^<a id="legal"></a>|<div class="pagebreak"></div>\n\n<a id="legal"></a>|' \
    -e 's|^<a id="nota-editorial"></a>|<div class="pagebreak"></div>\n\n<a id="nota-editorial"></a>|' \
    "$SRC" > "$BUILD"

pandoc "$BUILD" -f markdown -t html5 -s --wrap=none \
  --metadata title="Libro del Fundador — NeatSpace" \
  --include-in-header "$HEADER" \
  -o "$HTML"

EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
[ -f "$EDGE" ] || EDGE="/c/Program Files/Microsoft/Edge/Application/msedge.exe"

"$EDGE" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
  --no-pdf-header-footer \
  --user-data-dir="$TMP/profile" \
  --print-to-pdf="$(cygpath -w "$OUT")" \
  "file:///$(cygpath -m "$HTML")"

echo "PDF generado: $OUT"
