package server

import (
	"encoding/json"
	"log"
	"net/http"
)

type gpuInfo struct {
	Index        int    `json:"index"`
	Vendor       string `json:"vendor"`
	Product      string `json:"product"`
	Driver       string `json:"driver"`
	PciAddress   string `json:"pci_address"`
	CardDevice   string `json:"card_device"`
	RenderDevice string `json:"render_device"`
}

type gpuAttached struct {
	Name         string `json:"name"`
	InstanceName string `json:"instance_name"`
	Type         string `json:"type"`
	Id           string `json:"id"`
	Pci          string `json:"pci"`
}

func (s *Server) GetHostGPUs(w http.ResponseWriter, r *http.Request) {

	returnCors(w, r)

	if r.Method != "GET" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if s.LxdClient == nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "LXD not connected"})
		return
	}

	resources, err := s.LxdClient.GetServerResources()
	if err != nil {
		log.Printf("Failed to get resources: %v", err)
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	gpuList := make([]gpuInfo, len(resources.GPU.Cards))
	for i, card := range resources.GPU.Cards {
		gpuList[i] = gpuInfo{
			Index:      i,
			Vendor:     card.Vendor,
			Product:    card.Product,
			Driver:     card.Driver,
			PciAddress: card.PCIAddress,
		}

		if card.DRM != nil {
			gpuList[i].CardDevice = card.DRM.CardDevice
			gpuList[i].RenderDevice = card.DRM.RenderDevice
		}
	}

	json.NewEncoder(w).Encode(APIResponse{
		Success: true,
		Data:    gpuList,
	})

}

func (s *Server) ListGPUDevices(w http.ResponseWriter, r *http.Request) {
	returnCors(w, r)

	if r.Method != "GET" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	instanceName := r.URL.Query().Get("name")

	if s.LxdClient == nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "LXD not connected"})
		return
	}

	instance, _, err := s.LxdClient.GetInstance(instanceName)
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	var gpuDevices []gpuAttached

	for name, device := range instance.Devices {
		if device["type"] == "gpu" {
			gpuDevices = append(gpuDevices, gpuAttached{
				Name: name,
				Type: device["gputype"],
				Id:   device["id"],
				Pci:  device["pci"],
			})
		}
	}

	json.NewEncoder(w).Encode(APIResponse{Success: true, Data: gpuDevices})
}

func (s *Server) AddGPUDevice(w http.ResponseWriter, r *http.Request) {
	returnCors(w, r)

	if r.Method != "POST" {
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var req gpuAttached

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "Invalid request"})
		return
	}

	if s.LxdClient == nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "LXD not connected"})
		return
	}

	deviceConfig := map[string]string{
		"type": "gpu",
	}

	if req.Type != "" {
		deviceConfig["gputype"] = req.Type
	} else {
		deviceConfig["gputype"] = "physical"
	}

	if req.Id != "" {
		if req.Id != "all" {
			deviceConfig["id"] = req.Id
		}
	}

	if req.Pci != "" {
		deviceConfig["pci"] = req.Pci
	}

	instance, etag, err := s.LxdClient.GetInstance(req.InstanceName)
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	if instance.Devices == nil {
		instance.Devices = make(map[string]map[string]string)
	}

	instance.Devices[req.Name] = deviceConfig

	op, err := s.LxdClient.UpdateInstance(req.InstanceName, instance.Writable(), etag)
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	err = op.Wait()
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(APIResponse{Success: true, Data: "GPU device added"})
}

func (s *Server) RemoveGPUDevice(w http.ResponseWriter, r *http.Request) {
	returnCors(w, r)

	if r.Method != "DELETE" {
		return
	}

	w.Header().Set("Content-Type", "application/json")
	var req gpuAttached

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "Invalid request"})
		return
	}

	if s.LxdClient == nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: "LXD not connected"})
		return
	}

	instance, etag, err := s.LxdClient.GetInstance(req.InstanceName)
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	if instance.Devices != nil {
		delete(instance.Devices, req.Name)
	}

	op, err := s.LxdClient.UpdateInstance(req.InstanceName, instance.Writable(), etag)
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	err = op.Wait()
	if err != nil {
		json.NewEncoder(w).Encode(APIResponse{Success: false, Error: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(APIResponse{Success: true, Data: "GPU device removed"})
}
