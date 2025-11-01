// components/ProductCard.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import { useCart } from "@/components/CartContext";

/* ===== styled building blocks ===== */
const Card = styled.article`
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.08s, box-shadow 0.12s;
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
`;

const ImgButton = styled.button`
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  width: 100%;
  cursor: zoom-in;
`;

const CardMedia = styled.div`
  position: relative;
  aspect-ratio: 1/1;
  width: 100%;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
`;

const CardTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  margin: 6px 2px;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 28px;
`;

const CardRows = styled.div`
  border-top: 1px dashed var(--border);
  padding-top: 4px;
`;
const CardRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  padding: 3px 2px;
  border-top: 1px dashed var(--border);
  &:first-child {
    border-top: none;
  }
`;
const K = styled.span`
  color: var(--muted);
  font-size: 10.5px;
`;
const V = styled.span`
  color: var(--text);
  text-align: right;
  font-size: 10.5px;
`;
const PriceV = styled(V)`
  font-weight: 900;
`;

const Actions = styled.div`
  margin-top: 6px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: center;
  @media (min-width: 760px) and (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 26px;
  padding: 0 8px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  font-size: 12px;
  line-height: 1;
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: var(--shadow-sm);
  }
`;
const ButtonPrimary = styled(Button)`
  background: var(--primary);
  color: #fff;
  border-color: transparent;
  &:hover {
    background: var(--primary-600);
  }
`;
const ButtonGhost = styled(Button)`
  background: #fff;
`;

const Qty = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;
const QtyInput = styled.input`
  width: 38px;
  height: 22px;
  border: 1px solid var(--border);
  border-radius: 7px;
  text-align: center;
  background: #fff;
  font-size: 12px;
`;

const TextInput = styled.input`
  width: 100%;
  height: 28px;
  padding: 0 10px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  outline: none;
  font-size: 12px;
  &:focus {
    border-color: #c9d6e5;
    box-shadow: 0 0 0 3px rgba(52, 120, 246, 0.08);
  }
`;

const RowGrid3 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
`;
const RowFlexEnd = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
`;
const EditorWrap = styled.div`
  display: grid;
  gap: 6px;
`;

/* ===== Lista ===== */
const ListItem = styled.article`
  display: grid;
  grid-template-columns: 64px 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
`;
const ListThumbBtn = styled.button`
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  cursor: zoom-in;
`;
const ListThumb = styled.img`
  width: 64px;
  height: 64px;
  object-fit: contain;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 7px;
  display: block;
`;
const ListMain = styled.div`
  min-width: 0;
`;
const ListTitle = styled.h2`
  margin: 0 0 4px 0;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: -0.01em;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
const ListMeta = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto 1fr auto 1fr;
  gap: 6px 10px;
  align-items: center;
`;
const ListPrice = styled.div`
  font-weight: 900;
  white-space: nowrap;
  padding: 0 8px;
`;
const ListActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

/* ===== Modal ===== */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  z-index: 1000;
`;
const ModalPanel = styled.div`
  position: relative;
  width: 100%;
  max-width: 620px;
  max-height: var(--modal-max-h);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;
const ModalHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
`;
const ModalTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: -0.01em;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
const ModalClose = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  color: #111827;
  font-size: 16px;
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: pointer;
`;
const ModalContent = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
  height: calc(var(--modal-max-h) - var(--modal-header-h));
  min-height: 0;
  align-items: stretch;
  overflow: hidden;
  @media (max-width: 700px) {
    flex-direction: column;
  }
`;
const ModalLeft = styled.div`
  flex: 0 1 48%;
  min-width: 220px;
  height: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  @media (max-width: 700px) {
    min-width: 0;
    height: 38vh;
  }
`;
const ModalImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
`;
const ModalRight = styled.div`
  flex: 0 1 52%;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
  min-width: 240px;
  min-height: 0;
  @media (max-width: 700px) {
    min-width: 0;
  }
`;
const InfoScroll = styled.div`
  min-height: 0;
  overflow: auto;
  padding: 8px;
  scrollbar-gutter: stable both-edges;
  padding-bottom: 10px;
`;
const InfoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;
const InfoRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-top: 1px dashed var(--border);
  &:first-of-type {
    border-top: none;
  }
`;
const IK = styled.span`
  color: var(--muted);
  font-size: 11px;
`;
const IV = styled.span`
  color: var(--text);
  text-align: right;
  word-break: break-word;
  font-size: 11px;
