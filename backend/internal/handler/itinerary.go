package handler

import (
	"encoding/json"
	"fmt"
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

// decodeAndValidate parses the request body and validates required fields.
func decodeAndValidate(r *http.Request) (model.ItineraryRequest, error) {
	var req model.ItineraryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return req, fmt.Errorf("invalid request body: %s", err.Error())
	}
	if req.City == "" {
		return req, fmt.Errorf("city is required")
	}
	if _, ok := model.Cities[req.City]; !ok {
		return req, fmt.Errorf("unknown city: %s", req.City)
	}
	if req.Days < 1 || req.Days > 7 {
		return req, fmt.Errorf("days must be between 1 and 7")
	}
	if req.Budget < 1 || req.Budget > 4 {
		return req, fmt.Errorf("budget must be between 1 and 4")
	}
	if req.Pace < 1 || req.Pace > 5 {
		return req, fmt.Errorf("pace must be between 1 and 5")
	}
	return req, nil
}

// planErrorStatus maps planner error messages to HTTP status codes.
func planErrorStatus(err error) int {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "unknown city"):
		return http.StatusBadRequest
	case strings.Contains(msg, "no places found"):
		return http.StatusUnprocessableEntity
	case strings.Contains(msg, "foursquare"):
		return http.StatusBadGateway
	case strings.Contains(msg, "ollama: request failed"):
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

func (h *Handler) HandleItinerary(w http.ResponseWriter, r *http.Request) {
	req, err := decodeAndValidate(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	log.Printf("handler: itinerary request for %s, %d days, budget=%d, pace=%d",
		req.City, req.Days, req.Budget, req.Pace)

	resp, err := h.planner.Plan(r.Context(), req)
	if err != nil {
		log.Printf("handler: plan error: %v", err)
		writeError(w, planErrorStatus(err), err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleItineraryStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	req, err := decodeAndValidate(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	flusher.Flush()

	log.Printf("handler: streaming itinerary request for %s, %d days, budget=%d, pace=%d",
		req.City, req.Days, req.Budget, req.Pace)

	writeSSE := func(event planner.StreamEvent) {
		data, err := json.Marshal(event)
		if err != nil {
			return
		}
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	resp, err := h.planner.PlanStream(r.Context(), req, writeSSE)
	if err != nil {
		writeSSE(planner.StreamEvent{Type: "error", Payload: err.Error()})
		log.Printf("handler: stream plan error: %v", err)
		return
	}

	writeSSE(planner.StreamEvent{Type: "result", Payload: resp})
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
		log.Printf("handler: refresh-stop error: %v", err)
		writeError(w, planErrorStatus(err), err.Error())
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
