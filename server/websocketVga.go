package server

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"sync"

	lxd "github.com/canonical/lxd/client"
	"github.com/canonical/lxd/shared/api"
	"github.com/gorilla/websocket"
)

type NetConnPipe struct {
	conn net.Conn
}

func (n *NetConnPipe) Read(p []byte) (int, error) {
	return n.conn.Read(p)
}

func (n *NetConnPipe) Write(p []byte) (int, error) {
	return n.conn.Write(p)
}

func (n *NetConnPipe) Close() error {
	return n.conn.Close()
}

func (s *Server) handleSPICEProxy(instanceName string, clientConn net.Conn) {
	defer clientConn.Close()

	if s.LxdClient == nil {
		log.Printf("LXD client not connected")
		return
	}

	log.Printf("SPICE proxy connection for: %s", instanceName)

	consoleReq := api.InstanceConsolePost{
		Type:   "vga",
		Width:  1920,
		Height: 1080,
	}

	connPipe := &NetConnPipe{conn: clientConn}

	args := &lxd.InstanceConsoleArgs{
		Terminal: connPipe,
		Control: func(conn *websocket.Conn) {
			for {
				_, _, err := conn.ReadMessage()
				if err != nil {
					return
				}
			}
		},
		ConsoleDisconnect: make(chan bool),
	}

	log.Printf("Starting SPICE console session for %s", instanceName)

	op, err := s.LxdClient.ConsoleInstance(instanceName, consoleReq, args)
	if err != nil {
		log.Printf("Console error: %v", err)
		return
	}

	err = op.Wait()
	if err != nil {
		log.Printf("Console operation error: %v", err)
	}

	log.Printf("SPICE proxy closed for %s", instanceName)
}

func (s *Server) HandleVGADownload(w http.ResponseWriter, r *http.Request) {
	instanceName := r.PathValue("name")

	if s.LxdClient == nil {
		http.Error(w, "LXD not connected", http.StatusServiceUnavailable)
		return
	}

	instance, _, err := s.LxdClient.GetInstance(instanceName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get instance: %v", err), http.StatusInternalServerError)
		return
	}

	if instance.Status != "Running" {
		http.Error(w, "Instance must be running", http.StatusBadRequest)
		return
	}

	host := r.Host
	if host == "" {
		host = "localhost"
	}

	vvContent := fmt.Sprintf(`[virt-viewer]
type=spice
host=%s
port=5900
title=%s - LXD-Marina
fullscreen=0
`, host, instanceName)

	s.currentVm = instanceName

	w.Header().Set("Content-Type", "application/x-virt-viewer")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%s.vv", instanceName))
	w.Write([]byte(vvContent))

	//log.Printf("Generated .vv file for %s", instanceName)
}

func (s *Server) StartSPICEProxy(wg *sync.WaitGroup) (net.Listener, error) {
	listener, err := net.Listen("tcp", ":5900")
	if err != nil {
		log.Printf("Failed to start SPICE proxy: %v", err)
		return nil, err
	}

	log.Println("SPICE proxy listening on :5900")

	wg.Add(1)
	go func() {
		defer wg.Done()
		defer listener.Close()
		for {
			conn, err := listener.Accept()
			if err != nil {
				log.Printf("SPICE accept error: %v", err)
				return
			}

			go s.handleSPICEProxy(s.currentVm, conn)
		}
	}()

	return listener, nil
}
