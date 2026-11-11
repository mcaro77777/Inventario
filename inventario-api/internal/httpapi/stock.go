package httpapi

import (
	"bytes"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type ingresoEntrada struct {
	Producto                                                          int `json:"producto"`
	Proveedor, Cliente                                                *int
	Fecha                                                             string  `json:"fecha"`
	Estado                                                            *int    `json:"estado"`
	Tipo                                                              int     `json:"tipo"`
	Cantidad                                                          int     `json:"cantidad"`
	ValorUnitario                                                     float64 `json:"valorUnitario"`
	Descuento                                                         float64 `json:"descuento"`
	DocOrdenCompra, DocFactura, DocGuiaDespacho, DocNotaCreditoDebito *string
}
type actualizarMovimiento struct {
	Cantidad                                                          int     `json:"cantidad"`
	ValorUnitario                                                     float64 `json:"valorUnitario"`
	Descuento                                                         float64 `json:"descuento"`
	IDProveedor, Estado                                               *int
	DocOrdenCompra, DocFactura, DocGuiaDespacho, DocNotaCreditoDebito *string
}

func (s *Servidor) listarStock(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.QueryContext(r.Context(), `SELECT p.id_producto,p.nombre,p.sku,p.stock_minimo,c.nombre,COALESCE(SUM(CASE WHEN i.tipo=0 THEN i.cantidad WHEN i.tipo IN(1,2) THEN -i.cantidad ELSE 0 END),0)::int,p.proveedor_id FROM inv.productos p LEFT JOIN inv.categorias c ON c.id_categoria=p.id_categoria LEFT JOIN inv.ingresos_stock i ON i.id_producto=p.id_producto GROUP BY p.id_producto,p.nombre,p.sku,p.stock_minimo,c.nombre,p.proveedor_id ORDER BY (COALESCE(SUM(CASE WHEN i.tipo=0 THEN i.cantidad WHEN i.tipo IN(1,2) THEN -i.cantidad ELSE 0 END),0)<=p.stock_minimo) DESC,p.nombre`)
	if err != nil {
		s.errorBD(w, err)
		return
	}
	defer rows.Close()
	salida := []map[string]any{}
	for rows.Next() {
		var id, minimo, actual int
		var nombre string
		var sku, cat sql.NullString
		var prov sql.NullInt64
		if rows.Scan(&id, &nombre, &sku, &minimo, &cat, &actual, &prov) != nil {
			continue
		}
		color := 1
		if actual <= minimo {
			color = 0
		}
		salida = append(salida, map[string]any{"idProducto": id, "nombre": nombre, "sku": valorNull(sku), "stockMinimo": minimo, "categoriaNombre": valorNull(cat), "stockActual": actual, "proveedor_id": valorNullInt(prov), "color": color})
	}
	responderJSON(w, 200, salida)
}

func (s *Servidor) historialStock(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("productoId"))
	if err != nil {
		responderProblema(w, 400, "ID invalido", "")
		return
	}
	rows, err := s.db.QueryContext(r.Context(), `SELECT i.id_ingreso,i.fecha,i.tipo,i.cantidad,i.valor_unitario,i.descuento_pct,i.total,pr.nombre,i.doc_ordencompra,i.doc_factura,i.doc_guiadespacho,i.doc_notacredito_debito,i.id_proveedor,i.estado FROM inv.ingresos_stock i LEFT JOIN inv.proveedores pr ON pr.id_proveedor=i.id_proveedor WHERE i.id_producto=$1 ORDER BY i.fecha DESC,i.id_ingreso DESC`, id)
	if err != nil {
		s.errorBD(w, err)
		return
	}
	defer rows.Close()
	salida := []map[string]any{}
	for rows.Next() {
		var mid, tipo, cantidad int
		var fecha time.Time
		var valor, desc, total float64
		var prov, oc, fact, guia, nota sql.NullString
		var pid, estado sql.NullInt64
		if rows.Scan(&mid, &fecha, &tipo, &cantidad, &valor, &desc, &total, &prov, &oc, &fact, &guia, &nota, &pid, &estado) != nil {
			continue
		}
		salida = append(salida, map[string]any{"idIngreso": mid, "fecha": fecha.Format("2006-01-02"), "tipo": tipo, "cantidad": cantidad, "valorUnitario": valor, "descuento": desc, "totalConIVA": total, "proveedorNombre": valorNull(prov), "docOrdenCompra": valorNull(oc), "docFactura": valorNull(fact), "docGuiaDespacho": valorNull(guia), "docNotaCreditoDebito": valorNull(nota), "idProveedor": valorNullInt(pid), "estado": valorNullInt(estado)})
	}
	responderJSON(w, 200, salida)
}

