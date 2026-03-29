package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client wraps the Ollama HTTP API for chat completions.
type Client struct {
	baseURL    string
	model      string
	httpClient *http.Client
}

// NewClient creates a new Ollama API client.
// If httpClient is nil, a default client with a 120-second timeout is used.
func NewClient(baseURL, model string, httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 120 * time.Second}
	}
	return &Client{
		baseURL:    baseURL,
		model:      model,
		httpClient: httpClient,
	}
}

// chatMessage represents a single message in the Ollama chat API.
type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// chatRequest is the request body for the Ollama chat API.
type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
	Stream   bool          `json:"stream"`
	Format   string        `json:"format,omitempty"`
	Think    bool          `json:"think,omitempty"`
}

// chatResponse is the response body from the Ollama chat API.
type chatResponse struct {
	Message chatMessage `json:"message"`
}

// Chat sends a system prompt and user prompt to the Ollama chat API and
// returns the assistant's response content as a string.
func (c *Client) Chat(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	reqBody := chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Stream: false,
		Format: "json",
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("ollama: failed to marshal request body: %w", err)
	}

	url := c.baseURL + "/api/chat"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("ollama: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("ollama: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("ollama: failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ollama: unexpected status %d: %s", resp.StatusCode, string(respBytes))
	}

	var chatResp chatResponse
	if err := json.Unmarshal(respBytes, &chatResp); err != nil {
		return "", fmt.Errorf("ollama: failed to parse response JSON: %w", err)
	}

	return chatResp.Message.Content, nil
}

// streamChunk is a single chunk from the Ollama streaming API.
type streamChunk struct {
	Message streamMessage `json:"message"`
	Done    bool          `json:"done"`
}

// streamMessage extends chatMessage with the thinking field from reasoning models.
type streamMessage struct {
	Role     string `json:"role"`
	Content  string `json:"content"`
	Thinking string `json:"thinking"`
}

// StreamCallbacks holds callbacks for streaming chat responses.
type StreamCallbacks struct {
	OnThinking func(token string) // called for reasoning tokens (from thinking models)
	OnToken    func(token string) // called for content tokens (the JSON output)
}

// ChatStream sends a chat request with streaming and thinking enabled.
// Thinking models (qwen3, deepseek-r1, etc.) emit reasoning in the "thinking" field
// and content in the "content" field. Non-thinking models only emit content.
// format:"json" is NOT used here because it suppresses thinking output.
// Returns the final content (which should be JSON per the prompt instructions).
func (c *Client) ChatStream(ctx context.Context, systemPrompt, userPrompt string, cb StreamCallbacks) (string, error) {
	reqBody := chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Stream: true,
		Think:  true,
		// No Format:"json" — it suppresses thinking output entirely.
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("ollama: failed to marshal request body: %w", err)
	}

	url := c.baseURL + "/api/chat"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("ollama: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Use a client without timeout for streaming — context handles cancellation.
	streamClient := &http.Client{}
	resp, err := streamClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("ollama: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("ollama: unexpected status %d: %s", resp.StatusCode, string(respBytes))
	}

	var content strings.Builder
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var chunk streamChunk
		if err := json.Unmarshal(line, &chunk); err != nil {
			continue
		}

		// Ollama sends thinking tokens in the "thinking" field
		if chunk.Message.Thinking != "" && cb.OnThinking != nil {
			cb.OnThinking(chunk.Message.Thinking)
		}

		// Content tokens are the actual response (JSON)
		if chunk.Message.Content != "" {
			content.WriteString(chunk.Message.Content)
			if cb.OnToken != nil {
				cb.OnToken(chunk.Message.Content)
			}
		}

		if chunk.Done {
			break
		}
	}

	if err := scanner.Err(); err != nil {
		return "", fmt.Errorf("ollama: stream read error: %w", err)
	}

	return content.String(), nil
}
