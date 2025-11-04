"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";

const STORAGE_KEY = "cliente-form-v1";
const FROZEN_FIELDS = ["nombreCompleto", "email", "telefono", "documento"];

const EMPTY = {
  nombreCompleto: "",
  email: "",
  telefono: "",
  documento: "",

  calle: "",
  numero: "",
  piso: "",
  referencia: "",
  codigoPostal: "",
  ciudad: "",
  provincia: "",
  pais: "",
  tipoEnvio: "",
  comentariosEnvio: "",

  metodoPago: "",
  titularTarjeta: "",
  numeroTarjeta: "",
  vencimientoTarjeta: "",
  cvvTarjeta: "",
  direccionFacturacion: "",
  comprobanteTransferencia: "",

  tipoFactura: "",
  razonSocial: "",
  cuit: "",
  direccionFiscal: "",

  aceptaTerminos: false,
  aceptaPromos: false,
};

/* ===== styled ===== */

const Page = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 16px 60px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const HeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const Title = styled.h1`
  font-size: 1.6rem;
  font-weight: 600;
`;

const Status = styled.span`
  background: rgba(22, 163, 74, 0.1);
  border: 1px solid rgba(22, 163, 74, 0.35);
  color: #166534;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 0.7rem;
`;

const EditBtn = styled.button`
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 0.7rem;
  cursor: pointer;
`;

const ErrorBox = styled.div`
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #b91c1c;
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 0.8rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Card = styled.section`
  background: #fff;
  border: 1px solid rgba(226, 232, 240, 0.7);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const CardTitle = styled.h2`
  font-size: 0.9rem;
  font-weight: 600;
`;

const Grid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(${(p) => p.$cols || 2}, minmax(0, 1fr));

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.72rem;
`;

const Input = styled.input`
  border: 1px solid
    ${(p) => (p.$locked ? "rgba(148, 163, 184, 0.35)" : "rgba(148, 163, 184, 0.5)")};
  background: ${(p) => (p.$locked ? "rgba(248, 250, 252, 0.6)" : "#fff")};
  border-radius: 10px;
  padding: 7px 9px;
  font-size: 0.78rem;
`;

const Select = styled.select`
  border: 1px solid rgba(148, 163, 184, 0.5);
  border-radius: 10px;
  padding: 7px 9px;
  font-size: 0.78rem;
`;

const Textarea = styled.textarea`
  border: 1px solid rgba(148, 163, 184, 0.5);
  border-radius: 10px;
  padding: 7px 9px;
  font-size: 0.78rem;
  min-height: 80px;
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
`;

const SaveBar = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const Button = styled.button`
  background: #0f172a;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 7px 14px;
  font-size: 0.78rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

// función helper para normalizar lo que vuelve del backend
function normalizeFromApi(j = {}) {
  return {
    ...EMPTY,
    ...j,
    aceptaTerminos: !!j.aceptaTerminos,
    aceptaPromos: !!j.aceptaPromos,
  };
}

