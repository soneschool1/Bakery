package sse

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"sync"

	"github.com/gin-gonic/gin"
)

type Event struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type Hub struct {
	clients map[chan Event]bool
	mu      sync.Mutex
}

var GlobalHub = &Hub{
	clients: make(map[chan Event]bool),
}

func (h *Hub) Broadcast(eventType string, payload interface{}) {
	h.mu.Lock()
	defer h.mu.Unlock()

	evt := Event{Type: eventType, Payload: payload}
	for ch := range h.clients {
		select {
		case ch <- evt:
		default:
			// channel full or dropped
		}
	}
}

func (h *Hub) AddClient(ch chan Event) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[ch] = true
	log.Printf("SSE client connected. Active clients: %d", len(h.clients))
}

func (h *Hub) RemoveClient(ch chan Event) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, ch)
	close(ch)
	log.Printf("SSE client disconnected. Active clients: %d", len(h.clients))
}

func SSEHandler(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	ch := make(chan Event, 10)
	GlobalHub.AddClient(ch)

	defer func() {
		GlobalHub.RemoveClient(ch)
	}()

	// Send initial ping
	fmt.Fprintf(c.Writer, "event: connected\ndata: {\"status\":\"ok\"}\n\n")
	c.Writer.Flush()

	c.Stream(func(w io.Writer) bool {
		select {
		case evt, ok := <-ch:
			if !ok {
				return false
			}
			bytes, err := json.Marshal(evt)
			if err != nil {
				return true
			}
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", evt.Type, string(bytes))
			return true
		case <-c.Request.Context().Done():
			return false
		}
	})
}
