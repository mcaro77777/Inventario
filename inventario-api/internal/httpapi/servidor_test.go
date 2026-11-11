package httpapi

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"inventario-api/internal/configuracion"
)

func configPrueba() configuracion.Configuracion {
	return configuracion.Configuracion{
		Entorno: "development", URLBase: "http://localhost:8080",
		JWTSecret: "01234567890123456789012345678901", JWTIssuer: "inventario-api",
		JWTAudience: "inventario-web", DuracionJWT: time.Hour, DirectorioCliente: tDirVacio,
	}
}

var tDirVacio = "."

func TestJWTGeneradoEsValido(t *testing.T) {
	s := &Servidor{cfg: configPrueba()}
	token := s.generarJWT(17, "operador")
	u, valido := s.validarJWT(token)
	if !valido || u.ID != 17 || u.Nombre != "operador" {
		t.Fatalf("JWT invalido: %#v, %v", u, valido)
	}
	if _, valido := s.validarJWT(token + "alterado"); valido {
		t.Fatal("se acepto un JWT alterado")
	}
}

func TestVersionPublica(t *testing.T) {
	cfg := configPrueba()
	h := NuevoServidor(cfg, nil, slog.New(slog.NewTextHandler(&bytes.Buffer{}, nil)))
	r := httptest.NewRequest(http.MethodGet, "/api/version", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("estado=%d cuerpo=%s", w.Code, w.Body.String())
	}
	if !bytes.Contains(w.Body.Bytes(), []byte(`"version"`)) {
		t.Fatalf("respuesta inesperada: %s", w.Body.String())
	}
}

func TestPDFSimple(t *testing.T) {
	pdf := pdfSimple("Certificado de prueba")
	if !bytes.HasPrefix(pdf, []byte("%PDF-1.4")) || !bytes.Contains(pdf, []byte("%%EOF")) {
		t.Fatal("el documento generado no tiene una estructura PDF valida")
	}
}
