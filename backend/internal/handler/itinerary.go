package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/model"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/planner"
)

type Handler struct {
	planner *planner.Planner
}

func New(p *planner.Planner) *Handler {
	return &Handler{planner: p}
}

func (h *Handler) HandleItinerary(w http.ResponseWriter, r *http.Request) {
	var req model.ItineraryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	// Validate required fields
	if req.City == "" {
		writeError(w, http.StatusBadRequest, "city is required")
		return
	}
	if _, ok := model.Cities[req.City]; !ok {
		writeError(w, http.StatusBadRequest, "unknown city: "+req.City)
		return
	}
	if req.Days < 1 || req.Days > 7 {
		writeError(w, http.StatusBadRequest, "days must be between 1 and 7")
		return
	}
	if req.Budget < 1 || req.Budget > 4 {
		writeError(w, http.StatusBadRequest, "budget must be between 1 and 4")
		return
	}
	if req.Pace < 1 || req.Pace > 5 {
		writeError(w, http.StatusBadRequest, "pace must be between 1 and 5")
		return
	}

	log.Printf("handler: itinerary request for %s, %d days, budget=%d, pace=%d",
		req.City, req.Days, req.Budget, req.Pace)

	resp, err := h.planner.Plan(r.Context(), req)
	if err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()

		switch {
		case strings.Contains(msg, "unknown city"):
			status = http.StatusBadRequest
		case strings.Contains(msg, "no places found"):
			status = http.StatusUnprocessableEntity
		case strings.Contains(msg, "foursquare"):
			status = http.StatusBadGateway
		case strings.Contains(msg, "ollama: request failed"):
			status = http.StatusServiceUnavailable
		}

		log.Printf("handler: plan error: %v", err)
		writeError(w, status, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleRefreshStop(w http.ResponseWriter, r *http.Request) {
	var req model.RefreshStopRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	if req.StopFsqID == "" {
		writeError(w, http.StatusBadRequest, "stop_fsq_id is required")
		return
	}
	if req.Preferences.City == "" {
		writeError(w, http.StatusBadRequest, "preferences.city is required")
		return
	}
	if _, ok := model.Cities[req.Preferences.City]; !ok {
		writeError(w, http.StatusBadRequest, "unknown city: "+req.Preferences.City)
		return
	}

	log.Printf("handler: refresh-stop request for stop %s in day %d",
		req.StopFsqID, req.CurrentDay.DayNumber)

	resp, err := h.planner.RefreshStop(r.Context(), req)
	if err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()

		switch {
		case strings.Contains(msg, "not found in current day"):
			status = http.StatusBadRequest
		case strings.Contains(msg, "no replacement candidates"):
			status = http.StatusUnprocessableEntity
		case strings.Contains(msg, "foursquare"):
			status = http.StatusBadGateway
		case strings.Contains(msg, "ollama: request failed"):
			status = http.StatusServiceUnavailable
		}

		log.Printf("handler: refresh-stop error: %v", err)
		writeError(w, status, msg)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