func (s *Servidor) crearIngreso(w http.ResponseWriter, r *http.Request) {
	var d ingresoEntrada
	if err := decodificarJSON(w, r, &d); err != nil {
		responderProblema(w, 400, "Solicitud invalida", err.Error())
		return
	}
	if d.Producto < 1 || d.Cantidad < 1 || d.Fecha == "" {
		responderProblema(w, 400, "Datos incompletos", "Producto, fecha y cantidad son obligatorios.")
		return
	}
	var nuevo int
	err := s.db.QueryRowContext(r.Context(), `INSERT INTO inv.ingresos_stock(id_producto,id_proveedor,id_cliente,fecha,estado,tipo,cantidad,valor_unitario,descuento_pct,gastos,total,doc_ordencompra,doc_factura,doc_guiadespacho,doc_notacredito_debito,usuario_ingreso) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,0,0,$10,$11,$12,$13,$14) RETURNING id_ingreso`, d.Producto, d.Proveedor, d.Cliente, d.Fecha, d.Estado, d.Tipo, d.Cantidad, d.ValorUnitario, d.Descuento, d.DocOrdenCompra, d.DocFactura, d.DocGuiaDespacho, d.DocNotaCreditoDebito, usuarioActual(r)).Scan(&nuevo)
	if err != nil {
		s.errorBD(w, err)
		return
	}
	responderJSON(w, 201, nuevo)
}

func (s *Servidor) crearRetiro(w http.ResponseWriter, r *http.Request) {
	var d ingresoEntrada
	if err := decodificarJSON(w, r, &d); err != nil {
		responderProblema(w, 400, "Solicitud invalida", err.Error())
		return
	}
	if d.Producto < 1 || d.Cantidad < 1 || d.Cliente == nil {
		responderProblema(w, 400, "Datos incompletos", "Producto, cliente y cantidad son obligatorios.")
		return
	}
	var pmp float64
	_ = s.db.QueryRowContext(r.Context(), `SELECT COALESCE(SUM(cantidad*valor_unitario)/NULLIF(SUM(cantidad),0),0) FROM inv.ingresos_stock WHERE id_producto=$1 AND tipo=0 AND valor_unitario>0`, d.Producto).Scan(&pmp)
	estado := 1
	if d.Estado != nil {
		estado = *d.Estado
	}
	var nuevo int
	err := s.db.QueryRowContext(r.Context(), `INSERT INTO inv.ingresos_stock(id_producto,id_cliente,fecha,estado,tipo,cantidad,valor_unitario,descuento_pct,gastos,total,usuario_ingreso) VALUES($1,$2,$3,$4,1,$5,$6,$7,0,0,$8) RETURNING id_ingreso`, d.Producto, d.Cliente, d.Fecha, estado, d.Cantidad, pmp, d.Descuento, usuarioActual(r)).Scan(&nuevo)
	if err != nil {
		s.errorBD(w, err)
		return
	}
	responderJSON(w, 201, nuevo)
}

