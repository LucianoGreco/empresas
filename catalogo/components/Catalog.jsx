// components/Catalog.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import ProductCard from "@/components/ProductCard";

/* ========= utils ========= */
function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PER_PAGE = 20;

/* ========= styled components ========= */
const Container = styled.main`
  max-width: 1100px;
  margin: 0 auto;
  padding: 12px;
`;

const Head = styled.header`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;

  h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`;

const Searchbar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
  min-width: 280px;
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
`;

const SearchInput = styled.input`
  width: 100%;
  height: 28px;
  padding: 0 30px 0 28px;
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

const SearchIcon = styled.span`
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.6;
  font-size: 11px;
  pointer-events: none;
`;

const SearchClear = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  line-height: 1;
  font-size: 14px;
`;

const SearchCount = styled.div`
  color: var(--muted);
  white-space: nowrap;
  font-size: 11px;
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 6px;
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

  &[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: var(--shadow-sm);
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

const BtnGhost = styled(Btn)`
  background: #fff;
`;

const SectionGrid = styled.section`
  display: grid;
  gap: var(--grid-gap);
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));

  @media (min-width: 760px) and (max-width: 1024px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const SectionList = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Pagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 0;
`;

const PageStatus = styled.span`
  color: var(--muted);
`;

/* ========= componente ========= */
export default function Catalog({ products, userRole = "user" }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef(null);
  const [view, setView] = useState("grid"); // "grid" | "list"
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  const [data, setData] = useState(() => products || []);
  useEffect(() => setData(products || []), [products]);

  useEffect(() => {
    setMounted(true);
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/productos", { cache: "no-store" });
        if (!res.ok) throw new Error("fetch productos");
        const next = await res.json();
        if (Array.isArray(next) && JSON.stringify(next) !== JSON.stringify(data)) {
          setData(next);
        }
      } catch {}
      if (!stop) setTimeout(tick, 2000);
    };
    tick();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" || (e.ctrlKey && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const indexed = useMemo(
    () =>
      (data || []).map((p) => ({
        p,
        haystack: norm(
          [p.codigo_flexxus, p.nombre_descripcion, p.marca, p.categoria].join(" ")
        ),
      })),
    [data]
  );

  const tokens = useMemo(() => norm(debounced).split(" ").filter(Boolean), [debounced]);

  const filtered = useMemo(() => {
    if (tokens.length === 0) return data || [];
    return indexed.filter((row) => tokens.every((t) => row.haystack.includes(t))).map((row) => row.p);
  }, [indexed, tokens, data]);

  useEffect(() => setPage(1), [debounced, view]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  const goto = (p) => setPage(Math.min(totalPages, Math.max(1, p)));

  return (
    <Container>
      <Head>
        <h1>Catálogo</h1>

        <Toolbar>
          <Searchbar>
            <SearchWrap>
              <SearchIcon aria-hidden>🔎</SearchIcon>
              <SearchInput
                ref={inputRef}
                type="text"
                inputMode="search"
                placeholder="Buscar por código, nombre, marca o categoría (atajo: /)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Buscar"
              />
              {q && (
                <SearchClear onClick={() => setQ("")} aria-label="Limpiar búsqueda">
                  ×
                </SearchClear>
              )}
            </SearchWrap>

            <SearchCount suppressHydrationWarning>
              {mounted ? total.toLocaleString("es-AR") : 0} resultados
            </SearchCount>
          </Searchbar>

          <ViewToggle role="tablist" aria-label="Cambiar vista">
            {view === "grid" ? (
              <BtnPrimary onClick={() => setView("grid")} role="tab" aria-selected title="Vista cuadriculada">
                ⬛
              </BtnPrimary>
            ) : (
              <BtnGhost onClick={() => setView("grid")} role="tab" aria-selected={false} title="Vista cuadriculada">
                ⬛
              </BtnGhost>
            )}
            {view === "list" ? (
              <BtnPrimary onClick={() => setView("list")} role="tab" aria-selected title="Vista de lista">
                ☰
              </BtnPrimary>
            ) : (
              <BtnGhost onClick={() => setView("list")} role="tab" aria-selected={false} title="Vista de lista">
                ☰
              </BtnGhost>
            )}
          </ViewToggle>
          
        </Toolbar>
      </Head>

      {view === "grid" ? (
        <SectionGrid>
          {pageItems.map((p) => (
            <ProductCard key={p.id} product={p} viewMode="grid" userRole={userRole} />
          ))}
        </SectionGrid>
      ) : (
        <SectionList>
          {pageItems.map((p) => (
            <ProductCard key={p.id} product={p} viewMode="list" userRole={userRole} />
          ))}
        </SectionList>
      )}

      <Pagination aria-label="Paginación">
        <BtnGhost onClick={() => goto(page - 1)} disabled={page <= 1}>
          ← Anterior
        </BtnGhost>

        <PageStatus suppressHydrationWarning>
          Página {mounted ? page : 1} de {mounted ? totalPages : 1}
        </PageStatus>

        <BtnGhost onClick={() => goto(page + 1)} disabled={page >= totalPages}>
          Siguiente →
        </BtnGhost>
      </Pagination>
    </Container>
  );
}
