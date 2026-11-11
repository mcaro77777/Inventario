package httpapi

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"
)

func categoriaFiltro(r *http.Request) (string, []any) {
	v := r.URL.Query().Get("categoriaId")
	if v == "" {
		return "", nil
	}
	id, err := strconv.Atoi(v)
	if err != nil {
		return "", nil
	}
	return " AND p.id_categoria=$1", []any{id}
}
func (s *Servidor) dashboardKPIs(w http.ResponseWriter, r *http.Request) {
	f, a := categoriaFiltro(r)
	q := `WITH stock AS(SELECT p.id_producto,p.stock_minimo,COALESCE(SUM(CASE WHEN i.tipo=0 THEN i.cantidad WHEN i.tipo IN(1,2) THEN -i.cantidad ELSE 0 END),0) cantidad,COALESCE(SUM(CASE WHEN i.tipo=0 THEN i.total ELSE 0 END),0) valor FROM inv.productos p LEFT JOIN inv.ingresos_stock i ON i.id_producto=p.id_producto WHERE 1=1` + f + ` GROUP BY p.id_producto,p.stock_minimo) SELECT COUNT(*) FILTER(WHERE cantidad>0),COUNT(*) FILTER(WHERE cantidad<=0),COUNT(*) FILTER(WHERE cantidad>0 AND cantidad<=stock_minimo),COALESCE(SUM(valor),0),(SELECT COALESCE(SUM(i.cantidad),0) FROM inv.ingresos_stock i JOIN inv.productos p ON p.id_producto=i.id_producto WHERE i.tipo IN(1,2) AND i.fecha>=CURRENT_DATE-30` + f + `) FROM stock`
	var con, sin, bajo int
	var valor, rot float64
	if err := s.db.QueryRowContext(r.Context(), q, a...).Scan(&con, &sin, &bajo, &valor, &rot); err != nil {
		s.errorBD(w, err)
		return
	}
	responderJSON(w, 200, map[string]any{"productosEnStock": con, "sinStock": sin, "bajoMinimo": bajo, "valorInventario": valor, "rotacion30d": rot})
}
func (s *Servidor) dashboardMovimientos(w http.ResponseWriter, r *http.Request) {
	f, a := categoriaFiltro(r)
	rows, err := s.db.QueryContext(r.Context(), `SELECT d::date,COALESCE(SUM(i.cantidad)FILTER(WHERE i.tipo=0),0),COALESCE(SUM(i.cantidad)FILTER(WHERE i.tipo IN(1,2)),0) FROM generate_series(CURRENT_DATE-6,CURRENT_DATE,'1 day')d LEFT JOIN inv.ingresos_stock i ON i.fecha=d::date LEFT JOIN inv.productos p ON p.id_producto=i.id_producto WHERE 1=1`+f+` GROUP BY d ORDER BY d`, a...)
	if err != nil {
		s.errorBD(w, err)
		return
	}
	defer rows.Close()
	salida := []map[string]any{}
	for rows.Next() {
		var d time.Time
		var x, y float64
		if rows.Scan(&d, &x, &y) == nil {
			salida = append(salida, map[string]any{"label": d.Format("02-01"), "serieA": x, "serieB": y})
		}
	}
	responderJSON(w, 200, salida)
}
func (s *Servidor) dashboardValor(w http.ResponseWriter, r *http.Request) {
	f, a := categoriaFiltro(r)
	rows, err := s.db.QueryContext(r.Context(), `SELECT to_char(m,'Mon YY'),COALESCE(SUM(i.total)FILTER(WHERE i.tipo=0),0) FROM generate_series(date_trunc('month',CURRENT_DATE)-interval '5 month',date_trunc('month',CURRENT_DATE),'1 month')m LEFT JOIN inv.ingresos_stock i ON date_trunc('month',i.fecha)=m LEFT JOIN inv.productos p ON p.id_producto=i.id_producto WHERE 1=1`+f+` GROUP BY m ORDER BY m`, a...)
	s.dashboardEtiquetas(w, rows, err)
}
func (s *Servidor) dashboardStockCategoria(w http.ResponseWriter, r *http.Request) {
	f, a := categoriaFiltro(r)
	rows, err := s.db.QueryContext(r.Context(), `SELECT COALESCE(c.nombre,'Sin categoria'),COALESCE(SUM(CASE WHEN i.tipo=0 THEN i.cantidad WHEN i.tipo IN(1,2) THEN -i.cantidad ELSE 0 END),0) FROM inv.productos p LEFT JOIN inv.categorias c ON c.id_categoria=p.id_categoria LEFT JOIN inv.ingresos_stock i ON i.id_producto=p.id_producto WHERE 1=1`+f+` GROUP BY c.nombre ORDER BY 2 DESC`, a...)
	s.dashboardEtiquetas(w, rows, err)
}
func (s *Servidor) dashboardConsumo(w http.ResponseWriter, r *http.Request) {
	f, a := categoriaFiltro(r)
	rows, err := s.db.QueryContext(r.Context(), `SELECT d.nombre,COALESCE(SUM(i.cantidad),0) FROM inv.ingresos_stock i JOIN inv.productos p ON p.id_producto=i.id_producto JOIN inv.clientes c ON c.id_cliente=i.id_cliente JOIN inv.departamentos d ON d.id_departamento=c.id_departamento WHERE i.tipo IN(1,2) AND i.fecha>=CURRENT_DATE-30`+f+` GROUP BY d.nombre ORDER BY 2 DESC`, a...)
	s.dashboardEtiquetas(w, rows, err)
}
func (s *Servidor) dashboardEtiquetas(w http.ResponseWriter, rows *sql.Rows, err error) {
	if err != nil {
		s.errorBD(w, err)
		return
	}
	defer rows.Close()
	salida := []map[string]any{}
	for rows.Next() {
		var l string
		var v float64
		if rows.Scan(&l, &v) == nil {
			salida = append(salida, map[string]any{"label": l, "value": v})
		}
	}
	responderJSON(w, 200, salida)
}
func (s *Servidor) dashboardBajoMinimo(w http.ResponseWriter, r *http.Request) {
	f, a := categoriaFiltro(r)
	top := 20
	if n, e := strconv.Atoi(r.URL.Query().Get("top")); e == nil && n > 0 && n <= 200 {
		top = n
	}
	a = append(a, top)
	param := len(a)
	rows, err := s.db.QueryContext(r.Context(), `SELECT p.id_producto,p.nombre,c.nombre,COALESCE(SUM(CASE WHEN i.tipo=0 THEN i.cantidad WHEN i.tipo IN(1,2) THEN -i.cantidad ELSE 0 END),0)::int,p.stock_minimo FROM inv.productos p LEFT JOIN inv.categorias c ON c.id_categoria=p.id_categoria LEFT JOIN inv.ingresos_stock i ON i.id_producto=p.id_producto WHERE 1=1`+f+` GROUP BY p.id_producto,p.nombre,c.nombre,p.stock_minimo HAVING COALESCE(SUM(CASE WHEN i.tipo=0 THEN i.cantidad WHEN i.tipo IN(1,2) THEN -i.cantidad ELSE 0 END),0)<=p.stock_minimo ORDER BY 4 LIMIT $`+strconv.Itoa(param), a...)
	if err != nil {
		s.errorBD(w, err)
		return
	}
	defer rows.Close()
	salida := []map[string]any{}
	for rows.Next() {
		var id, actual, min int
		var nombre string
		var cat sql.NullString
		if rows.Scan(&id, &nombre, &cat, &actual, &min) == nil {
			salida = append(salida, map[string]any{"productoId": id, "nombre": nombre, "categoria": valorNull(cat), "stockActual": actual, "stockMinimo": min})
		}
	}
	responderJSON(w, 200, salida)
}
func (s *Servidor) dashboardDetalle(w http.ResponseWriter, r *http.Request) {
	f, a := categoriaFiltro(r)
	rows, err := s.db.QueryContext(r.Context(), `SELECT p.id_producto,p.nombre,c.nombre,COALESCE(SUM(CASE WHEN i.tipo=0 THEN i.cantidad WHEN i.tipo IN(1,2) THEN -i.cantidad ELSE 0 END),0)::int,COALESCE(AVG(i.valor_unitario)FILTER(WHERE i.tipo=0),0),COALESCE(SUM(CASE WHEN i.tipo=0 THEN i.total ELSE 0 END),0) FROM inv.productos p LEFT JOIN inv.categorias c ON c.id_categoria=p.id_categoria LEFT JOIN inv.ingresos_stock i ON i.id_producto=p.id_producto WHERE 1=1`+f+` GROUP BY p.id_producto,p.nombre,c.nombre ORDER BY p.nombre`, a...)
	if err != nil {
		s.errorBD(w, err)
		return
	}
	defer rows.Close()
	salida := []map[string]any{}
	for rows.Next() {
		var id, cant int
		var nombre string
		var cat sql.NullString
		var prom, total float64
		if rows.Scan(&id, &nombre, &cat, &cant, &prom, &total) == nil {
			salida = append(salida, map[string]any{"productoId": id, "nombre": nombre, "categoria": valorNull(cat), "cantidad": cant, "precioPromedio": prom, "total": total})
		}
	}
	responderJSON(w, 200, salida)
}
func (s *Servidor) tablaResumen(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.QueryContext(r.Context(), `SELECT i.id_ingreso,i.fecha,i.fecha_ingreso,i.fecha_modifica,i.tipo AS tipo_id,CASE i.tipo WHEN 0 THEN 'Ingreso' WHEN 1 THEN 'Pendiente' WHEN 2 THEN 'Aprobado' WHEN 3 THEN 'Rechazado' END tipo_nombre,i.estado AS estado_id,i.cantidad,i.valor_unitario,i.descuento_pct,i.gastos,i.total,i.doc_ordencompra,i.observacion,i.usuario_ingreso,i.usuario_modifica,p.id_producto,p.nombre AS producto_nombre,p.sku AS producto_sku,p.descripcion AS producto_descripcion,p.marca AS producto_marca,p.modelo AS producto_modelo,p.stock_minimo AS producto_stock_minimo,c.id_categoria,c.nombre AS categoria_nombre,u.unidad_medida_id,u.descripcion AS unidad_medida_descripcion,pp.id_proveedor AS producto_proveedor_id,pp.nombre AS producto_proveedor_nombre,ip.id_proveedor AS ingreso_proveedor_id,ip.nombre AS ingreso_proveedor_nombre,cl.id_cliente,cl.nombre AS cliente_nombre,cl.rut AS cliente_rut,d.id_departamento,d.nombre AS departamento_nombre,pf.id_perfil,pf.nombre AS perfil_nombre FROM inv.ingresos_stock i JOIN inv.productos p ON p.id_producto=i.id_producto LEFT JOIN inv.categorias c ON c.id_categoria=p.id_categoria LEFT JOIN inv.unidad_medida u ON u.unidad_medida_id=p.unidad_medida_id LEFT JOIN inv.proveedores pp ON pp.id_proveedor=p.proveedor_id LEFT JOIN inv.proveedores ip ON ip.id_proveedor=i.id_proveedor LEFT JOIN inv.clientes cl ON cl.id_cliente=i.id_cliente LEFT JOIN inv.departamentos d ON d.id_departamento=cl.id_departamento LEFT JOIN inv.perfiles pf ON pf.id_perfil=cl.id_perfil ORDER BY i.fecha DESC,i.id_ingreso DESC`)
	if err != nil {
		s.errorBD(w, err)
		return
	}
	defer rows.Close()
	cols, _ := rows.Columns()
	salida := []map[string]any{}
	for rows.Next() {
		vals := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if rows.Scan(ptrs...) != nil {
			continue
		}
		m := map[string]any{}
		for i, c := range cols {
			if b, ok := vals[i].([]byte); ok {
				m[c] = string(b)
			} else {
				m[c] = vals[i]
			}
		}
		salida = append(salida, m)
	}
	responderJSON(w, 200, salida)
}
