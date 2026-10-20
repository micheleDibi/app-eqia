unpack_release() {
    [[ "$RELEASE" =~ ^[0-9]{8}-[0-9]{6}-[a-f0-9]{7,12}$ ]] || die "Nome release non valido."
    [[ "$SHA" =~ ^[a-f0-9]{40}$ && "$ARCHIVE_SHA" =~ ^[a-f0-9]{64}$ ]] || die "Impronte non valide."
    local archive="$BASE/incoming/$RELEASE.tar.gz" directory="$BASE/releases/$RELEASE"
    [[ -f "$archive" ]] || die "Archivio assente."
    [[ "$(sha256sum "$archive" | cut -d' ' -f1)" == "$ARCHIVE_SHA" ]] || die "Archivio corrotto."
    [[ ! -e "$directory" ]] || die "Release già presente; utilizzare un nuovo identificativo."
    python3 - "$archive" <<'PY'
from pathlib import PurePosixPath
import sys, tarfile
with tarfile.open(sys.argv[1]) as archivio:
    for voce in archivio:
        percorso = PurePosixPath(voce.name)
        if percorso.is_absolute() or ".." in percorso.parts or not (voce.isfile() or voce.isdir()):
            raise SystemExit("Percorso o tipo di file archivio non valido.")
PY
    mkdir "$directory"
    tar -xzf "$archive" --no-same-owner -C "$directory"
    printf 'SHA=%s\nRELEASE=%s\nCREATED_AT=%s\n' "$SHA" "$RELEASE" "$(date -u +%FT%TZ)" > "$directory/RELEASE_INFO"
    python3 - "$CONTRACT" "$directory/deploy/staging.json" <<'PY'
import base64, json, sys
assert json.loads(base64.b64decode(sys.argv[1])) == json.load(open(sys.argv[2])), "Contratto locale e release divergenti."
PY
}

backup_db() {
    local directory="$1" snapshot
    snapshot="$BASE/snapshots/$(date -u +%Y%m%d-%H%M%S)-$(basename "$directory").sql.gz"
    compose "$directory" exec -T db sh -c \
        'exec mariadb-dump --defaults-extra-file=/run/secrets/client.cnf --single-transaction --routines --events --triggers "$MARIADB_DATABASE"' \
        | gzip > "$snapshot.partial"
    gzip -t "$snapshot.partial"
    mv "$snapshot.partial" "$snapshot"
    sha256sum "$snapshot" > "$snapshot.sha256"
    log "Backup verificato: $snapshot"
    if [[ -d "$BASE/state/notizie" ]]; then
        tar -C "$BASE/state" -czf "$snapshot.files.tar.gz.partial" notizie
        gzip -t "$snapshot.files.tar.gz.partial"
        mv "$snapshot.files.tar.gz.partial" "$snapshot.files.tar.gz"
        sha256sum "$snapshot.files.tar.gz" > "$snapshot.files.tar.gz.sha256"
        log "Archivio allegati verificato: $snapshot.files.tar.gz"
    fi
}

verify_release() {
    local directory="$1" code
    curl -fsS --max-time 10 "http://127.0.0.1:$WEB_PORT/healthz" >/dev/null
    curl -fsS --max-time 10 "http://127.0.0.1:$WEB_PORT/api/salute"
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:$WEB_PORT/api/auth/session")"
    [[ "$code" == 401 ]] || die "La rotta protetta restituisce $code invece di 401."
    compose "$directory" exec -T api python scripts/verifica_staging.py
    iptables -C DOCKER-USER -p tcp -m conntrack --ctorigdst "$SERVER_IP" --ctorigdstport "$WEB_PORT" -j DROP
    log "Verifica applicazione, database TLS e isolamento superata."
}

activate_release() {
    local directory="$1" previous
    compose "$directory" up -d --wait --wait-timeout 120 api web
    verify_release "$directory"
    previous="$(readlink -f "$BASE/current" 2>/dev/null || true)"
    if [[ -f "$previous/RELEASE_INFO" && "$previous" != "$directory" ]]; then
        ln -sfn "$previous" "$BASE/previous"
    fi
    ln -s "$directory" "$BASE/.current-new"
    mv -Tf "$BASE/.current-new" "$BASE/current"
    log "Release attiva: $(basename "$directory")."
}

deploy_release() {
    lock_deploy
    unpack_release
    local directory="$BASE/releases/$RELEASE"
    python3 "$directory/deploy/configura.py"
    compose "$directory" config --quiet
    compose "$directory" build api web
    compose "$directory" up -d --wait --wait-timeout 180 db
    # Le migrazioni non corrono mentre l'applicazione precedente scrive.
    compose "$directory" stop web api
    backup_db "$directory"
    compose "$directory" run --rm --no-deps -T api python scripts/migra_staging.py
    activate_release "$directory"
}

rollback_release() {
    lock_deploy
    [[ "$RELEASE" =~ ^[0-9]{8}-[0-9]{6}-[a-f0-9]{7,12}$ ]] || die "Specificare la release di rollback."
    local directory="$BASE/releases/$RELEASE"
    [[ -f "$directory/RELEASE_INFO" ]] || die "Release di rollback assente."
    log "Rollback applicativo; il database conserva tutte le migrazioni applicate."
    backup_db "$(current)"
    activate_release "$directory"
}
