// app/carrito/page.jsx
"use client";

import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { useEffect, useState } from "react";
import styled from "styled-components";

/* ===== styled components ===== */
const Main = styled.main`
  max-width: 1100px;
  margin: 0 auto;
  padding: 12px;
`;

const Header = styled.header`
  margin-bottom: 12px;

  h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
  }
`;

const CartGrid = styled.section`
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 10px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const Table = styled.div`
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 0.55fr 0.55fr 0.55fr 0.18fr;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid var(--border);
  align-items: center;

  &:first-child {
    border-top: none;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: auto;
  }
`;

const ColProduct = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Thumb = styled.img`
  width: 44px;
  height: 44px;
  object-fit: contain;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 7px;
`;

const Info = styled.div`
  .title {
    font-weight: 700;
    font-size: 12px;
    line-height: 1.2;
  }
  .meta {
    color: var(--muted);
    font-size: 10.5px;
  }
`;

const QtyBox = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  input {
    width: 38px;
    height: 22px;
    border: 1px solid var(--border);
    border-radius: 7px;
    text-align: center;
    background: #fff;
    font-size: 12px;
  }
`;

const Summary = styled.aside`
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  height: max-content;
  position: sticky;
  top: 72px;
`;

const SumRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-top: 1px dashed var(--border);
  font-size: 12px;

  &:first-child {
    border-top: none;
  }
`;

const SumActions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
`;

const LinkBack = styled(Link)`
  display: inline-block;
  margin-top: 6px;
  color: var(--primary);
  text-decoration: none;
  font-size: 12px;
`;

const Btn = styled.button`
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
  transition: transform 0.08s, box-shadow 0.12s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  &.danger {
    border-color: #ffd5d5;
    color: var(--danger);
  }
`;

const BtnPrimary = styled(Btn)`
  background: var(--primary);
  color: #fff;
  border-color: transparent;

  &:hover {
    background: var(--primary-600);
  }
`;

/* ===== componente ===== */
export default function CarritoPage() {
  const { items, updateQty, removeItem, clear, total, fmt } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const inc = (id) =>
    updateQty(id, (items.find((i) => i.id === id)?.qty || 1) + 1);
  const dec = (id) =>
    updateQty(id, Math.max(1, (items.find((i) => i.id === id)?.qty || 1) - 1));

  if (!mounted) {
    return (
      <Main>
        <Header><h1>Carrito</h1></Header>
        <p>Cargando carrito…</p>
        <Link href="/" className="btn btn-primary">Ir al catálogo</Link>
      </Main>
    );
  }

  if (items.length === 0) {
    return (
      <Main>
        <Header><h1>Carrito</h1></Header>
        <p>No hay productos en el carrito.</p>
        <Link href="/" className="btn btn-primary">Ir al catálogo</Link>
      </Main>
    );
  }

  return (
    <Main>
      <Header><h1>Carrito</h1></Header>

      <CartGrid>
        <Table>
          {items.map((it) => (
            <Row key={it.id}>
              <ColProduct>
                <Thumb src={it.imagen} alt={it.nombre} />
                <Info>
                  <div className="title">{it.nombre}</div>
                  <div className="meta">
                    Código: {it.codigo_flexxus} · {it.marca} · {it.categoria}
                  </div>
                </Info>
              </ColProduct>

              <div>${fmt(it.precio)}</div>

              <div>
                <QtyBox>
                  <Btn onClick={() => dec(it.id)} aria-label="Quitar uno">−</Btn>
                  <input
                    type="number"
                    min="1"
                    value={it.qty}
                    onChange={(e) =>
                      updateQty(it.id, Math.max(1, Number(e.target.value) || 1))
                    }
                  />
                  <Btn onClick={() => inc(it.id)} aria-label="Agregar uno">+</Btn>
                </QtyBox>
              </div>

              <div>${fmt(it.qty * it.precio)}</div>

              <div>
                <Btn className="danger" onClick={() => removeItem(it.id)} aria-label="Eliminar">×</Btn>
              </div>
            </Row>
          ))}
        </Table>

        <Summary>
          <SumRow>
            <span>Total</span>
            <strong suppressHydrationWarning>${fmt(total)}</strong>
          </SumRow>
          <SumActions>
            <Btn onClick={clear}>Vaciar</Btn>
            <Link href="/checkout" passHref legacyBehavior>
              <BtnPrimary as="a">Continuar</BtnPrimary>
            </Link>
          </SumActions>
          <LinkBack href="/">← Seguir comprando</LinkBack>
        </Summary>
      </CartGrid>
    </Main>
  );
}
