package main

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	lxd "github.com/canonical/lxd/client"
)

type ContainerInfo struct {
	Name   string `json:"name"`
	Status string `json:"status"`
	Type   string `json:"type"`
}

type CreateContainerRequest struct {
	Name  string `json:"name"`
	Image string `json:"image"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func initApi(wg *sync.WaitGroup, stop context.CancelFunc) *http.Server {
	conn, err := lxd.ConnectLXDUnix("", nil)
	if err != nil {
		log.Printf("Warning: Could not connect to LXD: %v\n", err)
		log.Println("Some features will be limited")
	}

	server := &Server{lxdClient: conn}
	mux := http.NewServeMux()
	apiSRV := &http.Server{
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second, //might have to change these two later(file upload,sse,...)
		IdleTimeout:  40 * time.Second,
		Addr:         ":8080",
		Handler:      mux,
	}

	// API routes
	mux.HandleFunc("GET /api/instances", server.listInstances)
	mux.HandleFunc("POST /api/instances", server.createInstance)
	mux.HandleFunc("OPTIONS /api/instances", returnCors)

	// Serve static files for now by api, should be with mazarin
	mux.Handle("/", http.FileServer(http.Dir("./static/")))

	go func() {
		defer wg.Done()
		log.Println("Server starting on http://localhost:8080")
		if err := apiSRV.ListenAndServe(); err != http.ErrServerClosed {
			log.Printf("Error starting the api server: %v", err)
			stop()
		}
	}()

	return apiSRV
}

func returnCors(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Write(nil)
}