func (s *Servidor) movimiento(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.PathValue("id"))
	if r.Method == http.MethodDelete {
		res, err := s.db.ExecContext(r.Context(), `DELETE FROM inv.ingresos_stock WHERE id_ingreso=$1`, id)
		s.resultadoMutacion(w, res, err)
		return
	}
	var d actualizarMovimiento
	if err := decodificarJSON(w, r, &d); err != nil {
		responderProblema(w, 400, "Solicitud invalida", err.Error())
		return
	}
	res, err := s.db.ExecContext(r.Context(), `UPDATE inv.ingresos_stock SET cantidad=$1,valor_unitario=$2,descuento_pct=$3,id_proveedor=$4,estado=$5,doc_ordencompra=$6,doc_factura=$7,doc_guiadespacho=$8,doc_notacredito_debito=$9,usuario_modifica=$10 WHERE id_ingreso=$11`, d.Cantidad, d.ValorUnitario, d.Descuento, d.IDProveedor, d.Estado, d.DocOrdenCompra, d.DocFactura, d.DocGuiaDespacho, d.DocNotaCreditoDebito, usuarioActual(r), id)
	s.resultadoMutacion(w, res, err)
}

func (s *Servidor) cantidadMovimiento(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.PathValue("id"))
	var d struct {
		Cantidad      int     `json:"cantidad"`
		ValorUnitario float64 `json:"valorUnitario"`
	}
	if err := decodificarJSON(w, r, &d); err != nil {
		responderProblema(w, 400, "Solicitud invalida", err.Error())
		return
	}
	res, err := s.db.ExecContext(r.Context(), `UPDATE inv.ingresos_stock SET cantidad=$1,valor_unitario=$2,usuario_modifica=$3 WHERE id_ingreso=$4`, d.Cantidad, d.ValorUnitario, usuarioActual(r), id)
	s.resultadoMutacion(w, res, err)
}

func (s *Servidor) solicitudes(w http.ResponseWriter, r *http.Request) {
	filtro := ""
	args := []any{}
	if v := r.PathValue("clienteId"); v != "" {
		id, err := strconv.Atoi(v)
		if err != nil {
			responderProblema(w, 400, "ID invalido", "")
			return
		}
		filtro = " AND i.id_cliente=$1"
		args = append(args, id)
	}
	rows, err := s.db.QueryContext(r.Context(), `SELECT i.id_ingreso,p.id_producto,p.nombre,COALESCE(c.nombre,''),i.cantidad,i.tipo,i.id_cliente,cl.nombre,i.observacion FROM inv.ingresos_stock i JOIN inv.productos p ON p.id_producto=i.id_producto LEFT JOIN inv.categorias c ON c.id_categoria=p.id_categoria JOIN inv.clientes cl ON cl.id_cliente=i.id_cliente WHERE i.tipo IN(1,2,3)`+filtro+` ORDER BY i.id_ingreso DESC`, args...)
	if err != nil {
		s.errorBD(w, err)
		return
	}
	defer rows.Close()
	salida := []map[string]any{}
	for rows.Next() {
		var id, pid, cantidad, tipo, cid int
		var prod, cat, cliente string
		var obs sql.NullString
		if rows.Scan(&id, &pid, &prod, &cat, &cantidad, &tipo, &cid, &cliente, &obs) != nil {
			continue
		}
		salida = append(salida, map[string]any{"idIngreso": id, "idProducto": pid, "productoNombre": prod, "categoriaNombre": cat, "cantidad": cantidad, "tipo": tipo, "idCliente": cid, "clienteNombre": cliente, "observacion": valorNull(obs)})
	}
	responderJSON(w, 200, salida)
}

