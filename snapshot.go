package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/canonical/lxd/shared/api"
)

type snapshotInfo struct {
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	Stateful  bool      `json:"stateful"`
}

func (s *Server) listSnapshots(w http.ResponseWriter, r *http.Request) {
	returnCors(w, r)

	w.Header().Set("Content-Type", "application/json")

	instanceName := r.URL.Query().Get("name")

	if instanceName == "" {
		http.Error(w, "Instance name required", http.StatusBadRequest)
		return
	}

	if s.lxdClient == nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "LXD not connected",
		})
		return
	}

	snapshots, err := s.lxdClient.GetInstanceSnapshots(instanceName)
	if err != nil {
		log.Printf("Failed to list snapshots: %v", err)
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	snapshotsList := make([]snapshotInfo, len(snapshots))
	for i, snapshot := range snapshots {
		snapshotsList[i] = snapshotInfo{
			Name:      snapshot.Name,
			CreatedAt: snapshot.CreatedAt,
			Stateful:  snapshot.Stateful,
		}
	}

	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data:    snapshotsList,
	})
}

func (s *Server) createSnapshot(w http.ResponseWriter, r *http.Request) {
	returnCors(w, r)

	if r.Method != "POST" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var req struct {
		Name         string `json:"name"`
		SnapshotName string `json:"snapshot_name"`
		Stateful     bool   `json:"stateful"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "Invalid request"})
		return
	}

	if s.lxdClient == nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "LXD not connected"})
		return
	}

	snapshot := api.InstanceSnapshotsPost{
		Name:     req.SnapshotName,
		Stateful: req.Stateful,
	}

	op, err := s.lxdClient.CreateInstanceSnapshot(req.Name, snapshot)
	if err != nil {
		log.Printf("Failed to create snapshot: %v", err)
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	err = op.Wait()
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(APIResponse{Success: true, Data: "Snapshot created"})
}

func (s *Server) restoreSnapshot(w http.ResponseWriter, r *http.Request) {

	returnCors(w, r)

	if r.Method != "POST" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var req struct {
		Name         string `json:"name"`
		SnapshotName string `json:"snapshot_name"`
		Stateful     bool   `json:"stateful"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "Invalid request"})
		return
	}

	if s.lxdClient == nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "LXD not connected"})
		return
	}

	restoreReq := api.InstancePut{
		Restore:  req.SnapshotName,
		Stateful: req.Stateful,
	}

	op, err := s.lxdClient.UpdateInstance(req.Name, restoreReq, "")
	if err != nil {
		log.Printf("Failed to restore snapshot: %v", err)
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	err = op.Wait()
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(APIResponse{Success: true, Data: "Snapshot restored"})
}

func (s *Server) deleteSnapshot(w http.ResponseWriter, r *http.Request) {

	returnCors(w, r)

	if r.Method != "DELETE" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var req struct {
		Name         string `json:"name"`
		SnapshotName string `json:"snapshot_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "Invalid request"})
		return
	}

	if s.lxdClient == nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "LXD not connected"})
		return
	}

	op, err := s.lxdClient.DeleteInstanceSnapshot(req.Name, req.SnapshotName)
	if err != nil {
		log.Printf("Failed to delete snapshot: %v", err)
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	err = op.Wait()
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(APIResponse{Success: true, Data: "Snapshot deleted"})
}
