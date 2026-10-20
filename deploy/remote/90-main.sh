case "$ACTION" in
    preflight) preflight ;;
    prepare) prepare ;;
    install|deploy) deploy_release ;;
    status)
        directory="$(current)"
        cat "$directory/RELEASE_INFO"
        compose "$directory" ps
        ;;
    verify) verify_release "$(current)" ;;
    logs) compose "$(current)" logs --tail 100 api web ;;
    backup-db) lock_deploy; backup_db "$(current)" ;;
    rollback) rollback_release ;;
    crea-accesso)
        lock_deploy
        compose "$(current)" exec -T api python scripts/crea_accesso_staging.py
        ;;
    *) die "Azione non supportata: $ACTION" ;;
esac
