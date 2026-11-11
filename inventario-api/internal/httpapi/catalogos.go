package httpapi

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

type simpleDTO struct {
	ID          int     `json:"id"`
	Nombre      string  `json:"nombre"`
	Descripcion *string `json:"descripcion,omitempty"`
}
type unidadDTO struct {
	ID          int    `json:"id"`
	Descripcion string `json:"descripcion"`
}
type proveedorDTO struct {
	ID                           int    `json:"id"`
	Nombre                       string `json:"nombre"`
	RUT, Telefono, TipoProveedor *string
}

func (p proveedorDTO) MarshalJSON() ([]byte, error) {
	return jsonMarshal(map[string]any{"id": p.ID, "nombre": p.Nombre, "rut": p.RUT, "telefono": p.Telefono, "tipoProveedor": p.TipoProveedor})
}

type productoDTO struct {
	IDProducto     int     `json:"id_producto"`
	Nombre         string  `json:"nombre"`
	SKU            *string `json:"sku,omitempty"`
	Descripcion    *string `json:"descripcion,omitempty"`
	Marca          *string `json:"marca,omitempty"`
	Modelo         *string `json:"modelo,omitempty"`
	StockMinimo    int     `json:"stock_minimo"`
	IDCategoria    *int    `json:"id_categoria,omitempty"`
	ProveedorID    *int    `json:"proveedor_id,omitempty"`
	UnidadMedidaID *int    `json:"unidad_medida_id,omitempty"`
}

func (p productoDTO) MarshalJSON() ([]byte, error) {
	return jsonMarshal(map[string]any{"id": p.IDProducto, "id_producto": p.IDProducto, "nombre": p.Nombre, "sku": p.SKU, "descripcion": p.Descripcion, "stock_minimo": p.StockMinimo, "id_categoria": p.IDCategoria, "marca": p.Marca, "modelo": p.Modelo, "proveedor_id": p.ProveedorID, "unidad_medida_id": p.UnidadMedidaID})
}

type clienteDTO struct {
	ID             int     `json:"id"`
	Nombre         string  `json:"nombre"`
	RUT            *string `json:"rut"`
	Usuario        string  `json:"usuario"`
	Clave          *string `json:"clave,omitempty"`
	IDPerfil       int     `json:"id_perfil"`
	IDDepartamento int     `json:"id_departamento"`
}
type permisoDTO struct {
	ID            int `json:"id_permiso"`
	Recurso, Tipo string
	Descripcion   *string
	Asignado      bool
}

func (p permisoDTO) MarshalJSON() ([]byte, error) {
	return jsonMarshal(map[string]any{"id_permiso": p.ID, "recurso": p.Recurso, "tipo": p.Tipo, "descripcion": p.Descripcion, "asignado": p.Asignado})
}

func jsonMarshal(v any) ([]byte, error) { return json.Marshal(v) }
func punteroString(n sql.NullString) *string {
	if !n.Valid {
		return nil
	}
	return &n.String
}
func punteroInt(n sql.NullInt64) *int {
	if !n.Valid {
		return nil
	}
	v := int(n.Int64)
	return &v
}
func idRuta(r *http.Request) (int, error) { return strconv.Atoi(r.PathValue("id")) }

func (s *Servidor) categorias(w http.ResponseWriter, r *http.Request) {
	s.catalogoSimple(w, r, "categorias", "id_categoria", true)
}
func (s *Servidor) departamentos(w http.ResponseWriter, r *http.Request) {
	s.catalogoSimple(w, r, "departamentos", "id_departamento", false)
}
func (s *Servidor) perfiles(w http.ResponseWriter, r *http.Request) {
	s.catalogoSimple(w, r, "perfiles", "id_perfil", true)
}

