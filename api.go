package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	lxd "github.com/canonical/lxd/client"
)

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

func initApi(wg *sync.WaitGroup, stop context.CancelFunc, ctx context.Context) (*http.Server, net.Listener) {
	conn, err := lxd.ConnectLXDUnix("", nil)
	if err != nil {
		log.Printf("Warning: Could not connect to LXD: %v\n", err)
		log.Println("Some features will be limited")
	}

	server := &Server{lxdClient: conn}
	mux := http.NewServeMux()
	apiSRV := &http.Server{
		ReadTimeout:  20 * time.Second,
		WriteTimeout: 60 * time.Second, // If you ever get a timeout, this is the place to check :p
		IdleTimeout:  60 * time.Second,
		Addr:         ":8080",
		Handler:      mux,
	}

	// API routes
	mux.HandleFunc("GET /favicon.ico", faviconHandler)

	mux.HandleFunc("GET /api/instances", server.listInstances)
	mux.HandleFunc("POST /api/instances", server.createInstance)
	mux.HandleFunc("PUT /api/instances", server.controlInstance)
	mux.HandleFunc("DELETE /api/instances", server.deleteInstance)
	mux.HandleFunc("OPTIONS /api/instances", returnCors)

	mux.HandleFunc("/api/console/{name}", server.handleConsoleWebSocket)
	mux.HandleFunc("/api/vga/download/{name}", server.handleVGADownload)

	mux.Handle("/console/", http.StripPrefix("/console", http.FileServer(http.Dir("./static/console"))))
	mux.Handle("/", http.FileServer(http.Dir("./static/home")))
	//------------

	spiceProxy, err := server.startSPICEProxy(wg) //Our spice proxy, for now ill leave it here but later well have to bind to multiple ports
	if err != nil {
		log.Printf("Error starting the spice proxy: %v", err)
	}

	go func() {
		defer wg.Done()
		log.Println("Server starting on http://localhost:8080")
		if err := apiSRV.ListenAndServe(); err != http.ErrServerClosed {
			log.Printf("Error starting the api server: %v", err)
			stop()
		}
	}()

	return apiSRV, spiceProxy
}

func faviconHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/home/favicon.png")
}

func returnCors(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Write(nil)
}
