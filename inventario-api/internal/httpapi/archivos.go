package httpapi

import (
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

var tipoSeguro = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,40}$`)
var extensionesPermitidas = map[string]bool{".pdf": true, ".jpg": true, ".jpeg": true, ".png": true, ".webp": true}

func (s *Servidor) subirArchivo(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 12<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		responderProblema(w, 400, "Archivo invalido", "El archivo supera 10 MiB o el formulario no es valido.")
		return
	}
	archivo, cabecera, err := r.FormFile("file")
	if err != nil {
		responderProblema(w, 400, "Archivo requerido", "")
		return
	}
	defer archivo.Close()
	tipo := strings.TrimSpace(r.URL.Query().Get("tipo"))
	if !tipoSeguro.MatchString(tipo) {
		responderProblema(w, 400, "Tipo invalido", "")
		return
	}
	ext := strings.ToLower(filepath.Ext(cabecera.Filename))
	if !extensionesPermitidas[ext] {
		responderProblema(w, 400, "Extension no permitida", "Use PDF, JPG, PNG o WEBP.")
		return
	}
	anio := time.Now().Format("2006")
	carpeta := filepath.Join(s.cfg.DirectorioUploads, anio, tipo)
	if err := os.MkdirAll(carpeta, 0750); err != nil {
		s.errorArchivo(w, err)
		return
	}
	nombre := fmt.Sprintf("%s_%s%s", tipo, time.Now().UTC().Format("20060102_150405.000000000"), ext)
	ruta := filepath.Join(carpeta, nombre)
	salida, err := os.OpenFile(ruta, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0640)
	if err != nil {
		s.errorArchivo(w, err)
		return
	}
	n, err := io.Copy(salida, archivo)
	cerrarErr := salida.Close()
	if err != nil || cerrarErr != nil {
		_ = os.Remove(ruta)
		s.errorArchivo(w, fmt.Errorf("guardar archivo: %v %v", err, cerrarErr))
		return
	}
	relativa := filepath.ToSlash(filepath.Join(anio, tipo, nombre))
	responderJSON(w, 201, map[string]any{"fileName": relativa, "originalName": filepath.Base(cabecera.Filename), "size": n, "tipo": tipo})
}

func (s *Servidor) archivo(w http.ResponseWriter, r *http.Request) {
	relativa := strings.TrimPrefix(r.PathValue("ruta"), "/")
	limpia := filepath.Clean(filepath.FromSlash(relativa))
	if limpia == "." || filepath.IsAbs(limpia) || strings.HasPrefix(limpia, "..") || strings.Contains(limpia, ".."+string(filepath.Separator)) {
		responderProblema(w, 400, "Ruta invalida", "")
		return
	}
	base, err := filepath.Abs(s.cfg.DirectorioUploads)
	if err != nil {
		s.errorArchivo(w, err)
		return
	}
	ruta, err := filepath.Abs(filepath.Join(base, limpia))
	if err != nil || !strings.HasPrefix(ruta, base+string(filepath.Separator)) {
		responderProblema(w, 400, "Ruta invalida", "")
		return
	}
	if r.Method == http.MethodDelete {
		if err := os.Remove(ruta); os.IsNotExist(err) {
			responderProblema(w, 404, "Archivo no encontrado", "")
			return
		} else if err != nil {
			s.errorArchivo(w, err)
			return
		}
		w.WriteHeader(204)
		return
	}
	f, err := os.Open(ruta)
	if os.IsNotExist(err) {
		responderProblema(w, 404, "Archivo no encontrado", "")
		return
	}
	if err != nil {
		s.errorArchivo(w, err)
		return
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		s.errorArchivo(w, err)
		return
	}
	if ct := mime.TypeByExtension(filepath.Ext(ruta)); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, filepath.Base(ruta)))
	http.ServeContent(w, r, filepath.Base(ruta), info.ModTime(), f)
}
func (s *Servidor) errorArchivo(w http.ResponseWriter, err error) {
	s.logger.Error("error de archivo", "error", err)
	responderProblema(w, 500, "Error de archivo", "No fue posible completar la operacion.")
}
