#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ACTION="${1:?azione mancante}"
CONTRACT="${2:?contratto mancante}"
RELEASE="${3:-}"
SHA="${4:-}"
ARCHIVE_SHA="${5:-}"
eval "$(python3 - "$CONTRACT" <<'PY'
import base64, json, shlex, sys
c = json.loads(base64.b64decode(sys.argv[1]))
mapping = {"BASE":"base", "PROJECT":"project", "DOMAIN":"domain", "SERVER_IP":"serverIp",
           "PROXY_IP":"proxyIp", "WEB_PORT":"webPort", "DB_NAME":"databaseName"}
for var, key in mapping.items():
    print(f"export {var}={shlex.quote(str(c[key]))}")
PY
)"
die() { printf '%s\n' "$*" >&2; exit 1; }
log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }
[[ "$BASE" == /srv/ersaf-eqia && "$PROJECT" == ersaf-eqia-staging ]] ||
    die "Destinazione estranea allo staging Equia."
export EQIA_BASE="$BASE" EQIA_PROJECT="$PROJECT" EQIA_DOMAIN="$DOMAIN"
export EQIA_SERVER_IP="$SERVER_IP" EQIA_PROXY_IP="$PROXY_IP" EQIA_WEB_PORT="$WEB_PORT"

compose() {
    local directory="$1"; shift
    EQIA_RELEASE="$(basename "$directory")" docker compose --project-name "$PROJECT" \
        --file "$directory/deploy/compose.yml" "$@"
}

require_installation() {
    [[ -f "$BASE/.progetto" ]] && [[ "$(cat "$BASE/.progetto")" == "$PROJECT" ]] ||
        die "Installazione Equia assente o non riconosciuta."
}

current() {
    require_installation
    local directory
    directory="$(readlink -f "$BASE/current")"
    [[ "$directory" == "$BASE/releases/"* && -f "$directory/RELEASE_INFO" ]] ||
        die "Nessuna release attiva."
    printf '%s' "$directory"
}

preflight() {
    [[ "$(id -u)" == 0 ]] || die "Il deploy richiede l'utente root del server dedicato."
    for command in docker python3 openssl iptables curl gzip tar flock; do
        command -v "$command" >/dev/null || die "Comando mancante: $command"
    done
    docker compose version
    [[ "$(df -Pk /var | awk 'NR==2 {print $4}')" -gt 1500000 ]] || die "Spazio /var insufficiente."
    [[ "$(df -Pk /srv | awk 'NR==2 {print $4}')" -gt 1500000 ]] || die "Spazio /srv insufficiente."
    if [[ ! -f "$BASE/.progetto" ]]; then
        [[ -z "$(ss -ltnH "sport = :$WEB_PORT")" ]] || die "Porta già occupata."
    fi
    ip -4 addr show | grep -Fq "$SERVER_IP/" || die "IP del server non corrispondente."
    log "Preflight superato per $PROJECT su $SERVER_IP:$WEB_PORT."
}

prepare() {
    preflight
    [[ ! -L "$BASE" ]] || die "La destinazione non può essere un collegamento."
    if [[ -d "$BASE" && ! -f "$BASE/.progetto" ]]; then
        [[ -z "$(find "$BASE" -mindepth 1 -maxdepth 1 -print -quit)" ]] ||
            die "Cartella esistente non riconosciuta: nessuna modifica."
    fi
    mkdir -p "$BASE"/{incoming,releases,shared,state,snapshots,logs}
    if [[ ! -f "$BASE/.progetto" ]]; then printf '%s\n' "$PROJECT" > "$BASE/.progetto"; fi
    require_installation
    log "Destinazione pronta."
}

lock_deploy() {
    require_installation
    exec 9>"$BASE/.lock"
    flock -n 9 || die "Un altro rilascio Equia è già in corso."
}