func (s *Servidor) estadoSolicitud(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.PathValue("id"))
	var d struct {
		Tipo        int     `json:"tipo"`
		Observacion *string `json:"observacion"`
	}
	if err := decodificarJSON(w, r, &d); err != nil {
		responderProblema(w, 400, "Solicitud invalida", err.Error())
		return
	}
	res, err := s.db.ExecContext(r.Context(), `UPDATE inv.ingresos_stock SET tipo=$1,observacion=$2,valor_unitario=CASE WHEN valor_unitario=0 AND $1=2 THEN COALESCE((SELECT SUM(x.cantidad*x.valor_unitario)/NULLIF(SUM(x.cantidad),0) FROM inv.ingresos_stock x WHERE x.id_producto=ingresos_stock.id_producto AND x.tipo=0 AND x.valor_unitario>0),0) ELSE valor_unitario END,usuario_modifica=$3 WHERE id_ingreso=$4`, d.Tipo, d.Observacion, usuarioActual(r), id)
	s.resultadoMutacion(w, res, err)
}
func (s *Servidor) eliminarSolicitud(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.PathValue("id"))
	res, err := s.db.ExecContext(r.Context(), `DELETE FROM inv.ingresos_stock WHERE id_ingreso=$1 AND tipo=1`, id)
	s.resultadoMutacion(w, res, err)
}

func (s *Servidor) certificadoSolicitud(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(r.PathValue("id"))
	var fecha time.Time
	var tipo, cantidad int
	var cliente, producto string
	var rut sql.NullString
	err := s.db.QueryRowContext(r.Context(), `SELECT i.fecha,i.tipo,i.cantidad,c.nombre,c.rut,p.nombre FROM inv.ingresos_stock i JOIN inv.clientes c ON c.id_cliente=i.id_cliente JOIN inv.productos p ON p.id_producto=i.id_producto WHERE i.id_ingreso=$1`, id).Scan(&fecha, &tipo, &cantidad, &cliente, &rut, &producto)
	if err == sql.ErrNoRows {
		responderProblema(w, 404, "Solicitud no encontrada", "")
		return
	}
	if err != nil {
		s.errorBD(w, err)
		return
	}
	contenido := fmt.Sprintf("CERTIFICADO DE SOLICITUD\n\nFolio: %d\nFecha: %s\nSolicitante: %s\nRUT: %s\nProducto: %s\nCantidad: %d\nEstado: %s", id, fecha.Format("02-01-2006"), cliente, rut.String, producto, cantidad, nombreTipo(tipo))
	pdf := pdfSimple(contenido)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="solicitud-%d.pdf"`, id))
	w.Write(pdf)
}

func nombreTipo(t int) string {
	switch t {
	case 1:
		return "Pendiente"
	case 2:
		return "Aprobada"
	case 3:
		return "Rechazada"
	}
	return "Ingreso"
}
func valorNull(v sql.NullString) any {
	if v.Valid {
		return v.String
	}
	return nil
}
func valorNullInt(v sql.NullInt64) any {
	if v.Valid {
		return v.Int64
	}
	return nil
}
func pdfSimple(texto string) []byte {
	texto = strings.ReplaceAll(strings.ReplaceAll(texto, "\\", "\\\\"), "(", "\\(")
	texto = strings.ReplaceAll(texto, ")", "\\)")
	lineas := strings.Split(texto, "\n")
	var stream strings.Builder
	stream.WriteString("BT /F1 12 Tf 50 790 Td 15 TL ")
	for i, l := range lineas {
		if i > 0 {
			stream.WriteString("T* ")
		}
		stream.WriteString("(" + l + ") Tj ")
	}
	stream.WriteString("ET")
	objetos := []string{"<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", fmt.Sprintf("<< /Length %d >>\nstream\n%s\nendstream", stream.Len(), stream.String()), "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"}
	var b bytes.Buffer
	b.WriteString("%PDF-1.4\n")
	offsets := []int{0}
	for i, o := range objetos {
		offsets = append(offsets, b.Len())
		fmt.Fprintf(&b, "%d 0 obj\n%s\nendobj\n", i+1, o)
	}
	xref := b.Len()
	fmt.Fprintf(&b, "xref\n0 %d\n0000000000 65535 f \n", len(objetos)+1)
	for _, o := range offsets[1:] {
		fmt.Fprintf(&b, "%010d 00000 n \n", o)
	}
	fmt.Fprintf(&b, "trailer << /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF", len(objetos)+1, xref)
	return b.Bytes()
}