func (s *Servidor) catalogoSimple(w http.ResponseWriter, r *http.Request, tabla, llave string, conDescripcion bool) {
	id, _ := idRuta(r)
	ctx := r.Context()
	columnas := "nombre"
	if conDescripcion {
		columnas = "nombre, descripcion"
	}
	switch r.Method {
	case http.MethodGet:
		if id > 0 {
			var d simpleDTO
			var desc sql.NullString
			var err error
			if conDescripcion {
				err = s.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT %s,nombre,descripcion FROM inv.%s WHERE %s=$1`, llave, tabla, llave), id).Scan(&d.ID, &d.Nombre, &desc)
				d.Descripcion = punteroString(desc)
			} else {
				err = s.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT %s,nombre FROM inv.%s WHERE %s=$1`, llave, tabla, llave), id).Scan(&d.ID, &d.Nombre)
			}
			if err == sql.ErrNoRows {
				responderProblema(w, 404, "No encontrado", "")
				return
			}
			if err != nil {
				s.errorBD(w, err)
				return
			}
			responderJSON(w, 200, d)
			return
		}
		rows, err := s.db.QueryContext(ctx, fmt.Sprintf(`SELECT %s,%s FROM inv.%s ORDER BY nombre`, llave, columnas, tabla))
		if err != nil {
			s.errorBD(w, err)
			return
		}
		defer rows.Close()
		salida := []simpleDTO{}
		for rows.Next() {
			var d simpleDTO
			var desc sql.NullString
			if conDescripcion {
				err = rows.Scan(&d.ID, &d.Nombre, &desc)
				d.Descripcion = punteroString(desc)
			} else {
				err = rows.Scan(&d.ID, &d.Nombre)
			}
			if err != nil {
				s.errorBD(w, err)
				return
			}
			salida = append(salida, d)
		}
		responderJSON(w, 200, salida)
	case http.MethodPost:
		var d simpleDTO
		if err := decodificarJSON(w, r, &d); err != nil {
			responderProblema(w, 400, "Solicitud invalida", err.Error())
			return
		}
		var nuevo int
		var err error
		if conDescripcion {
			err = s.db.QueryRowContext(ctx, fmt.Sprintf(`INSERT INTO inv.%s (nombre,descripcion) VALUES ($1,$2) RETURNING %s`, tabla, llave), strings.TrimSpace(d.Nombre), d.Descripcion).Scan(&nuevo)
		} else {
			err = s.db.QueryRowContext(ctx, fmt.Sprintf(`INSERT INTO inv.%s (nombre) VALUES ($1) RETURNING %s`, tabla, llave), strings.TrimSpace(d.Nombre)).Scan(&nuevo)
		}
		if err != nil {
			s.errorBD(w, err)
			return
		}
		responderJSON(w, 201, nuevo)
	case http.MethodPut:
		var d simpleDTO
		if err := decodificarJSON(w, r, &d); err != nil {
			responderProblema(w, 400, "Solicitud invalida", err.Error())
			return
		}
		if d.ID != id {
			responderProblema(w, 400, "ID inconsistente", "El ID de la ruta no coincide con el cuerpo.")
			return
		}
		var res sql.Result
		var err error
		if conDescripcion {
			res, err = s.db.ExecContext(ctx, fmt.Sprintf(`UPDATE inv.%s SET nombre=$1,descripcion=$2 WHERE %s=$3`, tabla, llave), strings.TrimSpace(d.Nombre), d.Descripcion, id)
		} else {
			res, err = s.db.ExecContext(ctx, fmt.Sprintf(`UPDATE inv.%s SET nombre=$1 WHERE %s=$2`, tabla, llave), strings.TrimSpace(d.Nombre), id)
		}
		s.resultadoMutacion(w, res, err)
	case http.MethodDelete:
		res, err := s.db.ExecContext(ctx, fmt.Sprintf(`DELETE FROM inv.%s WHERE %s=$1`, tabla, llave), id)
		s.resultadoMutacion(w, res, err)
	}
}

