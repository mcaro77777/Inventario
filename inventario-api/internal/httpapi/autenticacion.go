package httpapi

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type loginEntrada struct {
	Usuario  string `json:"usuario"`
	Password string `json:"password"`
}

func (s *Servidor) iniciarSesion(w http.ResponseWriter, r *http.Request) {
	var entrada loginEntrada
	if err := decodificarJSON(w, r, &entrada); err != nil {
		responderProblema(w, 400, "Solicitud invalida", err.Error())
		return
	}
	var id int
	var usuario, hash string
	err := s.db.QueryRowContext(r.Context(), `SELECT id_cliente, usuario, clave FROM inv.clientes WHERE lower(usuario)=lower($1)`, strings.TrimSpace(entrada.Usuario)).Scan(&id, &usuario, &hash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(entrada.Password)) != nil {
		responderProblema(w, 401, "Credenciales invalidas", "Usuario o contrasena incorrectos.")
		return
	}
	responderJSON(w, 200, map[string]any{"token": s.generarJWT(id, usuario), "id_usuario": id})
}

func (s *Servidor) generarJWT(id int, nombre string) string {
	enc := func(v any) string { b, _ := json.Marshal(v); return base64.RawURLEncoding.EncodeToString(b) }
	ahora := time.Now()
	cabecera := enc(map[string]string{"alg": "HS256", "typ": "JWT"})
	payload := enc(map[string]any{"sub": strconv.Itoa(id), "name": nombre, "role": "cliente", "iss": s.cfg.JWTIssuer, "aud": s.cfg.JWTAudience, "iat": ahora.Unix(), "exp": ahora.Add(s.cfg.DuracionJWT).Unix()})
	entrada := cabecera + "." + payload
	mac := hmac.New(sha256.New, []byte(s.cfg.JWTSecret))
	_, _ = mac.Write([]byte(entrada))
	return entrada + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
