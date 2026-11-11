package httpapi

import "testing"

func TestOrigenPermitido(t *testing.T) {
	const (
		host    = "web-inventario-new.efbckq.easypanel.host"
		urlBase = "https://inventario.ejemplo.cl"
	)
	casos := []struct {
		nombre     string
		origen     string
		desarrollo bool
		esperado   bool
	}{
		{"sin origen", "", false, true},
		{"URL base configurada", urlBase, false, true},
		{"mismo host de la solicitud", "https://" + host, false, true},
		{"mismo host sin distinguir mayusculas", "https://WEB-INVENTARIO-NEW.EFBCKQ.EASYPANEL.HOST", false, true},
		{"otro host", "https://sitio-no-permitido.example", false, false},
		{"origen invalido", "://invalido", false, false},
		{"desarrollo", "https://cualquier-host.example", true, true},
	}
	for _, caso := range casos {
		t.Run(caso.nombre, func(t *testing.T) {
			if obtenido := origenPermitido(caso.origen, host, urlBase, caso.desarrollo); obtenido != caso.esperado {
				t.Fatalf("origenPermitido() = %v; esperado %v", obtenido, caso.esperado)
			}
		})
	}
}
