#!/usr/bin/env bash
# Monta _site/ só com o que é público e valida. Uso: scripts/build.sh [saida]
set -euo pipefail
OUT="${1:-_site}"; fail=0
err(){ echo "::error::$*"; fail=1; }
rm -rf "$OUT"; mkdir -p "$OUT"

for f in index.html 404.html privacidade.html manifest.webmanifest sw.js config.js; do [ -f "$f" ] && cp "$f" "$OUT/" || err "falta $f"; done
cp -R css js icons "$OUT/"; touch "$OUT/.nojekyll"

# o service worker troca de versão a cada deploy (senão o cache antigo fica preso)
VER="${GITHUB_SHA:-local}"; VER="${VER:0:7}"
sed -i "s/const VERSION = 'rodada-[^']*'/const VERSION = 'rodada-$VER'/" "$OUT/sw.js"

# tudo que o SW pré-carrega precisa existir
for f in $(grep -oE "'[^']+\.(html|css|js|png|svg|webmanifest)'" sw.js | tr -d "'" | sort -u); do [ -e "$OUT/$f" ] || err "sw.js lista $f mas ele não está no site"; done

# segredos / arquivos que nunca devem ir ao ar
bad=$(find "$OUT" -type f \( -name '.env*' -o -name '*.pem' -o -name '*.key' -o -name 'id_rsa*' \) || true); [ -n "$bad" ] && err "arquivo sensível: $bad"
hits=$(grep -rIlE 'AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[A-Za-z0-9]{32,}|xox[baprs]-[A-Za-z0-9-]{10,}' "$OUT" || true); [ -n "$hits" ] && err "possível segredo em: $hits"

# avisos de configuração (não bloqueiam)
grep -qE "measurementId: *'G-X+'" config.js && echo "::notice::Google Analytics DESLIGADO: defina analytics.measurementId em config.js"
grep -qE "sites: *\[\]" config.js && echo "::notice::Banner DESLIGADO: banner.sites está vazio em config.js"
grep -qE "endpoint: *''" config.js && echo "::notice::Formulário de sugestões DESLIGADO: defina feedback.endpoint em config.js"

echo "--- site em $OUT ($(du -sk "$OUT" | cut -f1) KB) ---"
[ "$fail" -eq 0 ] || { echo "BUILD BLOQUEADO"; exit 1; }
