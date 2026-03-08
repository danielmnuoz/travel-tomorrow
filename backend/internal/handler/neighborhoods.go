package handler

import (
	"encoding/json"
	"net/http"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/model"
)

func (h *Handler) HandleNeighborhoods(w http.ResponseWriter, r *http.Request) {
	city := r.URL.Query().Get("city")
	if city == "" {
		writeError(w, http.StatusBadRequest, "city query parameter is required")
		return
	}

	neighborhoods, ok := model.Neighborhoods[city]
	if !ok {
		neighborhoods = []model.Neighborhood{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string][]model.Neighborhood{
		"neighborhoods": neighborhoods,
	})
}
