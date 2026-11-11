package httpapi

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type claveContexto string

const claveUsuario claveContexto = "usuario"

type usuarioSesion struct {
	ID     int
	Nombre string
}

func (s *Servidor) requerirSesion(siguiente http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, ok := s.validarJWT(bearer(r))
		if !ok {
			responderProblema(w, http.StatusUnauthorized, "No autorizado", "La sesion no existe o expiro.")
			return
		}
		siguiente.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), claveUsuario, u)))
	})
}

func (s *Servidor) validarJWT(token string) (usuarioSesion, bool) {
	var vacio usuarioSesion
	partes := strings.Split(token, ".")
	if len(partes) != 3 {
		return vacio, false
	}
	entrada := partes[0] + "." + partes[1]
	firma, err := base64.RawURLEncoding.DecodeString(partes[2])
	if err != nil {
		return vacio, false
	}
	mac := hmac.New(sha256.New, []byte(s.cfg.JWTSecret))
	_, _ = mac.Write([]byte(entrada))
	if !hmac.Equal(firma, mac.Sum(nil)) {
		return vacio, false
	}
	payload, err := base64.RawURLEncoding.DecodeString(partes[1])
	if err != nil {
		return vacio, false
	}
	var p struct {
		Sub  string `json:"sub"`
		Name string `json:"name"`
		Exp  int64  `json:"exp"`
		Iss  string `json:"iss"`
		Aud  string `json:"aud"`
	}
	if json.Unmarshal(payload, &p) != nil || p.Exp < time.Now().Unix() || p.Iss != s.cfg.JWTIssuer || p.Aud != s.cfg.JWTAudience {
		return vacio, false
	}
	id, err := strconv.Atoi(p.Sub)
	if err != nil {
		return vacio, false
	}
	return usuarioSesion{ID: id, Nombre: p.Name}, true
}

func middlewareBase(logger *slog.Logger, urlBase string, desarrollo bool, siguiente http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		inicio := time.Now()
		origen := r.Header.Get("Origin")
		permitido := origenPermitido(origen, r.Host, urlBase, desarrollo)
		if origen != "" && permitido {
			w.Header().Set("Access-Control-Allow-Origin", origen)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "same-origin")
		if r.Method == http.MethodOptions {
			if !permitido {
				responderProblema(w, http.StatusForbidden, "Origen no permitido", "")
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if !permitido {
			responderProblema(w, http.StatusForbidden, "Origen no permitido", "")
			return
		}
		siguiente.ServeHTTP(w, r)
		logger.Info("solicitud HTTP", "metodo", r.Method, "ruta", r.URL.Path, "duracion", time.Since(inicio))
	})
}

func origenPermitido(origen, hostSolicitud, urlBase string, desarrollo bool) bool {
	if origen == "" || desarrollo || strings.EqualFold(strings.TrimRight(origen, "/"), strings.TrimRight(urlBase, "/")) {
		return true
	}
	u, err := url.ParseRequestURI(origen)
	return err == nil && u.Scheme != "" && u.Host != "" && strings.EqualFold(u.Host, hostSolicitud)
}
