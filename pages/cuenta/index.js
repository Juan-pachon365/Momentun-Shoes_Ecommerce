import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAddresses } from "@/hooks/useAddresses";
import { Seo } from "@/components/Seo";
import { EmptyState } from "@/components/EmptyState";
import { OrderCard } from "@/components/OrderCard";
import { AddressCard } from "@/components/AddressCard";
import { AddressForm } from "@/components/AddressForm";
import { IconBox, IconLogout, IconPin, IconPlus, IconUser } from "@/components/Icons";
import styles from "@/styles/Account.module.scss";

const TABS = [
  { id: "pedidos", label: "Mis pedidos", icon: IconBox },
  { id: "direcciones", label: "Direcciones", icon: IconPin },
  { id: "perfil", label: "Perfil", icon: IconUser },
];

export default function Cuenta() {
  const router = useRouter();
  const { loading } = useRequireAuth();
  const { user, profile, signOut } = useAuth();
  const tab = TABS.some((t) => t.id === router.query.tab) ? router.query.tab : "pedidos";

  if (loading) {
    return (
      <div className="container page">
        <div className="spinner" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const name = [profile?.firstname, profile?.lastname].filter(Boolean).join(" ");

  return (
    <div className="container page">
      <Seo title="Mi cuenta" />
      <div className={styles.head}>
        <div>
          <span className="eyebrow">Mi cuenta</span>
          <h1 className="page-title">Hola{profile?.firstname ? `, ${profile.firstname}` : ""}</h1>
          <p className="muted">{name ? `${name} · ` : ""}{user.email}</p>
        </div>
        <button className="btn btn-outline" onClick={handleSignOut}>
          <IconLogout /> Cerrar sesión
        </button>
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/cuenta?tab=${id}`}
            role="tab"
            aria-selected={tab === id}
            className={`${styles.tab} ${tab === id ? styles.tabActive : ""}`}
            scroll={false}
          >
            <Icon /> {label}
          </Link>
        ))}
      </div>

      <div className={styles.panel}>
        {tab === "pedidos" && <Orders />}
        {tab === "direcciones" && <Addresses />}
        {tab === "perfil" && <Profile />}
      </div>
    </div>
  );
}

function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    supabase
      .from("orders")
      .select("id, total_payment, status_payment, shipping_status, shipping_carrier, shipping_service, shipping_cost, tracking_number, id_payment, address_shipping, products, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data || []));
  }, [user.id]);

  if (orders === null) return <div className="spinner" />;
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<IconBox />}
        title="Todavía no tienes pedidos"
        text="Cuando compres, aquí verás el estado de cada pedido."
        actionHref="/catalogo"
        actionLabel="Ir al catálogo"
      />
    );
  }

  return (
    <div className={styles.list}>
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} />
      ))}
    </div>
  );
}

function Addresses() {
  const { addresses, loading, save, remove } = useAddresses();
  const { notify } = useToast();
  const [editing, setEditing] = useState(null); // null | "new" | address

  if (loading) return <div className="spinner" />;

  if (editing) {
    return (
      <div className="card">
        <h2 className={styles.panelTitle}>{editing === "new" ? "Nueva dirección" : "Editar dirección"}</h2>
        <AddressForm
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSubmit={async (values) => {
            await save(values, editing === "new" ? null : editing.id);
            notify("Dirección guardada", "success");
            setEditing(null);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className={styles.addresses}>
        {addresses.map((a) => (
          <AddressCard
            key={a.id}
            address={a}
            actions={
              <>
                <button className="btn btn-ghost" onClick={() => setEditing(a)}>
                  Editar
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={async () => {
                    try {
                      await remove(a.id);
                      notify("Dirección eliminada");
                    } catch (err) {
                      notify(err.message, "danger");
                    }
                  }}
                >
                  Eliminar
                </button>
              </>
            }
          />
        ))}
        <button className={styles.addAddress} onClick={() => setEditing("new")}>
          <IconPlus /> Agregar dirección
        </button>
      </div>
    </div>
  );
}

function Profile() {
  const { profile, updateProfile } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState({ firstname: profile?.firstname || "", lastname: profile?.lastname || "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setForm({ firstname: profile?.firstname || "", lastname: profile?.lastname || "" });
  }, [profile]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await updateProfile({ firstname: form.firstname.trim(), lastname: form.lastname.trim() });
      notify("Perfil actualizado", "success");
    } catch {
      setError("No se pudo actualizar el perfil");
    }
    setSending(false);
  };

  return (
    <div className={`card ${styles.profileCard}`}>
      <h2 className={styles.panelTitle}>Datos personales</h2>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="p-first">Nombre</label>
            <input id="p-first" required value={form.firstname} onChange={(e) => setForm({ ...form, firstname: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="p-last">Apellido</label>
            <input id="p-last" required value={form.lastname} onChange={(e) => setForm({ ...form, lastname: e.target.value })} />
          </div>
        </div>
        <button className="btn btn-primary" disabled={sending}>
          {sending ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
