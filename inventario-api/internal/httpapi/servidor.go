package httpapi

import (
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"inventario-api/internal/configuracion"
	"inventario-api/internal/version"
)

type Servidor struct {
	cfg    configuracion.Configuracion
	db     *sql.DB
	logger *slog.Logger
}

func NuevoServidor(cfg configuracion.Configuracion, db *sql.DB, logger *slog.Logger) http.Handler {
	s := &Servidor{cfg: cfg, db: db, logger: logger}
	mux := http.NewServeMux()
	auth := func(h http.HandlerFunc) http.Handler { return s.requerirSesion(h) }
	mux.HandleFunc("GET /api/health", s.salud)
	mux.HandleFunc("GET /api/version", s.version)
	mux.HandleFunc("POST /api/auth/login", s.iniciarSesion)
	for _, base := range []string{"Categorias", "Departamentos", "Perfiles"} {
		var h http.HandlerFunc
		switch base {
		case "Categorias":
			h = s.categorias
		case "Departamentos":
			h = s.departamentos
		default:
			h = s.perfiles
		}
		mux.Handle("GET /api/"+base, auth(h))
		mux.Handle("POST /api/"+base, auth(h))
		mux.Handle("GET /api/"+base+"/{id}", auth(h))
		mux.Handle("PUT /api/"+base+"/{id}", auth(h))
		mux.Handle("DELETE /api/"+base+"/{id}", auth(h))
	}
	for _, x := range []struct {
		base string
		h    http.HandlerFunc
	}{{"UnidadMedida", s.unidades}, {"Proveedores", s.proveedores}, {"Productos", s.productos}, {"Clientes", s.clientes}} {
		mux.Handle("GET /api/"+x.base, auth(x.h))
		mux.Handle("POST /api/"+x.base, auth(x.h))
		mux.Handle("GET /api/"+x.base+"/{id}", auth(x.h))
		mux.Handle("PUT /api/"+x.base+"/{id}", auth(x.h))
		mux.Handle("DELETE /api/"+x.base+"/{id}", auth(x.h))
	}
	mux.Handle("GET /api/Clientes/{id}/{tipo}", auth(http.HandlerFunc(s.permisosCliente)))
	mux.Handle("GET /api/Perfiles/{id}/permisos", auth(http.HandlerFunc(s.permisosPerfil)))
	mux.Handle("POST /api/Perfiles/{id}/permisos", auth(http.HandlerFunc(s.permisosPerfil)))
	mux.Handle("GET /api/IngresosStock", auth(http.HandlerFunc(s.listarStock)))
	mux.Handle("POST /api/IngresosStock", auth(http.HandlerFunc(s.crearIngreso)))
	mux.Handle("GET /api/IngresosStock/historial/{productoId}", auth(http.HandlerFunc(s.historialStock)))
	mux.Handle("PUT /api/IngresosStock/{id}/cantidad", auth(http.HandlerFunc(s.cantidadMovimiento)))
	mux.Handle("PUT /api/IngresosStock/{id}", auth(http.HandlerFunc(s.movimiento)))
	mux.Handle("DELETE /api/IngresosStock/{id}", auth(http.HandlerFunc(s.movimiento)))
	mux.Handle("GET /api/IngresosStock/solicitudes/pendientes", auth(http.HandlerFunc(s.solicitudes)))
	mux.Handle("GET /api/IngresosStock/solicitudes/{clienteId}", auth(http.HandlerFunc(s.solicitudes)))
	mux.Handle("PUT /api/IngresosStock/solicitudes/{id}/estado", auth(http.HandlerFunc(s.estadoSolicitud)))
	mux.Handle("DELETE /api/IngresosStock/solicitudes/{id}", auth(http.HandlerFunc(s.eliminarSolicitud)))
	mux.HandleFunc("GET /api/IngresosStock/solicitudes/{id}/certificado", s.certificadoSolicitud)
	mux.Handle("POST /api/RetirosStock", auth(http.HandlerFunc(s.crearRetiro)))
	mux.Handle("GET /api/RetirosStock/solicitudes/pendientes", auth(http.HandlerFunc(s.solicitudes)))
	mux.Handle("GET /api/RetirosStock/solicitudes/{clienteId}", auth(http.HandlerFunc(s.solicitudes)))
	for _, x := range []struct {
		ruta string
		h    http.HandlerFunc
	}{{"kpis", s.dashboardKPIs}, {"breakdown/stock-categoria", s.dashboardStockCategoria}, {"series/movimientos-7d", s.dashboardMovimientos}, {"series/valor-6m", s.dashboardValor}, {"consumo/departamento-30d", s.dashboardConsumo}, {"tabla/bajo-minimo", s.dashboardBajoMinimo}, {"inventory/detail", s.dashboardDetalle}, {"tabla-resumen2", s.tablaResumen}} {
		mux.Handle("GET /api/Dashboard/"+x.ruta, auth(x.h))
	}
	mux.Handle("POST /api/Archivos/upload", auth(http.HandlerFunc(s.subirArchivo)))
	mux.HandleFunc("GET /api/Archivos/{ruta...}", s.archivo)
	mux.Handle("DELETE /api/Archivos/{ruta...}", auth(http.HandlerFunc(s.archivo)))
	mux.Handle("GET /api/Regiones", auth(http.HandlerFunc(s.regiones)))
	mux.Handle("GET /api/Comunas/{regionId}", auth(http.HandlerFunc(s.comunas)))
	mux.HandleFunc("/api/", func(w http.ResponseWriter, _ *http.Request) { responderProblema(w, 404, "Ruta API no encontrada", "") })
	mux.Handle("/", manejadorSPA(cfg.DirectorioCliente))
	return middlewareBase(logger, cfg.URLBase, !cfg.Produccion(), mux)
}

