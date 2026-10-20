import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { aggiornaQuery, leggiQuery } from "../lib/queryPagina.js";

export default function useQueryPagina(schema) {
  const location = useLocation();
  const navigate = useNavigate();
  const aggiorna = useCallback((modifiche, { replace = true } = {}) => {
    navigate({ pathname: location.pathname, search: aggiornaQuery(location.search, modifiche, schema), hash: location.hash },
      { replace, state: location.state });
  }, [location, navigate, schema]);
  return [leggiQuery(location.search, schema), aggiorna];
}