func (s *Servidor) unidades(w http.ResponseWriter, r *http.Request) {
	id, _ := idRuta(r)
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		if id > 0 {
			var d unidadDTO
			err := s.db.QueryRowContext(ctx, `SELECT unidad_medida_id,descripcion FROM inv.unidad_medida WHERE unidad_medida_id=$1`, id).Scan(&d.ID, &d.Descripcion)
			if err == sql.ErrNoRows {
				responderProblema(w, 404, "No encontrado", "")
				return
			}
			if err != nil {
				s.errorBD(w, err)
				return
			}
			responderJSON(w, 200, d)
			return
		}
		rows, err := s.db.QueryContext(ctx, `SELECT unidad_medida_id,descripcion FROM inv.unidad_medida ORDER BY descripcion`)
		if err != nil {
			s.errorBD(w, err)
			return
		}
		defer rows.Close()
		salida := []unidadDTO{}
		for rows.Next() {
			var d unidadDTO
			if rows.Scan(&d.ID, &d.Descripcion) != nil {
				continue
			}
			salida = append(salida, d)
		}
		responderJSON(w, 200, salida)
	case http.MethodPost:
		var d unidadDTO
		if err := decodificarJSON(w, r, &d); err != nil {
			responderProblema(w, 400, "Solicitud invalida", err.Error())
			return
		}
		var nuevo int
		err := s.db.QueryRowContext(ctx, `INSERT INTO inv.unidad_medida(descripcion) VALUES($1) RETURNING unidad_medida_id`, strings.TrimSpace(d.Descripcion)).Scan(&nuevo)
		if err != nil {
			s.errorBD(w, err)
			return
		}
		responderJSON(w, 201, nuevo)
	case http.MethodPut:
		var d unidadDTO
		if err := decodificarJSON(w, r, &d); err != nil {
			responderProblema(w, 400, "Solicitud invalida", err.Error())
			return
		}
		if d.ID != id {
			responderProblema(w, 400, "ID inconsistente", "")
			return
		}
		res, err := s.db.ExecContext(ctx, `UPDATE inv.unidad_medida SET descripcion=$1 WHERE unidad_medida_id=$2`, strings.TrimSpace(d.Descripcion), id)
		s.resultadoMutacion(w, res, err)
	case http.MethodDelete:
		res, err := s.db.ExecContext(ctx, `DELETE FROM inv.unidad_medida WHERE unidad_medida_id=$1`, id)
		s.resultadoMutacion(w, res, err)
	}
}

func (s *Servidor) proveedores(w http.ResponseWriter, r *http.Request) {
	id, _ := idRuta(r)
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.QueryContext(ctx, `SELECT id_proveedor,nombre,rut,telefono,tipo_proveedor FROM inv.proveedores ORDER BY nombre`)
		if err != nil {
			s.errorBD(w, err)
			return
		}
		defer rows.Close()
		salida := []proveedorDTO{}
		for rows.Next() {
			var d proveedorDTO
			var rut, tel, tipo sql.NullString
			if rows.Scan(&d.ID, &d.Nombre, &rut, &tel, &tipo) != nil {
				continue
			}
			d.RUT = punteroString(rut)
			d.Telefono = punteroString(tel)
			d.TipoProveedor = punteroString(tipo)
			salida = append(salida, d)
		}
		responderJSON(w, 200, salida)
	case http.MethodPost:
		var d proveedorDTO
		if err := decodificarJSON(w, r, &d); err != nil {
			responderProblema(w, 400, "Solicitud invalida", err.Error())
			return
		}
		var nuevo int
		err := s.db.QueryRowContext(ctx, `INSERT INTO inv.proveedores(nombre,rut,telefono,tipo_proveedor) VALUES($1,$2,$3,COALESCE($4,'Nacional')) RETURNING id_proveedor`, d.Nombre, d.RUT, d.Telefono, d.TipoProveedor).Scan(&nuevo)
		if err != nil {
			s.errorBD(w, err)
			return
		}
		responderJSON(w, 201, nuevo)
	case http.MethodPut:
		var d proveedorDTO
		if err := decodificarJSON(w, r, &d); err != nil {
			responderProblema(w, 400, "Solicitud invalida", err.Error())
			return
		}
		if d.ID != id {
			responderProblema(w, 400, "ID inconsistente", "")
			return
		}
		res, err := s.db.ExecContext(ctx, `UPDATE inv.proveedores SET nombre=$1,rut=$2,telefono=$3,tipo_proveedor=$4 WHERE id_proveedor=$5`, d.Nombre, d.RUT, d.Telefono, d.TipoProveedor, id)
		s.resultadoMutacion(w, res, err)
	case http.MethodDelete:
		res, err := s.db.ExecContext(ctx, `DELETE FROM inv.proveedores WHERE id_proveedor=$1`, id)
		s.resultadoMutacion(w, res, err)
	}
}

