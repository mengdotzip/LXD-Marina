package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"

	lxd "github.com/canonical/lxd/client"
	"github.com/canonical/lxd/shared/api"
	"github.com/gorilla/websocket"
)

type WebSocketPipe struct {
	conn   *websocket.Conn
	mu     sync.Mutex
	closed bool
}

func (w *WebSocketPipe) Read(p []byte) (n int, err error) {
	_, data, err := w.conn.ReadMessage()
	if err != nil {
		return 0, err
	}
	copy(p, data)
	return len(data), nil
}

func (w *WebSocketPipe) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.closed {
		return 0, io.ErrClosedPipe
	}

	err = w.conn.WriteMessage(websocket.TextMessage, p)
	if err != nil {
		return 0, err
	}
	return len(p), nil
}

func (w *WebSocketPipe) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if !w.closed {
		w.closed = true
		w.conn.Close()
	}
	return nil
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (s *Server) handleConsoleWebSocket(w http.ResponseWriter, r *http.Request) {
	instanceName := r.PathValue("name")

	log.Printf("Console WebSocket connection request for: %s", instanceName) // switch to verbose logging later

	wsConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err) // switch to verbose logging later
		return
	}
	defer wsConn.Close()

	if s.lxdClient == nil {
		wsConn.WriteMessage(websocket.TextMessage, []byte("LXD not connected\r\n"))
		return
	}

	wsPipe := &WebSocketPipe{conn: wsConn}
	consoleReq := api.InstanceConsolePost{
		Type:   "console",
		Width:  140,
		Height: 30,
	}

	args := &lxd.InstanceConsoleArgs{
		Terminal: wsPipe,
		Control: func(conn *websocket.Conn) {
			for {
				_, msg, err := conn.ReadMessage()
				if err != nil {
					return
				}
				log.Printf("Control message: %s", string(msg))
			}
		},
		ConsoleDisconnect: make(chan bool),
	}
	log.Printf("Starting console session for %s", instanceName) // switch to verbose logging later

	op, err := s.lxdClient.ConsoleInstance(instanceName, consoleReq, args)
	if err != nil {
		log.Printf("Console error: %v", err)
		wsConn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Console error: %v\r\n", err)))
		return
	}

	wsPipe.Write([]byte("\r\n=== Connected to console ===\r\n"))
	wsConn.SetCloseHandler(func(code int, text string) error {
		log.Printf("Browser WebSocket closing (code: %d, text: %s)", code, text) // switch to verbose logging later
		close(args.ConsoleDisconnect)
		return nil
	})

	err = op.Wait()
	if err != nil {
		log.Printf("Console operation error: %v", err)
	}
	log.Printf("Console session ended for %s", instanceName)
}
