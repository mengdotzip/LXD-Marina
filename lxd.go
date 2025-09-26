package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	lxd "github.com/canonical/lxd/client"
	"github.com/canonical/lxd/shared/api"
)

type Server struct {
	lxdClient lxd.InstanceServer
}

func (s *Server) createInstance(w http.ResponseWriter, r *http.Request) {
	returnCors(w, r)

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Printf("Method: %s", r.Method)
	log.Printf("Content-Length: %d", r.ContentLength)
	log.Printf("Content-Type: %s", r.Header.Get("Content-Type"))

	w.Header().Set("Content-Type", "application/json")

	if s.lxdClient == nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "LXD not connected",
		})
		return
	}

	var req CreateInstanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("JSON decode error: %v", err)
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Invalid JSON",
		})
		return
	}

	if req.Name == "" || req.Image == "" {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Name and image are required",
		})
		return
	}

	createReq := api.InstancesPost{
		Name: req.Name,
		Source: api.InstanceSource{
			Type:     "image",
			Alias:    "24.04",
			Protocol: "simplestreams",
			Server:   "https://cloud-images.ubuntu.com/releases/",
		},
		Type: "container",
	}
	createReq.Profiles = []string{"default"}

	log.Printf("Creating instance: name='%s', image='%s'", req.Name, req.Image)

	op, err := s.lxdClient.CreateInstance(createReq)
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		log.Println(err)
		return
	}

	err = op.Wait()
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data:    "Container created successfully",
	})
}

func (s *Server) listInstances(w http.ResponseWriter, r *http.Request) {
	returnCors(w, r)

	if r.Method == "OPTIONS" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if s.lxdClient == nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "LXD not connected",
		})
		return
	}

	instances, err := s.lxdClient.GetInstances(api.InstanceTypeContainer)
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	containers := make([]InstanceInfo, len(instances))
	for i, instance := range instances {
		containers[i] = InstanceInfo{
			Name:   instance.Name,
			Status: instance.Status,
			Type:   instance.Type,
		}
	}

	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data:    containers,
	})
}

func (s *Server) deleteInstance(w http.ResponseWriter, r *http.Request) {
	returnCors(w, r)

	if r.Method != "DELETE" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var req InstanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("JSON decode error: %v", err)
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Invalid JSON",
		})
		return
	}

	if req.Name == "" {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Field 'Name' is required",
		})
		return
	}

	op, err := s.lxdClient.DeleteInstance(req.Name)
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	err = op.Wait()
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data:    fmt.Sprintf("Instance %s deleted successfully", req.Name),
	})

}

func (s *Server) controlInstance(w http.ResponseWriter, r *http.Request) {
	returnCors(w, r)

	if r.Method != "PUT" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var req InstanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("JSON decode error: %v", err)
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Invalid JSON",
		})
		return
	}

	if req.Name == "" || req.Data == "" {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Field 'Name' and 'Data' is required",
		})
		return
	}

	var reqState api.InstanceStatePut
	switch req.Data {
	case "start":
		reqState = api.InstanceStatePut{
			Action:  "start",
			Timeout: 60,
		}
	case "stop":
		reqState = api.InstanceStatePut{
			Action:  "stop",
			Timeout: 60,
		}
	default:
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "Invalid action. Use 'start' or 'stop'",
		})
		return
	}

	op, err := s.lxdClient.UpdateInstanceState(req.Name, reqState, "")
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	err = op.Wait()
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data:    fmt.Sprintf("Instance %s %sed successfully", req.Name, req.Data),
	})

}