func (s *Servidor) salud(w http.ResponseWriter, r *http.Request) {
	if err := s.db.PingContext(r.Context()); err != nil {
		responderProblema(w, 503, "Base de datos no disponible", "")
		return
	}
	responderJSON(w, 200, map[string]any{"ok": true, "database": "ok", "version": version.Version, "commit": version.Commit})
}
func (s *Servidor) version(w http.ResponseWriter, _ *http.Request) {
	responderJSON(w, 200, map[string]string{"version": version.Version, "commit": version.Commit})
}
func (s *Servidor) regiones(w http.ResponseWriter, _ *http.Request) {
	responderJSON(w, 200, []map[string]any{{"id": 1, "nombre": "metropolitana"}, {"id": 2, "nombre": "valparaiso"}})
}
func (s *Servidor) comunas(w http.ResponseWriter, r *http.Request) {
	datos := map[string][]map[string]any{"1": {{"id": 1, "nombre": "Santiago", "regionId": 1}, {"id": 2, "nombre": "Providencia", "regionId": 1}, {"id": 3, "nombre": "Maipu", "regionId": 1}}, "2": {{"id": 4, "nombre": "Valparaiso", "regionId": 2}, {"id": 5, "nombre": "Vina del Mar", "regionId": 2}, {"id": 6, "nombre": "Quilpue", "regionId": 2}}}
	v, ok := datos[r.PathValue("regionId")]
	if !ok {
		responderProblema(w, 404, "Comunas no encontradas", "")
		return
	}
	responderJSON(w, 200, v)
}
func manejadorSPA(dir string) http.Handler {
	indice := filepath.Join(dir, "index.html")
	archivos := http.FileServer(http.Dir(dir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := os.Stat(indice); err != nil {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(503)
			_, _ = w.Write([]byte("<!doctype html><html><body><h1>Inventario API activa</h1><p>Falta compilar inventario-web en ClientApp.</p></body></html>"))
			return
		}
		rel := strings.TrimPrefix(filepath.ToSlash(filepath.Clean("/"+r.URL.Path)), "/")
		ruta := filepath.Join(dir, filepath.FromSlash(rel))
		if info, err := os.Stat(ruta); err == nil && !info.IsDir() {
			if strings.Contains(filepath.Base(ruta), ".") && !strings.HasSuffix(ruta, "index.html") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			archivos.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, indice)
	})
}