export default function ClientePage() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lockedFields, setLockedFields] = useState([]);

  const isLocked = (name) => lockedFields.includes(name);

  // cargar primero de localStorage, luego de API
  useEffect(() => {
    let cancelled = false;

    // 1) localStorage
    let local = null;
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          local = JSON.parse(raw);
        } catch {
          local = null;
        }
      }
    }

    // mostrar lo local primero
    if (local && !cancelled) {
      const localNorm = normalizeFromApi(local);
      setData(localNorm);
      const frozen = FROZEN_FIELDS.filter((f) => localNorm[f]);
      setLockedFields(frozen);
    }

    // 2) API
    (async () => {
      try {
        const r = await fetch("/api/cliente", { cache: "no-store" });
        // si tira 401/500 → no rompas el form
        if (!r.ok) throw new Error(await r.text());

        const j = await r.json();
        if (cancelled) return;

        // si la API devolvió datos reales (no __anonymous) los usamos
        if (j && !j.__anonymous && Object.keys(j).length > 0) {
          const fromApi = normalizeFromApi(j);
          setData(fromApi);
          const frozen = FROZEN_FIELDS.filter((f) => fromApi[f]);
          setLockedFields(frozen);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fromApi));
          }
        } else if (!local) {
          // no había local y API no tiene nada → mostramos vacío
          setData(EMPTY);
        }
      } catch (e) {
        // si hay local, no muestres error
        if (!cancelled && !local) {
          setError(typeof e === "string" ? e : e?.message || "No se pudo cargar el cliente");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // guardar en localStorage cada cambio
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    // si es un campo básico congelado → no lo toques
    if (isLocked(name)) return;
    setData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/cliente", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const text = await r.text(); // leemos SIEMPRE
      if (!r.ok) {
        // si el backend devolvió JSON con error, tratá de mostrarlo
        let msg = "No se pudo guardar";
        try {
          const parsed = JSON.parse(text);
          msg = parsed?.error || msg;
        } catch {
          msg = text || msg;
        }
        throw new Error(msg);
      }

      // si llegó acá, el backend devolvió algo (JSON o lo que sea)
      let saved = null;
      try {
        saved = JSON.parse(text);
      } catch {
        saved = null;
      }

      // congelo básicos
      const frozen = FROZEN_FIELDS.filter((f) => data[f]);
      setLockedFields(frozen);

      // si el backend devolvió info real, la guardo en local
      const newData = saved ? normalizeFromApi(saved) : data;
      setData(newData);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditBasics = () => {
    setLockedFields([]);
  };

  if (loading) {
    return <Page>Cargando ficha de cliente…</Page>;
  }

  return (
    <Page>
      <HeadRow>
        <Title>Ficha del cliente</Title>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {lockedFields.length > 0 ? <Status>Datos básicos fijados</Status> : null}
          {lockedFields.length > 0 ? (
            <EditBtn onClick={handleEditBasics} type="button">
              Editar básicos
            </EditBtn>
          ) : null}
        </div>
      </HeadRow>

      {error ? <ErrorBox>{error}</ErrorBox> : null}

      <Form onSubmit={onSubmit}>
        <Card>
          <CardTitle>🧍 Datos del cliente</CardTitle>
          <Grid>
            <Field>
              Nombre completo
              <Input
                name="nombreCompleto"
                value={data.nombreCompleto}
                onChange={onChange}
                $locked={isLocked("nombreCompleto")}
                disabled={isLocked("nombreCompleto")}
                required
              />
            </Field>
            <Field>
              Email
              <Input
                name="email"
                type="email"
                value={data.email}
                onChange={onChange}
                $locked={isLocked("email")}
                disabled={isLocked("email")}
                required
              />
            </Field>
            <Field>
              Teléfono
              <Input
                name="telefono"
                value={data.telefono}
                onChange={onChange}
                $locked={isLocked("telefono")}
                disabled={isLocked("telefono")}
              />
            </Field>
            <Field>
              DNI / CUIT
              <Input
                name="documento"
                value={data.documento}
                onChange={onChange}
                $locked={isLocked("documento")}
                disabled={isLocked("documento")}
              />
            </Field>
          </Grid>
        </Card>

        <Card>
          <CardTitle>🏠 Dirección de envío</CardTitle>
          <Grid $cols={3}>
            <Field style={{ gridColumn: "span 2" }}>
              Calle
              <Input name="calle" value={data.calle} onChange={onChange} />
            </Field>
            <Field>
              Número
              <Input name="numero" value={data.numero} onChange={onChange} />
            </Field>
            <Field>
              Piso / Dpto / Ref.
              <Input name="piso" value={data.piso} onChange={onChange} />
            </Field>
            <Field>
              Código postal
              <Input
                name="codigoPostal"
                value={data.codigoPostal}
                onChange={onChange}
              />
            </Field>
            <Field>
              Ciudad
              <Input name="ciudad" value={data.ciudad} onChange={onChange} />
            </Field>
            <Field>
              Provincia / Estado
              <Input name="provincia" value={data.provincia} onChange={onChange} />
            </Field>
            <Field>
              País
              <Input name="pais" value={data.pais} onChange={onChange} />
            </Field>
            <Field>
              Tipo de envío
              <Select name="tipoEnvio" value={data.tipoEnvio} onChange={onChange}>
                <option value="">-- seleccionar --</option>
                <option value="domicilio">Domicilio</option>
                <option value="sucursal">Retiro en sucursal</option>
                <option value="tienda">Retiro en tienda</option>
              </Select>
            </Field>
          </Grid>
          <Field>
            Comentarios adicionales
            <Textarea
              name="comentariosEnvio"
              value={data.comentariosEnvio}
              onChange={onChange}
            />
          </Field>
        </Card>

        <Card>
          <CardTitle>💳 Información de pago</CardTitle>
          <Grid>
            <Field>
              Método de pago
              <Select name="metodoPago" value={data.metodoPago} onChange={onChange}>
                <option value="">-- seleccionar --</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="mercado_pago">Mercado Pago</option>
              </Select>
            </Field>
            <Field>
              Dirección de facturación
              <Input
                name="direccionFacturacion"
                value={data.direccionFacturacion}
                onChange={onChange}
              />
            </Field>
            <Field>
              Titular de la tarjeta
              <Input
                name="titularTarjeta"
                value={data.titularTarjeta}
                onChange={onChange}
              />
            </Field>
            <Field>
              Número de tarjeta
              <Input
                name="numeroTarjeta"
                value={data.numeroTarjeta}
                onChange={onChange}
                inputMode="numeric"
              />
            </Field>
            <Field>
              Vencimiento (MM/AA)
              <Input
                name="vencimientoTarjeta"
                value={data.vencimientoTarjeta}
                onChange={onChange}
              />
            </Field>
            <Field>
              CVV
              <Input
                name="cvvTarjeta"
                value={data.cvvTarjeta}
                onChange={onChange}
                inputMode="numeric"
              />
            </Field>
            <Field>
              Comprobante de transferencia
              <Input
                name="comprobanteTransferencia"
                value={data.comprobanteTransferencia}
                onChange={onChange}
              />
            </Field>
          </Grid>
        </Card>

        <Card>
          <CardTitle>🧾 Facturación</CardTitle>
          <Grid>
            <Field>
              Tipo de factura
              <Select name="tipoFactura" value={data.tipoFactura} onChange={onChange}>
                <option value="">-- seleccionar --</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="CF">Consumidor final</option>
              </Select>
            </Field>
            <Field>
              Razón social
              <Input name="razonSocial" value={data.razonSocial} onChange={onChange} />
            </Field>
            <Field>
              CUIT / CUIL
              <Input name="cuit" value={data.cuit} onChange={onChange} />
            </Field>
            <Field>
              Dirección fiscal
              <Input
                name="direccionFiscal"
                value={data.direccionFiscal}
                onChange={onChange}
              />
            </Field>
          </Grid>
        </Card>

        <Card>
          <CardTitle>✅ Confirmación</CardTitle>
          <CheckRow>
            <input
              type="checkbox"
              name="aceptaTerminos"
              checked={data.aceptaTerminos}
              onChange={onChange}
            />
            Acepto los términos y condiciones
          </CheckRow>
          <CheckRow>
            <input
              type="checkbox"
              name="aceptaPromos"
              checked={data.aceptaPromos}
              onChange={onChange}
            />
            Deseo recibir novedades y promociones
          </CheckRow>
        </Card>

        <SaveBar>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Confirmar y guardar"}
          </Button>
        </SaveBar>
      </Form>
    </Page>
  );
}
