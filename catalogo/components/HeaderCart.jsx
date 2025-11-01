"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import styled from "styled-components";
import { useCart } from "@/components/CartContext";

/* ========== styled-components ========== */
const Topbar = styled.header`
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
`;

const TopbarInner = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
  max-width: 1100px;
  margin: 0 auto;
`;

const BrandWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Logo = styled.img`
  width: 32px;
  height: 32px;
  object-fit: contain;
`;

const BrandText = styled(Link)`
  font-weight: 600;
  color: #111;
  text-decoration: none;
`;

const NavLeft = styled.nav`
  display: flex;
  gap: 8px;
  margin-left: 16px;
  flex-wrap: wrap;
`;

const NavRight = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
  align-items: center;
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: #111;
  border: 1px solid #e5e7eb;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12.5px;

  &:hover,
  &.active {
    background: #f8fafc;
  }
`;

const UserPill = styled.span`
  padding: 5px 10px;
  border: 1px dashed #e5e7eb;
  border-radius: 999px;
  color: #111;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
`;

const Btn = styled.button`
  border: 1px solid #e5e7eb;
  padding: 5px 10px;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 12.5px;

  &:hover {
    background: #f8fafc;
  }
`;

const CartBtn = styled(Link)`
  position: relative;
  text-decoration: none;
  color: #111;
  border: 1px solid #e5e7eb;
  padding: 5px 10px 5px 30px;
  border-radius: 8px;
  font-size: 12.5px;
  background: #fff;

  &:before {
    content: "🛒";
    position: absolute;
    left: 8px;
    top: 4px;
  }
`;

const CartBadge = styled.span`
  position: absolute;
  right: -6px;
  top: -6px;
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  font-size: 10px;
  padding: 1px 5px;
  line-height: 1;
`;

/* ========== componente ========== */
export default function HeaderCart() {
  const [me, setMe] = useState(null); // { id, email, name, role, isActive } | null
  const [isAdminWhoami, setIsAdminWhoami] = useState(false); // admin por token/servidor
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  // carrito
  const { count, clear } = useCart();

  // Carga estado sesión + admin (revalida al cambiar de ruta)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rMe = await fetch("/api/auth/me", { cache: "no-store" });
        const jMe = await rMe.json().catch(() => ({}));
        if (!alive) return;
        setMe(jMe?.user || null);

        const rAdm = await fetch("/api/admin/whoami", { cache: "no-store" });
        const jAdm = await rAdm.json().catch(() => ({}));
        if (!alive) return;
        setIsAdminWhoami(!!jAdm?.admin);
      } catch {
        if (!alive) return;
        setMe(null);
        setIsAdminWhoami(false);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  // marcar montado (para no mostrar badge desactualizado)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2) si vengo de /admin/import → voy a /  => forzar refresh
  useEffect(() => {
    const prev = prevPathRef.current;
    const current = pathname;
    // si antes estaba en /admin/import y ahora estoy en /
    if (prev === "/admin/import" && current === "/") {
      // forzá recarga total para que tome el JSON nuevo
      // (no usamos router.refresh() porque a veces queda el fetch cacheado por otro componente)
      window.location.reload();
    }
    prevPathRef.current = current;
  }, [pathname]);

  const isLogged = !!me;
  const isAdmin = isLogged && ((me?.role === "admin") || isAdminWhoami);

  const handleLogout = async () => {
    // optimista
    setMe(null);
    setIsAdminWhoami(false);
    setLoading(false);
    // limpiar carrito local para que el icono no quede con número viejo
    clear?.();

    try {
      await Promise.allSettled([
        fetch("/api/auth/logout", { method: "POST", cache: "no-store" }),
        fetch("/api/admin/logout", { method: "POST", cache: "no-store" }),
      ]);
    } catch {
      // no nos importa, ya limpiamos UI
    }

    // mandamos al login
    router.replace("/login");
  };

  const NavLink = ({ href, children }) => (
    <StyledLink href={href} className={pathname === href ? "active" : undefined} prefetch>
      {children}
    </StyledLink>
  );

  return (
    <Topbar>
      <TopbarInner>
        {/* Marca + logo (esto ya es "Catálogo") */}
        <BrandWrap>
          <Link href="/" prefetch>
            <Logo src="/imagenes/logo.png" alt="Ferreluc" />
          </Link>
          <BrandText href="/" prefetch>
            Catálogo Ferreluc
          </BrandText>
        </BrandWrap>

        {/* Navegación principal */}
        <NavLeft>
          {/* NO repetimos "Catálogo" porque el brand ya lo hace */}
          {isLogged && isAdmin && <NavLink href="/orders">Mis órdenes</NavLink>}
          {isLogged && isAdmin && <NavLink href="/admin/users">Cuentas</NavLink>}
          {isLogged && isAdmin && <NavLink href="/admin/import">Importar Excel</NavLink>}
        </NavLeft>

        {/* Derecha */}
        <NavRight>
          {isLogged && (
            <CartBtn href="/carrito" prefetch>
              Carrito
              {mounted && count > 0 && <CartBadge>{count}</CartBadge>}
            </CartBtn>
          )}

          {!loading && !isLogged && (
            <>
              <NavLink href="/login">Ingresar</NavLink>
              <NavLink href="/register">Registrate</NavLink>
            </>
          )}

          {!loading && isLogged && (
            <>
              <UserPill title={me.email}>{me.name?.trim() || me.email}</UserPill>
              <Btn onClick={handleLogout}>Cerrar sesión</Btn>
            </>
          )}
        </NavRight>
      </TopbarInner>
    </Topbar>
  );
}