func (s *Servidor) productos(w http.ResponseWriter, r *http.Request) {
	id, _ := idRuta(r)
	ctx := r.Context()
	scan := func(row interface{ Scan(...any) error }) (productoDTO, error) {
		var d productoDTO
		var sku, desc, marca, modelo sql.NullString
		var cat, prov, unidad sql.NullInt64
		err := row.Scan(&d.IDProducto, &d.Nombre, &sku, &desc, &d.StockMinimo, &cat, &marca, &modelo, &prov, &unidad)
		d.SKU = punteroString(sku)
		d.Descripcion = punteroString(desc)
		d.Marca = punteroString(marca)
		d.Modelo = punteroString(modelo)
		d.IDCategoria = punteroInt(cat)
		d.ProveedorID = punteroInt(prov)
		d.UnidadMedidaID = punteroInt(unidad)
		return d, err
	}
	const q = `SELECT id_producto,nombre,sku,descripcion,stock_minimo,id_categoria,marca,modelo,proveedor_id,unidad_medida_id FROM inv.productos`
	switch r.Method {
	case http.MethodGet:
		if id > 0 {
			d, err := scan(s.db.QueryRowContext(ctx, q+` WHERE id_producto=$1`, id))
			if err == sql.ErrNoRows {
				responderProblema(w, 404, "Producto no encontrado", "")
				return
			}
			if err != nil {
				s.errorBD(w, err)
				return
			}
			responderJSON(w, 200, d)
			return
		}
		rows, err := s.db.QueryContext(ctx, q+` ORDER BY nombre`)
		if err != nil {
			s.errorBD(w, err)
			return
		}
		defer rows.Close()
		salida := []productoDTO{}
		for rows.Next() {
			d, err := scan(rows)
			if err != nil {
				s.errorBD(w, err)
				return
			}
			salida = append(salida, d)
		}
		responderJSON(w, 200, salida)
	case http.MethodPost:
		var d productoDTO
		if err := decodificarJSON(w, r, &d); err != nil {
			responderProblema(w, 400, "Solicitud invalida", err.Error())
			return
		}
		var nuevo int
		err := s.db.QueryRowContext(ctx, `INSERT INTO inv.productos(nombre,sku,descripcion,stock_minimo,id_categoria,marca,modelo,proveedor_id,unidad_medida_id,usuario_ingreso) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id_producto`, d.Nombre, d.SKU, d.Descripcion, d.StockMinimo, d.IDCategoria, d.Marca, d.Modelo, d.ProveedorID, d.UnidadMedidaID, usuarioActual(r)).Scan(&nuevo)
		if err != nil {
			s.errorBD(w, err)
			return
		}
		responderJSON(w, 201, nuevo)
	case http.MethodPut:
		var d productoDTO
		if err := decodificarJSON(w, r, &d); err != nil {
			responderProblema(w, 400, "Solicitud invalida", err.Error())
			return
		}
		if d.IDProducto != id {
			responderProblema(w, 400, "ID inconsistente", "")
			return
		}
		res, err := s.db.ExecContext(ctx, `UPDATE inv.productos SET nombre=$1,sku=$2,descripcion=$3,stock_minimo=$4,id_categoria=$5,marca=$6,modelo=$7,proveedor_id=$8,unidad_medida_id=$9,usuario_modifica=$10 WHERE id_producto=$11`, d.Nombre, d.SKU, d.Descripcion, d.StockMinimo, d.IDCategoria, d.Marca, d.Modelo, d.ProveedorID, d.UnidadMedidaID, usuarioActual(r), id)
		s.resultadoMutacion(w, res, err)
	case http.MethodDelete:
		res, err := s.db.ExecContext(ctx, `DELETE FROM inv.productos WHERE id_producto=$1`, id)
		s.resultadoMutacion(w, res, err)
	}
}

