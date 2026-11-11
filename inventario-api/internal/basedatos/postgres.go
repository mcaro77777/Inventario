package basedatos

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"inventario-api/internal/configuracion"
)

var tablasRequeridas = []string{"categorias", "clientes", "departamentos", "ingresos_stock", "perfiles", "perfiles_permisos", "permisos", "productos", "proveedores", "unidad_medida"}

func Abrir(ctx context.Context, cfg configuracion.Configuracion) (*sql.DB, error) {
	db, err := sql.Open("pgx", cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("abrir PostgreSQL: %w", err)
	}
	db.SetMaxOpenConns(cfg.MaxConexionesAbiertas)
	db.SetMaxIdleConns(cfg.MaxConexionesInactivas)
	db.SetConnMaxLifetime(cfg.VidaMaximaConexion)
	pingCtx, cancelar := context.WithTimeout(ctx, 8*time.Second)
	defer cancelar()
	if err := db.PingContext(pingCtx); err != nil {
		db.Close()
		return nil, fmt.Errorf("conectar con PostgreSQL: %w", err)
	}
	if err := VerificarEsquema(pingCtx, db); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

func VerificarEsquema(ctx context.Context, db *sql.DB) error {
	rows, err := db.QueryContext(ctx, `SELECT table_name FROM information_schema.tables WHERE table_schema='inv' AND table_type='BASE TABLE'`)
	if err != nil {
		return fmt.Errorf("comprobar esquema inv: %w", err)
	}
	defer rows.Close()
	existentes := map[string]bool{}
	for rows.Next() {
		var nombre string
		if err := rows.Scan(&nombre); err != nil {
			return err
		}
		existentes[nombre] = true
	}
	if err := rows.Err(); err != nil {
		return err
	}
	var faltantes []string
	for _, nombre := range tablasRequeridas {
		if !existentes[nombre] {
			faltantes = append(faltantes, nombre)
		}
	}
	if len(faltantes) > 0 {
		sort.Strings(faltantes)
		return fmt.Errorf("esquema inv incompleto; faltan tablas: %s", strings.Join(faltantes, ", "))
	}
	return nil
}
