package main

import (
	"context"
	"errors"
	"fmt"
	"inventario-api/internal/basedatos"
	"inventario-api/internal/configuracion"
	"inventario-api/internal/httpapi"
	"inventario-api/internal/version"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	if err := ejecutar(); err != nil {
		fmt.Fprintln(os.Stderr, "inventario-api:", err)
		os.Exit(1)
	}
}
func ejecutar() error {
	comando := "serve"
	if len(os.Args) > 1 {
		comando = os.Args[1]
	}
	if comando == "version" {
		fmt.Printf("inventario-api %s (%s)\n", version.Version, version.Commit)
		return nil
	}
	if comando != "serve" && comando != "check-db" {
		return fmt.Errorf("comando desconocido %q; use serve, check-db o version", comando)
	}
	cfg, err := configuracion.Cargar()
	if err != nil {
		return err
	}
	logger := nuevoLogger(cfg.Produccion())
	db, err := basedatos.Abrir(context.Background(), cfg)
	if err != nil {
		return err
	}
	defer db.Close()
	if comando == "check-db" {
		fmt.Println("Base inventario accesible y esquema inv completo.")
		return nil
	}
	srv := &http.Server{Addr: ":" + cfg.Puerto, Handler: httpapi.NuevoServidor(cfg, db, logger), ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 60 * time.Second, IdleTimeout: 120 * time.Second, MaxHeaderBytes: 1 << 20}
	senales, detener := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer detener()
	ch := make(chan error, 1)
	go func() {
		logger.Info("servidor iniciado", "puerto", cfg.Puerto, "entorno", cfg.Entorno, "version", version.Version)
		ch <- srv.ListenAndServe()
	}()
	select {
	case err := <-ch:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-senales.Done():
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		return srv.Shutdown(ctx)
	}
	return nil
}
func nuevoLogger(prod bool) *slog.Logger {
	op := &slog.HandlerOptions{Level: slog.LevelInfo}
	if prod {
		return slog.New(slog.NewJSONHandler(os.Stdout, op))
	}
	return slog.New(slog.NewTextHandler(os.Stdout, op))
}