func (s *Servidor) clientes(w http.ResponseWriter, r *http.Request) {
	id, _ := idRuta(r)
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		rows, err := s.db.QueryContext(ctx, `SELECT id_cliente,nombre,rut,usuario,id_perfil,id_departamento FROM inv.clientes ORDER BY nombre`)
		if err != nil {
			s.errorBD(w, err)
			return
		}
		defer rows.Close()
		salida := []clienteDTO{}
		for rows.Next() {
			var d clienteDTO
			var rut sql.NullString
			if rows.Scan(&d.ID, &d.Nombre, &rut, &d.Usuario, &d.IDPerfil, &d.IDDepartamento) != nil {
				continue
			}
			d.RUT = punteroString(rut)
			salida = append(salida, d)
		}
		responderJSON(w, 200, salida)
	case http.MethodPost:
		var d clienteDTO
		if err := decodificarJSON(w, r, &d); err != nil {
			responderProblema(w, 400, "Solicitud invalida", err.Error())
			return
		}
		if d.Clave == nil || len(*d.Clave) < 6 {
			responderProblema(w, 400, "Clave invalida", "La clave debe tener al menos 6 caracteres.")
			return
		}
		hash, _ := bcrypt.GenerateFromPassword([]byte(*d.Clave), bcrypt.DefaultCost)
		var nuevo int
		err := s.db.QueryRowContext(ctx, `INSERT INTO inv.clientes(nombre,rut,usuario,clave,id_perfil,id_departamento,usuario_ingreso) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id_cliente`, d.Nombre, d.RUT, d.Usuario, string(hash), d.IDPerfil, d.IDDepartamento, usuarioActual(r)).Scan(&nuevo)
		if err != nil {
			s.errorBD(w, err)
			return
		}
		responderJSON(w, 201, nuevo)
	case http.MethodPut:
		var d clienteDTO
		if err := decodificarJSON(w, r, &d); err != nil {
			responderProblema(w, 400, "Solicitud invalida", err.Error())
			return
		}
		if d.ID != id {
			responderProblema(w, 400, "ID inconsistente", "")
			return
		}
		var res sql.Result
		var err error
		if d.Clave != nil && strings.TrimSpace(*d.Clave) != "" {
			hash, _ := bcrypt.GenerateFromPassword([]byte(*d.Clave), bcrypt.DefaultCost)
			res, err = s.db.ExecContext(ctx, `UPDATE inv.clientes SET nombre=$1,rut=$2,usuario=$3,clave=$4,id_perfil=$5,id_departamento=$6,usuario_modifica=$7 WHERE id_cliente=$8`, d.Nombre, d.RUT, d.Usuario, string(hash), d.IDPerfil, d.IDDepartamento, usuarioActual(r), id)
		} else {
			res, err = s.db.ExecContext(ctx, `UPDATE inv.clientes SET nombre=$1,rut=$2,usuario=$3,id_perfil=$4,id_departamento=$5,usuario_modifica=$6 WHERE id_cliente=$7`, d.Nombre, d.RUT, d.Usuario, d.IDPerfil, d.IDDepartamento, usuarioActual(r), id)
		}
		s.resultadoMutacion(w, res, err)
	case http.MethodDelete:
		res, err := s.db.ExecContext(ctx, `DELETE FROM inv.clientes WHERE id_cliente=$1`, id)
		s.resultadoMutacion(w, res, err)
	}
}

