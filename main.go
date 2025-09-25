package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

func main() {
	fmt.Println("WELCOME TO LXD-Marina -made with hate and spite by mengdotzip")

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	var wg sync.WaitGroup

	wg.Add(1)
	apiServer := initApi(&wg, stop)
	cleanShutdown(ctx, &wg, apiServer)

}

func cleanShutdown(ctx context.Context, wg *sync.WaitGroup, apiServer *http.Server) {
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-ctx.Done():
		apiServer.Close()
		shutdownTimeout := 5 * time.Second

		select {
		case <-done:
			log.Println("All goroutines finished CLEAN")
		case <-time.After(shutdownTimeout):
			log.Println("Shutdown timeout reached, forcing exit")
		}
	case <-done:
		log.Println("All goroutines finished CLEAN")
	}
}
