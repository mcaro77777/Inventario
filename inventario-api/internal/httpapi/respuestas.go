package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

type problema struct {
	Type   string `json:"type,omitempty"`
	Title  string `json:"title"`
	Status int    `json:"status"`
	Detail string `json:"detail,omitempty"`
}

func responderJSON(w http.ResponseWriter, estado int, dato any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(estado)
	if dato != nil {
		_ = json.NewEncoder(w).Encode(dato)
	}
}

func responderProblema(w http.ResponseWriter, estado int, titulo, detalle string) {
	responderJSON(w, estado, problema{Title: titulo, Status: estado, Detail: detalle})
}
func decodificarJSON(w http.ResponseWriter, r *http.Request, destino any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	d := json.NewDecoder(r.Body)
	if err := d.Decode(destino); err != nil {
		return err
	}
	if err := d.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("el cuerpo debe contener un unico objeto JSON")
	}
	return nil
}
func bearer(r *http.Request) string {
	partes := strings.SplitN(strings.TrimSpace(r.Header.Get("Authorization")), " ", 2)
	if len(partes) == 2 && strings.EqualFold(partes[0], "Bearer") {
		return partes[1]
	}
	return ""
}