func (s *Servidor) permisosCliente(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		responderProblema(w, 400, "ID invalido", "")
		return
	}
	tipo := r.PathValue("tipo")
	if tipo == "menus" {
		tipo = "menu"
	} else if tipo == "botones" {
		tipo = "boton"
	} else {
		responderProblema(w, 404, "No encontrado", "")
		return
	}
	rows, err := s.db.QueryContext(r.Context(), `SELECT p.recurso FROM inv.clientes c JOIN inv.perfiles_permisos pp ON pp.id_perfil=c.id_perfil JOIN inv.permisos p ON p.id_permiso=pp.id_permiso WHERE c.id_cliente=$1 AND p.tipo=$2 ORDER BY p.recurso`, id, tipo)
	if err != nil {
		s.errorBD(w, err)
		return
	}
	defer rows.Close()
	salida := []string{}
	for rows.Next() {
		var v string
		if rows.Scan(&v) == nil {
			salida = append(salida, v)
		}
	}
	responderJSON(w, 200, salida)
}

func (s *Servidor) permisosPerfil(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.PathValue("id"))
	if r.Method == http.MethodGet {
		rows, err := s.db.QueryContext(r.Context(), `SELECT p.id_permiso,p.recurso,p.tipo,p.descripcion,(pp.id_permiso IS NOT NULL) FROM inv.permisos p LEFT JOIN inv.perfiles_permisos pp ON pp.id_permiso=p.id_permiso AND pp.id_perfil=$1 ORDER BY p.tipo,p.recurso`, id)
		if err != nil {
			s.errorBD(w, err)
			return
		}
		defer rows.Close()
		salida := []permisoDTO{}
		for rows.Next() {
			var d permisoDTO
			var desc sql.NullString
			if rows.Scan(&d.ID, &d.Recurso, &d.Tipo, &desc, &d.Asignado) != nil {
				continue
			}
			d.Descripcion = punteroString(desc)
			salida = append(salida, d)
		}
		responderJSON(w, 200, salida)
		return
	}
	var ids []int
	if err := decodificarJSON(w, r, &ids); err != nil {
		responderProblema(w, 400, "Solicitud invalida", err.Error())
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.errorBD(w, err)
		return
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(r.Context(), `DELETE FROM inv.perfiles_permisos WHERE id_perfil=$1`, id); err == nil {
		for _, pid := range ids {
			if _, err = tx.ExecContext(r.Context(), `INSERT INTO inv.perfiles_permisos(id_perfil,id_permiso) VALUES($1,$2)`, id, pid); err != nil {
				break
			}
		}
	}
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		s.errorBD(w, err)
		return
	}
	w.WriteHeader(204)
}

func usuarioActual(r *http.Request) string {
	if u, ok := r.Context().Value(claveUsuario).(usuarioSesion); ok {
		return u.Nombre
	}
	return "sistema"
}
func (s *Servidor) resultadoMutacion(w http.ResponseWriter, res sql.Result, err error) {
	if err != nil {
		s.errorBD(w, err)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		responderProblema(w, 404, "No encontrado", "")
		return
	}
	w.WriteHeader(204)
}
func (s *Servidor) errorBD(w http.ResponseWriter, err error) {
	s.logger.Error("error de base de datos", "error", err)
	mensaje := strings.ToLower(err.Error())
	switch {
	case strings.Contains(mensaje, "duplicate key") || strings.Contains(mensaje, "unique constraint"):
		responderProblema(w, 409, "Registro duplicado", "Ya existe un registro con esos datos.")
	case strings.Contains(mensaje, "foreign key"):
		responderProblema(w, 409, "Registro relacionado", "La operacion afecta registros relacionados o usa una referencia inexistente.")
	default:
		responderProblema(w, 500, "Error interno", "No fue posible completar la operacion.")
	}
}
