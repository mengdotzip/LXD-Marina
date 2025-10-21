package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	lxd "github.com/canonical/lxd/client"
	"github.com/canonical/lxd/shared/api"
)

type Server struct {
	LxdClient lxd.InstanceServer
	currentVm string
}

type InstanceInfo struct {
	Name   string `json:"name"`
	Status string `json:"status"`
	Type   string `json:"type"`
}

type CreateInstanceRequest struct {
	Name   string `json:"name"`
	Alias  string `json:"alias"`
	Server string `json:"server"`
	Type   string `json:"type"`
}

type InstanceRequest struct {
	Name string      `json:"name"`
	Data interface{} `json:"data,omitempty"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func (s *Server) CreateInstance(w http.ResponseWriter, r *http.Request) {
	returnCors(w, r)

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Printf("Method: %s", r.Method)
	log.Printf("Content-Length: %d", r.ContentLength)
	log.Printf("Content-Type: %s", r.Header.Get("Content-Type"))

	w.Header().Set("Content-Type", "application/json")

	if s.LxdClient == nil {
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

	if req.Name == "" || req.Alias == "" {
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
			Alias:    req.Alias,
			Protocol: "simplestreams",
			Server:   req.Server,
		},
		Type: api.InstanceType(req.Type),
	}
	createReq.Profiles = []string{"default"}

	log.Printf("Creating instance: name='%s', image='%s'", req.Name, req.Alias)

	op, err := s.LxdClient.CreateInstance(createReq)
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

func (s *Server) ListInstances(w http.ResponseWriter, r *http.Request) {
	returnCors(w, r)

	if r.Method == "OPTIONS" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if s.LxdClient == nil {
		json.NewEncoder(w).Encode(APIResponse{
			Success: false,
			Error:   "LXD not connected",
		})
		return
	}

	instances, err := s.LxdClient.GetInstances(api.InstanceTypeAny)
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

func (s *Server) DeleteInstance(w http.ResponseWriter, r *http.Request) {
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

	op, err := s.LxdClient.DeleteInstance(req.Name)
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

func (s *Server) ControlInstance(w http.ResponseWriter, r *http.Request) {
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

	op, err := s.LxdClient.UpdateInstanceState(req.Name, reqState, "")
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
		Data:    fmt.Sprintf("Instance %s %s successfully", req.Name, req.Data),
	})

}

func returnCors(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Write(nil)
}