`;
const ModalActions = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #fff 14px);
  border-top: 1px dashed var(--border);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: center;
  padding: 8px 10px 6px;
  padding-bottom: max(6px, env(safe-area-inset-bottom));
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

/* ===== component ===== */
export default function ProductCard({ product, viewMode = "grid" }) {
  const placeholder = "/imagenes/sin_imagen.png";
  const [src, setSrc] = useState(product?.imagen || placeholder);
  useEffect(() => setSrc(product?.imagen || placeholder), [product?.imagen]);

  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [edit, setEdit] = useState(false);

  const [form, setForm] = useState({
    nombre_descripcion: product?.nombre_descripcion || "",
    venta: Number(product?.venta ?? product?.precio_venta ?? 0),
    mayorista: Number(product?.mayorista ?? 0),
    inventario: Number(product?.inventario ?? 0),
    marca: product?.marca || "",
    categoria: product?.categoria || "",
    imagen: product?.imagen || "",
    moneda: product?.moneda || "ARS",
  });

  useEffect(() => {
    fetch("/api/admin/whoami", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setIsAdmin(!!j?.admin))
      .catch(() => setIsAdmin(false));
  }, []);

  const openModal = () => setOpen(true);
  const close = useCallback(() => setOpen(false), []);
  const onErr = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = placeholder;
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    if (open) {
      window.addEventListener("keydown", onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
      };
    }
  }, [open, close]);

  const fmt = (n) => Number(n ?? 0).toLocaleString("es-AR");
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => q + 1);
  const onChangeQty = (e) => setQty(Math.max(1, Number(e.target.value) || 1));

  // CAMBIO: no reseteo qty a 1
  const onAdd = () => {
    addItem(product, qty);
  };

  const saveInline = async () => {
    const payload = {
      codigo_flexxus: product?.codigo_flexxus,
      changes: {
        nombre_descripcion: form.nombre_descripcion,
        venta: Number(form.venta),
        mayorista: Number(form.mayorista),
        inventario: Number(form.inventario),
        marca: form.marca,
        categoria: form.categoria,
        imagen: form.imagen,
        moneda: form.moneda,
      },
    };
    const res = await fetch("/api/admin/productos/update", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEdit(false);
      const j = await res.json();
      setSrc(j?.item?.imagen || placeholder);
    } else {
      alert("No se pudo guardar");
    }
  };

  const Editor = () => (
    <EditorWrap>
      <TextInput
        value={form.nombre_descripcion}
        onChange={(e) =>
          setForm((f) => ({ ...f, nombre_descripcion: e.target.value }))
        }
        placeholder="Nombre / descripción"
      />
      <RowGrid3>
        <TextInput
          type="number"
          value={form.venta}
          onChange={(e) =>
            setForm((f) => ({ ...f, venta: e.target.value }))
          }
          placeholder="Venta"
        />
        <TextInput
          type="number"
          value={form.mayorista}
          onChange={(e) =>
            setForm((f) => ({ ...f, mayorista: e.target.value }))
          }
          placeholder="Mayorista"
        />
        <TextInput
          type="number"
          value={form.inventario}
          onChange={(e) =>
            setForm((f) => ({ ...f, inventario: e.target.value }))
          }
          placeholder="Inventario"
        />
      </RowGrid3>
      <RowGrid3>
        <TextInput
          value={form.marca}
          onChange={(e) =>
            setForm((f) => ({ ...f, marca: e.target.value }))
          }
          placeholder="Marca"
        />
        <TextInput
          value={form.categoria}
          onChange={(e) =>
            setForm((f) => ({ ...f, categoria: e.target.value }))
          }
          placeholder="Categoría"
        />
        <TextInput
          value={form.moneda}
          onChange={(e) =>
            setForm((f) => ({ ...f, moneda: e.target.value }))
          }
          placeholder="Moneda"
        />
      </RowGrid3>
      <TextInput
        value={form.imagen}
        onChange={(e) =>
          setForm((f) => ({ ...f, imagen: e.target.value }))
        }
        placeholder="Imagen (/imagenes/... o URL)"
      />
      <RowFlexEnd>
        <ButtonGhost onClick={() => setEdit(false)}>Cancelar</ButtonGhost>
        <ButtonPrimary onClick={saveInline}>Guardar</ButtonPrimary>
      </RowFlexEnd>
    </EditorWrap>
  );

  const PriceCell = () => (
    <CardRow>
      <K>Venta</K>
      <PriceV>
        $
        {fmt(
          edit ? form.venta : product?.venta ?? product?.precio_venta
        )}
      </PriceV>
    </CardRow>
  );

  /* ===== LIST VIEW ===== */
  if (viewMode === "list") {
    return (
      <>
        <ListItem>
          <ListThumbBtn
            onClick={openModal}
            aria-label="Ver imagen e información"
          >
            <ListThumb
              src={src}
              alt={product?.nombre_descripcion || "Producto"}
              onError={onErr}
              loading="lazy"
            />
          </ListThumbBtn>

          <ListMain>
            <ListTitle title={product?.nombre_descripcion || "Sin nombre"}>
              {edit ? (
                <TextInput
                  value={form.nombre_descripcion}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      nombre_descripcion: e.target.value,
                    }))
                  }
                />
              ) : (
                product?.nombre_descripcion || "Sin nombre"
              )}
            </ListTitle>

            <ListMeta>
              <K>Código</K>
              <V>{product?.codigo_flexxus || ""}</V>
              <K>Marca</K>
              <V>
                {edit ? (
                  <TextInput
                    value={form.marca}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, marca: e.target.value }))
                    }
                  />
                ) : (
                  product?.marca || ""
                )}
              </V>
              <K>Cat.</K>
              <V>
                {edit ? (
                  <TextInput
                    value={form.categoria}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, categoria: e.target.value }))
                    }
                  />
                ) : (
                  product?.categoria || ""
                )}
              </V>
            </ListMeta>
          </ListMain>

          <ListPrice>
            {edit ? (
              <TextInput
                type="number"
                value={form.venta}
                onChange={(e) =>
                  setForm((f) => ({ ...f, venta: e.target.value }))
                }
              />
            ) : (
              <>${fmt(product?.venta ?? product?.precio_venta)}</>
            )}
          </ListPrice>

          <ListActions>
            {isAdmin && !edit && (
              <ButtonGhost onClick={() => setEdit(true)}>Editar</ButtonGhost>
            )}
            {isAdmin && edit && (
              <ButtonPrimary onClick={saveInline}>Guardar</ButtonPrimary>
            )}
            {isAdmin && edit && (
              <ButtonGhost onClick={() => setEdit(false)}>
                Cancelar
              </ButtonGhost>
            )}
            {!edit && (
              <>
                <Qty>
                  <ButtonGhost onClick={dec} aria-label="Quitar uno">
                    −
                  </ButtonGhost>
                  <QtyInput
                    type="number"
                    min="1"
                    value={qty}
                    onChange={onChangeQty}
                  />
                  <ButtonGhost onClick={inc} aria-label="Agregar uno">
                    +
                  </ButtonGhost>
                </Qty>
                <ButtonPrimary onClick={onAdd}>Agregar</ButtonPrimary>
              </>
            )}
          </ListActions>
        </ListItem>

        {open && (
          <ModalOverlay onClick={close}>
            <ModalPanel
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <ModalTitle>
                  {product?.nombre_descripcion || "Sin nombre"}
                </ModalTitle>
                <ModalClose onClick={close} aria-label="Cerrar">
                  ×
                </ModalClose>
              </ModalHeader>

              <ModalContent>
                <ModalLeft>
                  <ModalImage
                    src={src}
                    alt={product?.nombre_descripcion || "Producto"}
                    onError={onErr}
                  />
                </ModalLeft>

                <ModalRight>
                  {!edit ? (
                    <InfoScroll>
                      <InfoGrid>
                        <InfoRow>
                          <IK>Código</IK>
                          <IV>{product?.codigo_flexxus || ""}</IV>
                        </InfoRow>
                        <InfoRow>
                          <IK>Marca</IK>
                          <IV>{product?.marca || ""}</IV>
                        </InfoRow>
                        <InfoRow>
                          <IK>Categoría</IK>
                          <IV>{product?.categoria || ""}</IV>
                        </InfoRow>
                        <InfoRow>
                          <IK>Venta</IK>
                          <IV>
                            ${fmt(product?.venta ?? product?.precio_venta)}
                          </IV>
                        </InfoRow>
                      </InfoGrid>
                    </InfoScroll>
                  ) : (
                    <InfoScroll>
                      <Editor />
                    </InfoScroll>
                  )}

                  <ModalActions>
                    {!edit && (
                      <ButtonPrimary onClick={() => addItem(product, 1)}>
                        Agregar al carrito
                      </ButtonPrimary>
                    )}
                    {isAdmin && !edit && (
                      <ButtonGhost onClick={() => setEdit(true)}>
                        Editar
                      </ButtonGhost>
                    )}
                    {isAdmin && edit && (
                      <>
                        <ButtonPrimary onClick={saveInline}>
                          Guardar
                        </ButtonPrimary>
                        <ButtonGhost onClick={() => setEdit(false)}>
                          Cancelar
                        </ButtonGhost>
                      </>
                    )}
                  </ModalActions>
                </ModalRight>
              </ModalContent>
            </ModalPanel>
          </ModalOverlay>
        )}
      </>
    );
  }

  /* ===== GRID VIEW ===== */
  return (
    <>
      <Card>
        <ImgButton onClick={openModal} aria-label="Ver imagen e información">
          <CardMedia>
            <CardImage
              src={src}
              alt={product?.nombre_descripcion || "Producto"}
              onError={onErr}
              loading="lazy"
            />
          </CardMedia>
        </ImgButton>

        <CardTitle title={product?.nombre_descripcion || "Sin nombre"}>
          {edit ? (
            <TextInput
              value={form.nombre_descripcion}
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre_descripcion: e.target.value }))
              }
            />
          ) : (
            product?.nombre_descripcion || "Sin nombre"
          )}
        </CardTitle>

        <CardRows>
          <CardRow>
            <K>Código</K>
            <V>{product?.codigo_flexxus || ""}</V>
          </CardRow>
          <CardRow>
            <K>Marca</K>
            <V>
              {edit ? (
                <TextInput
                  value={form.marca}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, marca: e.target.value }))
                  }
                />
              ) : (
                product?.marca || ""
              )}
            </V>
          </CardRow>
          <CardRow>
            <K>Categoría</K>
            <V>
              {edit ? (
                <TextInput
                  value={form.categoria}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoria: e.target.value }))
                  }
                />
              ) : (
                product?.categoria || ""
              )}
            </V>
          </CardRow>
          {PriceCell()}
        </CardRows>

        <Actions>
          {isAdmin && !edit && (
            <ButtonGhost onClick={() => setEdit(true)}>Editar</ButtonGhost>
          )}
          {isAdmin && edit && (
            <>
              <ButtonPrimary onClick={saveInline}>Guardar</ButtonPrimary>
              <ButtonGhost onClick={() => setEdit(false)}>
                Cancelar
              </ButtonGhost>
            </>
          )}
          {!edit && (
            <>
              <Qty>
                <ButtonGhost onClick={dec} aria-label="Quitar uno">
                  −
                </ButtonGhost>
                <QtyInput
                  type="number"
                  min="1"
                  value={qty}
                  onChange={onChangeQty}
                />
                <ButtonGhost onClick={inc} aria-label="Agregar uno">
                  +
                </ButtonGhost>
              </Qty>
              <ButtonPrimary onClick={onAdd}>Agregar al carrito</ButtonPrimary>
            </>
          )}
        </Actions>
      </Card>

      {open && (
        <ModalOverlay onClick={close}>
          <ModalPanel
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalTitle>
                {product?.nombre_descripcion || "Sin nombre"}
              </ModalTitle>
              <ModalClose onClick={close} aria-label="Cerrar">
                ×
              </ModalClose>
            </ModalHeader>

            <ModalContent>
              <ModalLeft>
                <ModalImage
                  src={src}
                  alt={product?.nombre_descripcion || "Producto"}
                  onError={onErr}
                />
              </ModalLeft>

              <ModalRight>
                {!edit ? (
                  <InfoScroll>
                    <InfoGrid>
                      <InfoRow>
                        <IK>Código</IK>
                        <IV>{product?.codigo_flexxus || ""}</IV>
                      </InfoRow>
                      <InfoRow>
                        <IK>Marca</IK>
                        <IV>{product?.marca || ""}</IV>
                      </InfoRow>
                      <InfoRow>
                        <IK>Categoría</IK>
                        <IV>{product?.categoria || ""}</IV>
                      </InfoRow>
                      <InfoRow>
                        <IK>Venta</IK>
                        <IV>
                          ${fmt(product?.venta ?? product?.precio_venta)}
                        </IV>
                      </InfoRow>
                    </InfoGrid>
                  </InfoScroll>
                ) : (
                  <InfoScroll>
                    <Editor />
                  </InfoScroll>
                )}

                <ModalActions>
                  {!edit && (
                    <ButtonPrimary onClick={() => addItem(product, 1)}>
                      Agregar al carrito
                    </ButtonPrimary>
                  )}
                  {isAdmin && !edit && (
                    <ButtonGhost onClick={() => setEdit(true)}>
                      Editar
                    </ButtonGhost>
                  )}
                  {isAdmin && edit && (
                    <>
                      <ButtonPrimary onClick={saveInline}>
                        Guardar
                      </ButtonPrimary>
                      <ButtonGhost onClick={() => setEdit(false)}>
                        Cancelar
                      </ButtonGhost>
                    </>
                  )}
                </ModalActions>
              </ModalRight>
            </ModalContent>
          </ModalPanel>
        </ModalOverlay>
      )}
    </>
  );
}
