"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import styled from "styled-components";
import { useCart } from "@/components/CartContext";
import dynamic from "next/dynamic";

// Carga diferida del monitor para no afectar TTFB
const AdminHeaderMonitor = dynamic(() => import("@/components/AdminHeaderMonitor"), { ssr: false });

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
const UserPillLink = styled(Link)`
  padding: 5px 10px;
  border: 1px dashed #e5e7eb;
  border-radius: 999px;
  color: #111;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  text-decoration: none;

  &:hover {
    background: #f8fafc;
  }
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // si vengo de /admin/import → voy a /  => forzar refresh
  useEffect(() => {
    const prev = prevPathRef.current;
    const current = pathname;
    if (prev === "/admin/import" && current === "/") {
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
    clear?.();

    try {
      await Promise.allSettled([
        fetch("/api/auth/logout", { method: "POST", cache: "no-store" }),
        fetch("/api/admin/logout", { method: "POST", cache: "no-store" }),
      ]);
    } catch {
      // noop
    }

    router.replace("/login");
  };

  const NavLink = ({ href, children }) => (
    <StyledLink href={href} className={pathname === href ? "active" : undefined} prefetch>
      {children}
    </StyledLink>
  );

  const displayName = me?.name?.trim() || me?.email || "Cliente";

  return (
    <Topbar>
      <TopbarInner>
        {/* Marca + logo */}
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
          {isLogged && isAdmin && <NavLink href="/orders">Mis órdenes</NavLink>}
          {isLogged && isAdmin && <NavLink href="/admin/users">Cuentas</NavLink>}
          {isLogged && isAdmin && <NavLink href="/admin/import">Importar Excel</NavLink>}
          {isLogged && isAdmin && <NavLink href="/admin/pipeline">Pipeline</NavLink>}
        </NavLeft>

        {/* Monitor admin en vivo */}
        {isLogged && isAdmin && <AdminHeaderMonitor />}

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
              <UserPillLink href="/cliente" prefetch title={displayName}>
                {displayName}
              </UserPillLink>
              <Btn onClick={handleLogout}>Cerrar sesión</Btn>
            </>
          )}
        </NavRight>
      </TopbarInner>
    </Topbar>
  );
}
