package configuracion

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Configuracion struct {
	Entorno, Puerto, URLBase, DSN                 string
	JWTSecret, JWTIssuer, JWTAudience             string
	DirectorioCliente, DirectorioUploads          string
	DuracionJWT, VidaMaximaConexion               time.Duration
	MaxConexionesAbiertas, MaxConexionesInactivas int
}

func Cargar() (Configuracion, error) {
	c := Configuracion{
		Entorno: valor("APP_ENV", "development"), Puerto: valor("PORT", "8080"),
		URLBase: valor("APP_BASE_URL", "http://localhost:8080"), DSN: strings.TrimSpace(os.Getenv("DATABASE_URL")),
		JWTSecret: os.Getenv("JWT_SECRET"), JWTIssuer: valor("JWT_ISSUER", "inventario-api"),
		JWTAudience: valor("JWT_AUDIENCE", "inventario-web"), DirectorioCliente: valor("CLIENT_APP_DIR", "ClientApp"),
		DirectorioUploads: valor("UPLOAD_DIR", ".dev-uploads"),
	}
	var err error
	c.MaxConexionesAbiertas, err = entero("DB_MAX_OPEN_CONNS", 20)
	if err != nil {
		return c, err
	}
	c.MaxConexionesInactivas, err = entero("DB_MAX_IDLE_CONNS", 10)
	if err != nil {
		return c, err
	}
	minutos, err := entero("DB_CONN_MAX_LIFETIME_MINUTES", 30)
	if err != nil {
		return c, err
	}
	c.VidaMaximaConexion = time.Duration(minutos) * time.Minute
	horas, err := entero("JWT_HOURS", 8)
	if err != nil {
		return c, err
	}
	c.DuracionJWT = time.Duration(horas) * time.Hour
	if c.DSN == "" {
		return c, errors.New("DATABASE_URL es obligatoria")
	}
	if len(c.JWTSecret) < 32 {
		return c, errors.New("JWT_SECRET debe tener al menos 32 caracteres")
	}
	u, err := url.ParseRequestURI(c.URLBase)
	if err != nil || u.Host == "" {
		return c, errors.New("APP_BASE_URL debe ser una URL valida")
	}
	return c, nil
}

func (c Configuracion) Produccion() bool { return strings.EqualFold(c.Entorno, "production") }
func valor(nombre, defecto string) string {
	if v := strings.TrimSpace(os.Getenv(nombre)); v != "" {
		return v
	}
	return defecto
}
func entero(nombre string, defecto int) (int, error) {
	n, err := strconv.Atoi(valor(nombre, strconv.Itoa(defecto)))
	if err != nil || n < 1 {
		return 0, fmt.Errorf("%s debe ser un entero positivo", nombre)
	}
	return n, nil
}
