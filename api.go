package main

import (
	"context"
	"log"
	"lxd-marina/server"
	"net"
	"net/http"
	"os"
	"sync"
	"time"

	lxd "github.com/canonical/lxd/client"
)

func initApi(wg *sync.WaitGroup, stop context.CancelFunc, ctx context.Context) (*http.Server, net.Listener) {
	conn, err := lxd.ConnectLXDUnix("", nil)
	if err != nil {
		log.Printf("Warning: Could not connect to LXD: %v\n", err)
		log.Println("Some features will be limited")
	}

	server := &server.Server{LxdClient: conn}
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

	mux.HandleFunc("GET /api/instances", server.ListInstances)
	mux.HandleFunc("POST /api/instances", server.CreateInstance)
	mux.HandleFunc("PUT /api/instances", server.ControlInstance)
	mux.HandleFunc("DELETE /api/instances", server.DeleteInstance)
	mux.HandleFunc("OPTIONS /api/instances", returnCors)

	mux.HandleFunc("/api/console/{name}", server.HandleConsoleWebSocket)
	mux.HandleFunc("/api/vga/download/{name}", server.HandleVGADownload)

	mux.HandleFunc("GET /api/snapshots", server.ListSnapshots)
	mux.HandleFunc("POST /api/snapshots/create", server.CreateSnapshot)
	mux.HandleFunc("POST /api/snapshots/restore", server.RestoreSnapshot)
	mux.HandleFunc("DELETE /api/snapshots", server.DeleteSnapshot)

	mux.HandleFunc("GET /api/gpu", server.ListGPUDevices)
	mux.HandleFunc("POST /api/gpu", server.AddGPUDevice)
	mux.HandleFunc("DELETE /api/gpu", server.RemoveGPUDevice)
	mux.HandleFunc("GET /api/gpu/host", server.GetHostGPUs)

	mux.Handle("/console/", http.StripPrefix("/console", secureServeHandler("./static/console")))
	mux.Handle("/", secureServeHandler("./static/home"))
	//------------

	spiceProxy, err := server.StartSPICEProxy(wg) //Our spice proxy, for now ill leave it here but later well have to bind to multiple ports
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
	root, err := os.OpenRoot("static/home")
	if err != nil {
		http.Error(w, "Route does not exist", http.StatusBadRequest)
		return
	}
	defer root.Close()

	fsys := root.FS()
	http.ServeFileFS(w, r, fsys, "favicon.png")
}

func returnCors(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Write(nil)
}

func secureServeHandler(target string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		secureServe(w, r, target)
	}
}

func secureServe(w http.ResponseWriter, r *http.Request, target string) {
	root, err := os.OpenRoot(target)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	defer root.Close()

	fsys := root.FS()
	fileServer := http.FileServerFS(fsys)
	fileServer.ServeHTTP(w, r)
}
