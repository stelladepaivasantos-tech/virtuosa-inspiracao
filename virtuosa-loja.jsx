import { useState, useEffect, useRef } from "react";

const WHATSAPP_NUMBER = "5524981312574";
const STORAGE_KEY = "virtuosa-catalog";
const ORDERS_KEY = "virtuosa-orders";
const PIN_KEY = "virtuosa-admin-pin";
const DEFAULT_PIN = "2574";

const SEED = {
  categories: [
    { id: "c1", name: "Roupas" },
    { id: "c2", name: "Calçados" },
    { id: "c3", name: "Acessórios" },
    { id: "c4", name: "Perfumaria" },
    { id: "c5", name: "Casa & Decoração" },
  ],
  products: [
    { id: "p1", name: "Vestido Midi Elegante Manga Longa", price: 149.9, originalPrice: 199.9, categoryId: "c1", emoji: "👗", color: "#D9B8A3", imageUrl: "", desc: "Tecido com caimento fluido, forrado, tamanhos P ao GG." },
    { id: "p2", name: "Tênis Casual Feminino Couro Sintético", price: 119.9, originalPrice: 149.9, categoryId: "c2", emoji: "👟", color: "#EDE3D3", imageUrl: "", desc: "Solado em EVA leve, disponível do 34 ao 40." },
    { id: "p3", name: "Bolsa Transversal Couro Legítimo", price: 189.9, originalPrice: null, categoryId: "c3", emoji: "👜", color: "#B08D57", imageUrl: "", desc: "Alça ajustável, fecho magnético, forro interno com bolso." },
    { id: "p4", name: "Perfume Feminino Floral 100ml", price: 159.9, originalPrice: 219.9, categoryId: "c4", emoji: "🌸", color: "#E7C6C0", imageUrl: "", desc: "Notas florais e amadeiradas, fixação de longa duração." },
    { id: "p5", name: "Jogo de Cama Queen 100% Algodão 4pçs", price: 129.9, originalPrice: 179.9, categoryId: "c5", emoji: "🛏️", color: "#CBB89D", imageUrl: "", desc: "Lençol de baixo com elástico, fronhas e edredom leve." },
    { id: "p6", name: "Relógio Feminino Analógico Dourado", price: 89.9, originalPrice: 126.9, categoryId: "c3", emoji: "⌚", color: "#C9A96E", imageUrl: "", desc: "Pulseira em aço inoxidável, resistente à água." },
    { id: "p7", name: "Óculos de Sol Redondo UV400", price: 79.9, originalPrice: 109.9, categoryId: "c3", emoji: "🕶️", color: "#8A7360", imageUrl: "", desc: "Lentes com proteção UV400, armação leve em acetato." },
  ],
};

function formatBRL(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function waLink(text) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function VirtuosaStore() {
  const [catalog, setCatalog] = useState(SEED);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("store");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState({});
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", street: "", number: "", neighborhood: "", city: "", zip: "", payment: "pix" });
  const [orders, setOrders] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [adminTab, setAdminTab] = useState("products");
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, true);
        if (res && res.value) {
          setCatalog(JSON.parse(res.value));
        } else {
          await window.storage.set(STORAGE_KEY, JSON.stringify(SEED), true);
        }
      } catch (e) {
        try {
          await window.storage.set(STORAGE_KEY, JSON.stringify(SEED), true);
        } catch (e2) {}
      }
      try {
        const ordersRes = await window.storage.get(ORDERS_KEY, true);
        if (ordersRes && ordersRes.value) setOrders(JSON.parse(ordersRes.value));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  const persist = async (next) => {
    setCatalog(next);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next), true);
    } catch (e) {
      showToast("Não consegui salvar agora. Tente novamente.");
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  };

  const checkPin = async () => {
    let storedPin = DEFAULT_PIN;
    try {
      const res = await window.storage.get(PIN_KEY, true);
      if (res && res.value) storedPin = res.value;
    } catch (e) {}
    if (pinInput === storedPin) {
      setAdminAuthed(true);
      setPinError("");
      setPinInput("");
    } else {
      setPinError("Senha incorreta.");
    }
  };

  const changePin = async (newPin) => {
    if (!newPin || newPin.length < 4) {
      showToast("Use uma senha com pelo menos 4 caracteres.");
      return;
    }
    try {
      await window.storage.set(PIN_KEY, newPin, true);
      showToast("Senha do painel atualizada.");
    } catch (e) {
      showToast("Não consegui salvar a nova senha.");
    }
  };

  const saveProduct = (product) => {
    let next;
    if (product.id) {
      next = { ...catalog, products: catalog.products.map((p) => (p.id === product.id ? product : p)) };
    } else {
      next = { ...catalog, products: [...catalog.products, { ...product, id: uid() }] };
    }
    persist(next);
    setEditingProduct(null);
    showToast("Produto salvo.");
  };

  const deleteProduct = (id) => {
    persist({ ...catalog, products: catalog.products.filter((p) => p.id !== id) });
    showToast("Produto removido.");
  };

  const saveCategory = (cat) => {
    let next;
    if (cat.id) {
      next = { ...catalog, categories: catalog.categories.map((c) => (c.id === cat.id ? cat : c)) };
    } else {
      next = { ...catalog, categories: [...catalog.categories, { ...cat, id: uid() }] };
    }
    persist(next);
    setEditingCategory(null);
    showToast("Categoria salva.");
  };

  const deleteCategory = (id) => {
    const hasProducts = catalog.products.some((p) => p.categoryId === id);
    if (hasProducts) {
      showToast("Mova ou apague os produtos dessa categoria antes de excluí-la.");
      return;
    }
    persist({ ...catalog, categories: catalog.categories.filter((c) => c.id !== id) });
    showToast("Categoria removida.");
  };

  const visibleProducts = catalog.products
    .filter((p) => activeCategory === "all" || p.categoryId === activeCategory)
    .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  const toggleFavorite = (id) => setFavorites((f) => ({ ...f, [id]: !f[id] }));
  const favoriteCount = Object.values(favorites).filter(Boolean).length;

  const addToCart = (id) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    showToast("Adicionado ao carrinho.");
  };
  const changeQty = (id, delta) => {
    setCart((c) => {
      const next = { ...c, [id]: Math.max(0, (c[id] || 0) + delta) };
      if (next[id] === 0) delete next[id];
      return next;
    });
  };
  const removeFromCart = (id) => setCart((c) => { const n = { ...c }; delete n[id]; return n; });

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ product: catalog.products.find((p) => p.id === id), qty }))
    .filter((i) => i.product);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);

  const persistOrders = async (next) => {
    setOrders(next);
    try {
      await window.storage.set(ORDERS_KEY, JSON.stringify(next), true);
    } catch (e) {}
  };

  const submitOrder = () => {
    if (!customerForm.name || !customerForm.phone || !customerForm.street || !customerForm.city) {
      showToast("Preencha nome, telefone, endereço e cidade.");
      return;
    }
    const order = {
      id: uid().toUpperCase(),
      items: cartItems.map((i) => ({ name: i.product.name, price: i.product.price, qty: i.qty })),
      total: cartTotal,
      customer: { ...customerForm },
      status: "pendente",
      createdAt: new Date().toISOString(),
    };
    persistOrders([order, ...orders]);
    setLastOrder(order);
    setCheckoutStep("confirm");
    setCart({});
  };

  const updateOrderStatus = (id, status) => {
    persistOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)));
  };
  const deleteOrder = (id) => persistOrders(orders.filter((o) => o.id !== id));

  const categoryName = (id) => catalog.categories.find((c) => c.id === id)?.name || "Sem categoria";

  if (!loaded) {
    return (
      <div style={{ background: "#F7F1E8", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Georgia, serif", color: "#6B4A38", letterSpacing: "0.3em", fontSize: 14 }}>CARREGANDO…</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#F7F1E8", minHeight: "100vh", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#2B2018" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .vt-serif { font-family: 'Playfair Display', Georgia, serif; }
        .vt-sans { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; }
        .vt-card { transition: transform .18s ease, box-shadow .18s ease; }
        .vt-card:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(59,38,26,0.12); }
        .vt-btn { transition: opacity .15s ease, transform .1s ease; }
        .vt-btn:hover { opacity: 0.88; }
        .vt-btn:active { transform: scale(0.97); }
        .vt-pill { transition: background .15s ease, color .15s ease; }
      `}</style>

      {/* Top utility bar */}
      <div style={{ background: "#2B1E17", color: "#D9CBB2" }} className="vt-sans">
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "7px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <span>🚚 Frete grátis para todo o Brasil</span>
            <span style={{ display: window.innerWidth < 640 ? "none" : "inline" }}>💳 Parcele em até 12x</span>
            <span style={{ display: window.innerWidth < 640 ? "none" : "inline" }}>⚡ 5% OFF no Pix</span>
          </div>
          <button
            className="vt-btn"
            onClick={() => setView(view === "store" ? "admin" : "store")}
            style={{ background: "none", border: "none", color: "#C9A96E", fontSize: 11.5, cursor: "pointer", padding: 0 }}
          >
            {view === "store" ? "Painel da loja ↗" : "← Voltar à loja"}
          </button>
        </div>
      </div>

      {/* Header */}
      <header style={{ background: "#3E2B22", color: "#F7F1E8", position: "sticky", top: 0, zIndex: 30, borderBottom: "1px solid rgba(201,169,110,0.35)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
            <span className="vt-serif" style={{ fontSize: 25, letterSpacing: "0.06em" }}>VIRTUOSA</span>
            <span className="vt-sans" style={{ fontSize: 9.5, letterSpacing: "0.3em", color: "#C9A96E" }}>INSPIRAÇÃO</span>
          </div>

          {view === "store" && (
            <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="O que você procura hoje?"
                className="vt-sans"
                style={{
                  width: "100%",
                  padding: "10px 40px 10px 14px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 13.5,
                  boxSizing: "border-box",
                  background: "#F7F1E8",
                  color: "#3E2B22",
                }}
              />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#8A7360" }}>🔍</span>
            </div>
          )}

          {view === "store" && (
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }} className="vt-sans">
              <div style={{ fontSize: 12, textAlign: "center", opacity: 0.9 }}>
                <div style={{ fontSize: 17 }}>{favoriteCount > 0 ? "❤️" : "🤍"}</div>
                Favoritos{favoriteCount > 0 ? ` (${favoriteCount})` : ""}
              </div>
              <button
                className="vt-btn"
                onClick={() => { setCartOpen(true); setCheckoutStep("cart"); }}
                style={{ fontSize: 12, textAlign: "center", background: "none", border: "none", color: "#F7F1E8", cursor: "pointer", position: "relative" }}
              >
                <div style={{ fontSize: 17 }}>🛒</div>
                Carrinho
                {cartCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -10, background: "#C9A96E", color: "#2B1E17", fontSize: 10, fontWeight: 700, borderRadius: 999, width: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {view === "store" && (
          <div style={{ borderTop: "1px solid rgba(201,169,110,0.25)", overflowX: "auto" }}>
            <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px", display: "flex", gap: 22, fontSize: 12.5 }} className="vt-sans">
              <button
                className="vt-btn"
                onClick={() => setActiveCategory("all")}
                style={{ background: "none", border: "none", color: activeCategory === "all" ? "#C9A96E" : "#E7DBC9", padding: "10px 0", cursor: "pointer", whiteSpace: "nowrap", borderBottom: activeCategory === "all" ? "2px solid #C9A96E" : "2px solid transparent" }}
              >
                TODAS CATEGORIAS
              </button>
              {catalog.categories.map((c) => (
                <button
                  key={c.id}
                  className="vt-btn"
                  onClick={() => setActiveCategory(c.id)}
                  style={{ background: "none", border: "none", color: activeCategory === c.id ? "#C9A96E" : "#E7DBC9", padding: "10px 0", cursor: "pointer", whiteSpace: "nowrap", borderBottom: activeCategory === c.id ? "2px solid #C9A96E" : "2px solid transparent" }}
                >
                  {c.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {view === "store" ? (
        <>
          {/* Hero */}
          <div style={{ background: "linear-gradient(120deg, #6B4A38 0%, #3E2B22 60%, #2B1E17 100%)", color: "#F7F1E8", padding: "56px 20px" }}>
            <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 320px" }}>
                <div className="vt-sans" style={{ fontSize: 11, letterSpacing: "0.25em", color: "#C9A96E", marginBottom: 10 }}>NOVA COLEÇÃO</div>
                <div className="vt-serif" style={{ fontSize: "clamp(30px, 5vw, 46px)", lineHeight: 1.12, fontWeight: 600 }}>
                  Elegância, qualidade e inspiração para toda a família
                </div>
                <div className="vt-sans" style={{ marginTop: 14, color: "#E7DBC9", fontSize: 15, maxWidth: 460 }}>
                  Peças selecionadas com carinho. Escolha pelo site e finalize direto com a gente pelo WhatsApp.
                </div>
                <button
                  className="vt-btn"
                  onClick={() => document.getElementById("vt-catalog")?.scrollIntoView({ behavior: "smooth" })}
                  style={{ marginTop: 22, background: "#C9A96E", color: "#2B1E17", border: "none", borderRadius: 999, padding: "12px 28px", fontSize: 13.5, letterSpacing: "0.04em", cursor: "pointer", fontWeight: 600 }}
                >
                  COMPRAR AGORA
                </button>
              </div>
              <div style={{ flex: "1 1 240px", display: "flex", justifyContent: "center", gap: 14 }}>
                {catalog.products.slice(0, 3).map((p, i) => (
                  <div key={p.id} style={{ width: 84, height: 108, borderRadius: 14, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, boxShadow: "0 12px 30px rgba(0,0,0,0.3)", transform: `rotate(${(i - 1) * 6}deg)`, marginTop: i === 1 ? -14 : 0 }}>
                    {p.emoji}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ background: "#fff", borderBottom: "1px solid #EAE0CF" }}>
            <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }} className="vt-sans">
              {[
                ["🚚", "Frete grátis", "Para todo o Brasil"],
                ["💳", "Parcele em até 12x", "No cartão de crédito"],
                ["🔒", "Compra segura", "Seus dados protegidos"],
                ["↩️", "Troca fácil", "Até 7 dias após o recebimento"],
                ["🎧", "Atendimento", "Direto pelo WhatsApp"],
              ].map(([icon, title, sub]) => (
                <div key={title} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#3E2B22" }}>{title}</div>
                    <div style={{ fontSize: 10.5, color: "#8A7360" }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Products */}
          <div id="vt-catalog" style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 20px 80px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
              <div className="vt-serif" style={{ fontSize: 22 }}>
                {activeCategory === "all" ? "Destaques para você" : categoryName(activeCategory)}
              </div>
              <div className="vt-sans" style={{ fontSize: 12.5, color: "#8A7360" }}>{visibleProducts.length} produtos</div>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="vt-sans" style={{ textAlign: "center", padding: "60px 20px", color: "#8A7360" }}>
                Nenhum produto encontrado.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
                {visibleProducts.map((p) => {
                  const hasDiscount = p.originalPrice && p.originalPrice > p.price;
                  const pct = hasDiscount ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
                  return (
                    <div key={p.id} className="vt-card" style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #EAE0CF", position: "relative" }}>
                      {hasDiscount && (
                        <div style={{ position: "absolute", top: 10, left: 10, background: "#B4432C", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 5, zIndex: 2 }} className="vt-sans">
                          -{pct}%
                        </div>
                      )}
                      <button
                        onClick={() => toggleFavorite(p.id)}
                        className="vt-btn"
                        style={{ position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: 30, height: 30, fontSize: 14, cursor: "pointer", zIndex: 2 }}
                        aria-label="Favoritar"
                      >
                        {favorites[p.id] ? "❤️" : "🤍"}
                      </button>
                      <div style={{ background: p.color || "#EDE3D3", height: 160, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56, overflow: "hidden" }}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                        ) : (
                          p.emoji || "🛍️"
                        )}
                      </div>
                      <div style={{ padding: 14 }}>
                        <div className="vt-sans" style={{ fontSize: 10.5, color: "#B08D57", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {categoryName(p.categoryId)}
                        </div>
                        <div className="vt-serif" style={{ fontSize: 16, marginTop: 4, lineHeight: 1.25 }}>{p.name}</div>
                        {p.desc && <div className="vt-sans" style={{ fontSize: 12, color: "#8A7360", marginTop: 4, lineHeight: 1.4 }}>{p.desc}</div>}
                        <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 8 }}>
                          {hasDiscount && (
                            <span className="vt-sans" style={{ fontSize: 12.5, color: "#B0A48F", textDecoration: "line-through" }}>
                              {formatBRL(Number(p.originalPrice))}
                            </span>
                          )}
                          <span className="vt-serif" style={{ fontSize: 19, color: "#3E2B22" }}>{formatBRL(Number(p.price) || 0)}</span>
                        </div>
                        <div className="vt-sans" style={{ fontSize: 10.5, color: "#8A7360", marginTop: 2 }}>
                          ou 6x de {formatBRL((Number(p.price) || 0) / 6)}
                        </div>
                        <button
                          className="vt-btn"
                          onClick={() => addToCart(p.id)}
                          style={{
                            marginTop: 12,
                            width: "100%",
                            textAlign: "center",
                            background: "#3E2B22",
                            color: "#F7F1E8",
                            borderRadius: 8,
                            padding: "10px 0",
                            fontSize: 13,
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          Adicionar ao carrinho
                        </button>
                        <a
                          className="vt-btn"
                          href={waLink(`Olá! Tenho interesse no produto "${p.name}" (${formatBRL(Number(p.price) || 0)}).`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginTop: 8,
                            display: "block",
                            textAlign: "center",
                            background: "transparent",
                            color: "#3E2B22",
                            borderRadius: 8,
                            padding: "8px 0",
                            fontSize: 12,
                            border: "1px solid #D9CBB2",
                            textDecoration: "none",
                          }}
                        >
                          Perguntar no WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer style={{ background: "#2B1E17", color: "#D9CBB2" }} className="vt-sans">
            <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 20px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 28 }}>
              <div>
                <div className="vt-serif" style={{ fontSize: 20, color: "#F7F1E8", marginBottom: 8 }}>VIRTUOSA</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: "#B8A98E" }}>
                  A Virtuosa Inspiração nasceu para oferecer produtos de qualidade, com elegância e preços justos para toda a família.
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F7F1E8", marginBottom: 10 }}>INSTITUCIONAL</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                  <span>Sobre nós</span>
                  <span>Política de privacidade</span>
                  <span>Trocas e devoluções</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F7F1E8", marginBottom: 10 }}>AJUDA</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                  <span>Como comprar</span>
                  <span>Formas de pagamento</span>
                  <a href={waLink("Olá! Tenho uma dúvida sobre a Virtuosa Inspiração.")} target="_blank" rel="noopener noreferrer" style={{ color: "#D9CBB2", textDecoration: "none" }}>
                    Fale conosco no WhatsApp
                  </a>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F7F1E8", marginBottom: 10 }}>FORMAS DE PAGAMENTO</div>
                <div style={{ fontSize: 12 }}>Pix · Cartão de crédito · Boleto</div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid rgba(217,203,178,0.15)", padding: "14px 20px", textAlign: "center", fontSize: 11, color: "#8A7360" }}>
              © {new Date().getFullYear()} Virtuosa Inspiração — Todos os direitos reservados.
            </div>
          </footer>
        </>
      ) : (
        <AdminPanel
          adminAuthed={adminAuthed}
          pinInput={pinInput}
          setPinInput={setPinInput}
          pinError={pinError}
          checkPin={checkPin}
          adminTab={adminTab}
          setAdminTab={setAdminTab}
          catalog={catalog}
          orders={orders}
          updateOrderStatus={updateOrderStatus}
          deleteOrder={deleteOrder}
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          editingCategory={editingCategory}
          setEditingCategory={setEditingCategory}
          saveProduct={saveProduct}
          deleteProduct={deleteProduct}
          saveCategory={saveCategory}
          deleteCategory={deleteCategory}
          changePin={changePin}
          categoryName={categoryName}
        />
      )}

      {cartOpen && (
        <CartModal
          checkoutStep={checkoutStep}
          setCheckoutStep={setCheckoutStep}
          cartItems={cartItems}
          cartTotal={cartTotal}
          changeQty={changeQty}
          removeFromCart={removeFromCart}
          customerForm={customerForm}
          setCustomerForm={setCustomerForm}
          submitOrder={submitOrder}
          lastOrder={lastOrder}
          close={() => setCartOpen(false)}
          waLink={waLink}
        />
      )}

      {/* Floating WhatsApp button */}
      <a
        href={waLink("Olá! Vim da loja Virtuosa Inspiração e gostaria de falar com você.")}
        target="_blank"
        rel="noopener noreferrer"
        className="vt-btn"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          background: "#25D366",
          color: "#fff",
          width: 58,
          height: 58,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
          zIndex: 40,
          textDecoration: "none",
        }}
        aria-label="Falar no WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="30" height="30" fill="#fff">
          <path d="M16.02 3C9.4 3 4 8.38 4 15c0 2.4.7 4.63 1.92 6.51L4 29l7.68-1.87A11.9 11.9 0 0 0 16.02 27C22.63 27 28 21.62 28 15S22.63 3 16.02 3zm0 21.7c-1.98 0-3.83-.57-5.4-1.55l-.39-.23-4.55 1.11 1.14-4.43-.25-.4A9.63 9.63 0 0 1 5.3 15c0-5.9 4.8-10.7 10.72-10.7S26.7 9.1 26.7 15 21.94 24.7 16.02 24.7zm5.86-8.02c-.32-.16-1.9-.94-2.2-1.04-.3-.11-.51-.16-.73.16-.21.32-.84 1.04-1.03 1.25-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.6-1.6-.96-.86-1.6-1.92-1.79-2.24-.19-.32-.02-.5.14-.66.14-.14.32-.38.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.62-.53-.54-.73-.55h-.62c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.67 0 1.57 1.15 3.09 1.31 3.3.16.21 2.26 3.45 5.47 4.84.76.33 1.36.53 1.82.67.77.24 1.46.21 2.02.13.62-.09 1.9-.78 2.16-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37z" />
        </svg>
      </a>

      {toast && (
        <div style={{ position: "fixed", bottom: 90, right: 20, background: "#3E2B22", color: "#F7F1E8", padding: "10px 16px", borderRadius: 8, fontSize: 13, zIndex: 50 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function AdminPanel({
  adminAuthed, pinInput, setPinInput, pinError, checkPin,
  adminTab, setAdminTab, catalog, orders, updateOrderStatus, deleteOrder,
  editingProduct, setEditingProduct, editingCategory, setEditingCategory,
  saveProduct, deleteProduct, saveCategory, deleteCategory, changePin, categoryName,
}) {
  if (!adminAuthed) {
    return (
      <div style={{ maxWidth: 380, margin: "60px auto", padding: "0 20px" }}>
        <div className="vt-serif" style={{ fontSize: 22, marginBottom: 6, textAlign: "center" }}>Painel da loja</div>
        <div className="vt-sans" style={{ fontSize: 13, color: "#8A7360", textAlign: "center", marginBottom: 20 }}>
          Digite a senha para gerenciar produtos e categorias.
        </div>
        <input
          type="password"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && checkPin()}
          placeholder="Senha"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D9CBB2", fontSize: 14, boxSizing: "border-box" }}
        />
        {pinError && <div style={{ color: "#B4432C", fontSize: 12, marginTop: 6 }}>{pinError}</div>}
        <button
          className="vt-btn"
          onClick={checkPin}
          style={{ marginTop: 14, width: "100%", background: "#3E2B22", color: "#F7F1E8", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 14, cursor: "pointer" }}
        >
          Entrar
        </button>
        <div className="vt-sans" style={{ fontSize: 11, color: "#B8A98E", textAlign: "center", marginTop: 14 }}>
          Senha padrão: {DEFAULT_PIN}. Você pode trocá-la dentro do painel.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 80px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className="vt-btn"
          onClick={() => setAdminTab("products")}
          style={{
            background: adminTab === "products" ? "#3E2B22" : "transparent",
            color: adminTab === "products" ? "#F7F1E8" : "#3E2B22",
            border: "1px solid #3E2B22",
            borderRadius: 999,
            padding: "7px 18px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Produtos
        </button>
        <button
          className="vt-btn"
          onClick={() => setAdminTab("categories")}
          style={{
            background: adminTab === "categories" ? "#3E2B22" : "transparent",
            color: adminTab === "categories" ? "#F7F1E8" : "#3E2B22",
            border: "1px solid #3E2B22",
            borderRadius: 999,
            padding: "7px 18px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Categorias
        </button>
        <button
          className="vt-btn"
          onClick={() => setAdminTab("orders")}
          style={{
            background: adminTab === "orders" ? "#3E2B22" : "transparent",
            color: adminTab === "orders" ? "#F7F1E8" : "#3E2B22",
            border: "1px solid #3E2B22",
            borderRadius: 999,
            padding: "7px 18px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Pedidos{orders.filter((o) => o.status === "pendente").length > 0 ? ` (${orders.filter((o) => o.status === "pendente").length})` : ""}
        </button>
        <button
          className="vt-btn"
          onClick={() => setAdminTab("settings")}
          style={{
            background: adminTab === "settings" ? "#3E2B22" : "transparent",
            color: adminTab === "settings" ? "#F7F1E8" : "#3E2B22",
            border: "1px solid #3E2B22",
            borderRadius: 999,
            padding: "7px 18px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Configurações
        </button>
      </div>

      {adminTab === "products" && (
        <ProductsAdmin
          catalog={catalog}
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          saveProduct={saveProduct}
          deleteProduct={deleteProduct}
          categoryName={categoryName}
        />
      )}
      {adminTab === "categories" && (
        <CategoriesAdmin
          catalog={catalog}
          editingCategory={editingCategory}
          setEditingCategory={setEditingCategory}
          saveCategory={saveCategory}
          deleteCategory={deleteCategory}
        />
      )}
      {adminTab === "orders" && (
        <OrdersAdmin orders={orders} updateOrderStatus={updateOrderStatus} deleteOrder={deleteOrder} />
      )}
      {adminTab === "settings" && <SettingsAdmin changePin={changePin} />}
    </div>
  );
}

function ProductsAdmin({ catalog, editingProduct, setEditingProduct, saveProduct, deleteProduct, categoryName }) {
  const blank = { id: null, name: "", price: "", categoryId: catalog.categories[0]?.id || "", emoji: "🛍️", color: "#EDE3D3", imageUrl: "", desc: "" };
  const form = editingProduct || blank;

  const update = (field, value) => setEditingProduct({ ...form, [field]: value });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div className="vt-serif" style={{ fontSize: 18 }}>Produtos ({catalog.products.length})</div>
        {!editingProduct && (
          <button className="vt-btn" onClick={() => setEditingProduct(blank)} style={btnDark}>+ Novo produto</button>
        )}
      </div>

      {editingProduct && (
        <div style={cardBox}>
          <div className="vt-serif" style={{ fontSize: 15, marginBottom: 10 }}>{form.id ? "Editar produto" : "Novo produto"}</div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <Field label="Nome"><input style={input} value={form.name} onChange={(e) => update("name", e.target.value)} /></Field>
            <Field label="Preço (R$)"><input style={input} type="number" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} /></Field>
            <Field label="Categoria">
              <select style={input} value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
                {catalog.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Emoji/ícone (usado se não houver foto)"><input style={input} value={form.emoji} onChange={(e) => update("emoji", e.target.value)} placeholder="👗" /></Field>
            <Field label="Cor de fundo"><input style={input} type="color" value={form.color} onChange={(e) => update("color", e.target.value)} /></Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="URL da foto real do produto (opcional, mas recomendado)">
                <input style={input} value={form.imageUrl || ""} onChange={(e) => update("imageUrl", e.target.value)} placeholder="https://..." />
              </Field>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Descrição"><textarea style={{ ...input, minHeight: 60 }} value={form.desc} onChange={(e) => update("desc", e.target.value)} /></Field>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="vt-btn"
              onClick={() => {
                if (!form.name || !form.price) return;
                saveProduct({ ...form, price: parseFloat(form.price) });
              }}
              style={btnDark}
            >
              Salvar
            </button>
            <button className="vt-btn" onClick={() => setEditingProduct(null)} style={btnLight}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        {catalog.products.map((p) => (
          <div key={p.id} style={rowBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{p.emoji}</div>
              <div>
                <div className="vt-sans" style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                <div className="vt-sans" style={{ fontSize: 12, color: "#8A7360" }}>{categoryName(p.categoryId)} · {formatBRL(Number(p.price) || 0)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="vt-btn" onClick={() => setEditingProduct(p)} style={btnSmall}>Editar</button>
              <button className="vt-btn" onClick={() => deleteProduct(p.id)} style={btnSmallDanger}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesAdmin({ catalog, editingCategory, setEditingCategory, saveCategory, deleteCategory }) {
  const blank = { id: null, name: "" };
  const form = editingCategory || blank;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div className="vt-serif" style={{ fontSize: 18 }}>Categorias ({catalog.categories.length})</div>
        {!editingCategory && (
          <button className="vt-btn" onClick={() => setEditingCategory(blank)} style={btnDark}>+ Nova categoria</button>
        )}
      </div>

      {editingCategory && (
        <div style={cardBox}>
          <div className="vt-serif" style={{ fontSize: 15, marginBottom: 10 }}>{form.id ? "Editar categoria" : "Nova categoria"}</div>
          <Field label="Nome">
            <input style={input} value={form.name} onChange={(e) => setEditingCategory({ ...form, name: e.target.value })} />
          </Field>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="vt-btn" onClick={() => form.name && saveCategory(form)} style={btnDark}>Salvar</button>
            <button className="vt-btn" onClick={() => setEditingCategory(null)} style={btnLight}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        {catalog.categories.map((c) => (
          <div key={c.id} style={rowBox}>
            <div className="vt-sans" style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="vt-btn" onClick={() => setEditingCategory(c)} style={btnSmall}>Editar</button>
              <button className="vt-btn" onClick={() => deleteCategory(c.id)} style={btnSmallDanger}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersAdmin({ orders, updateOrderStatus, deleteOrder }) {
  const statusLabel = { pendente: "Pendente", pago: "Pago", enviado: "Enviado" };
  const statusColor = { pendente: "#B4432C", pago: "#4A7A4A", enviado: "#3E2B22" };
  return (
    <div>
      <div className="vt-serif" style={{ fontSize: 18, marginBottom: 12 }}>Pedidos ({orders.length})</div>
      {orders.length === 0 ? (
        <div className="vt-sans" style={{ color: "#8A7360", fontSize: 13 }}>Nenhum pedido feito pelo site ainda.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {orders.map((o) => (
            <div key={o.id} style={cardBox}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div className="vt-sans" style={{ fontSize: 13, fontWeight: 700 }}>
                    Pedido #{o.id} · <span style={{ color: statusColor[o.status] }}>{statusLabel[o.status] || o.status}</span>
                  </div>
                  <div className="vt-sans" style={{ fontSize: 12, color: "#8A7360", marginTop: 2 }}>
                    {o.customer.name} · {o.customer.phone} · {new Date(o.createdAt).toLocaleString("pt-BR")}
                  </div>
                  <div className="vt-sans" style={{ fontSize: 12, color: "#8A7360", marginTop: 2 }}>
                    {o.customer.street}, {o.customer.number} — {o.customer.neighborhood}, {o.customer.city} · CEP {o.customer.zip}
                  </div>
                  <div className="vt-sans" style={{ fontSize: 12, color: "#8A7360", marginTop: 2 }}>
                    Pagamento: {o.customer.payment === "pix" ? "Pix" : o.customer.payment === "cartao" ? "Cartão" : "Boleto"}
                  </div>
                </div>
                <div className="vt-serif" style={{ fontSize: 17 }}>{formatBRL(o.total)}</div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12 }} className="vt-sans">
                {o.items.map((it, i) => (
                  <div key={i}>{it.qty}x {it.name} — {formatBRL(it.price * it.qty)}</div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {o.status !== "pago" && <button className="vt-btn" onClick={() => updateOrderStatus(o.id, "pago")} style={btnSmall}>Marcar como pago</button>}
                {o.status !== "enviado" && <button className="vt-btn" onClick={() => updateOrderStatus(o.id, "enviado")} style={btnSmall}>Marcar como enviado</button>}
                <button className="vt-btn" onClick={() => deleteOrder(o.id)} style={btnSmallDanger}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CartModal({ checkoutStep, setCheckoutStep, cartItems, cartTotal, changeQty, removeFromCart, customerForm, setCustomerForm, submitOrder, lastOrder, close, waLink }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(43,30,23,0.5)", zIndex: 60, display: "flex", justifyContent: "flex-end" }} onClick={close}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#F7F1E8", width: "min(420px, 100%)", height: "100%", overflowY: "auto", padding: 20, boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="vt-serif" style={{ fontSize: 20 }}>
            {checkoutStep === "cart" && "Seu carrinho"}
            {checkoutStep === "form" && "Dados para entrega"}
            {checkoutStep === "confirm" && "Pedido confirmado"}
          </div>
          <button onClick={close} className="vt-btn" style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#3E2B22" }}>✕</button>
        </div>

        {checkoutStep === "cart" && (
          <>
            {cartItems.length === 0 ? (
              <div className="vt-sans" style={{ color: "#8A7360", fontSize: 13, textAlign: "center", marginTop: 40 }}>
                Seu carrinho está vazio.
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  {cartItems.map(({ product, qty }) => (
                    <div key={product.id} style={{ display: "flex", gap: 10, alignItems: "center", background: "#fff", border: "1px solid #EAE0CF", borderRadius: 10, padding: 10 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 8, background: product.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden", flexShrink: 0 }}>
                        {product.imageUrl ? <img src={product.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : product.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="vt-sans" style={{ fontSize: 13, fontWeight: 600 }}>{product.name}</div>
                        <div className="vt-sans" style={{ fontSize: 12, color: "#8A7360" }}>{formatBRL(product.price)}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <button onClick={() => changeQty(product.id, -1)} className="vt-btn" style={qtyBtn}>−</button>
                          <span className="vt-sans" style={{ fontSize: 13 }}>{qty}</span>
                          <button onClick={() => changeQty(product.id, 1)} className="vt-btn" style={qtyBtn}>+</button>
                          <button onClick={() => removeFromCart(product.id)} className="vt-btn" style={{ marginLeft: "auto", background: "none", border: "none", color: "#B4432C", fontSize: 11, cursor: "pointer" }}>remover</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", fontSize: 15 }} className="vt-serif">
                  <span>Total</span>
                  <span>{formatBRL(cartTotal)}</span>
                </div>
                <button className="vt-btn" onClick={() => setCheckoutStep("form")} style={{ ...btnDark, width: "100%", marginTop: 14, padding: "12px 0" }}>
                  Finalizar compra
                </button>
              </>
            )}
          </>
        )}

        {checkoutStep === "form" && (
          <div>
            <div style={{ display: "grid", gap: 10 }}>
              <Field label="Nome completo"><input style={input} value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} /></Field>
              <Field label="Telefone"><input style={input} value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <Field label="Rua"><input style={input} value={customerForm.street} onChange={(e) => setCustomerForm({ ...customerForm, street: e.target.value })} /></Field>
                <Field label="Número"><input style={input} value={customerForm.number} onChange={(e) => setCustomerForm({ ...customerForm, number: e.target.value })} /></Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Bairro"><input style={input} value={customerForm.neighborhood} onChange={(e) => setCustomerForm({ ...customerForm, neighborhood: e.target.value })} /></Field>
                <Field label="Cidade"><input style={input} value={customerForm.city} onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })} /></Field>
              </div>
              <Field label="CEP"><input style={input} value={customerForm.zip} onChange={(e) => setCustomerForm({ ...customerForm, zip: e.target.value })} /></Field>
              <Field label="Forma de pagamento">
                <select style={input} value={customerForm.payment} onChange={(e) => setCustomerForm({ ...customerForm, payment: e.target.value })}>
                  <option value="pix">Pix</option>
                  <option value="cartao">Cartão</option>
                  <option value="boleto">Boleto</option>
                </select>
              </Field>
            </div>
            <div className="vt-sans" style={{ fontSize: 11, color: "#8A7360", marginTop: 10, lineHeight: 1.4 }}>
              O pagamento é combinado diretamente com a loja após o pedido (chave Pix, link de cartão ou boleto serão enviados a você).
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="vt-btn" onClick={() => setCheckoutStep("cart")} style={btnLight}>Voltar</button>
              <button className="vt-btn" onClick={submitOrder} style={{ ...btnDark, flex: 1 }}>Confirmar pedido</button>
            </div>
          </div>
        )}

        {checkoutStep === "confirm" && lastOrder && (
          <div>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 40 }}>✅</div>
              <div className="vt-serif" style={{ fontSize: 18, marginTop: 8 }}>Pedido #{lastOrder.id} recebido!</div>
              <div className="vt-sans" style={{ fontSize: 13, color: "#8A7360", marginTop: 6 }}>
                Total: {formatBRL(lastOrder.total)} · Pagamento: {lastOrder.customer.payment === "pix" ? "Pix" : lastOrder.customer.payment === "cartao" ? "Cartão" : "Boleto"}
              </div>
              <div className="vt-sans" style={{ fontSize: 12.5, color: "#8A7360", marginTop: 10, lineHeight: 1.5 }}>
                A loja vai entrar em contato para combinar o pagamento e o envio. Se quiser adiantar, você também pode chamar no WhatsApp — mas não é obrigatório.
              </div>
              <a
                href={waLink(`Olá! Acabei de fazer o pedido #${lastOrder.id} no site (${formatBRL(lastOrder.total)}). Poderia confirmar comigo?`)}
                target="_blank"
                rel="noopener noreferrer"
                className="vt-btn"
                style={{ ...btnDark, display: "inline-block", marginTop: 16, textDecoration: "none" }}
              >
                Falar no WhatsApp (opcional)
              </a>
            </div>
            <button className="vt-btn" onClick={close} style={{ ...btnLight, width: "100%", marginTop: 10 }}>Continuar comprando</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsAdmin({ changePin }) {
  const [newPin, setNewPin] = useState("");
  return (
    <div style={cardBox}>
      <div className="vt-serif" style={{ fontSize: 15, marginBottom: 10 }}>Trocar senha do painel</div>
      <Field label="Nova senha">
        <input style={input} value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="mín. 4 caracteres" />
      </Field>
      <button
        className="vt-btn"
        onClick={() => { changePin(newPin); setNewPin(""); }}
        style={{ ...btnDark, marginTop: 12 }}
      >
        Salvar nova senha
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="vt-sans" style={{ display: "block", fontSize: 12, color: "#6B4A38" }}>
      {label}
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  );
}

const cardBox = { background: "#fff", border: "1px solid #EAE0CF", borderRadius: 12, padding: 16 };
const rowBox = { background: "#fff", border: "1px solid #EAE0CF", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" };
const input = { width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #D9CBB2", fontSize: 13.5, boxSizing: "border-box", fontFamily: "inherit" };
const btnDark = { background: "#3E2B22", color: "#F7F1E8", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, cursor: "pointer" };
const btnLight = { background: "transparent", color: "#3E2B22", border: "1px solid #3E2B22", borderRadius: 8, padding: "9px 16px", fontSize: 13, cursor: "pointer" };
const btnSmall = { background: "transparent", color: "#3E2B22", border: "1px solid #C9A96E", borderRadius: 7, padding: "6px 12px", fontSize: 12, cursor: "pointer" };
const btnSmallDanger = { background: "transparent", color: "#B4432C", border: "1px solid #B4432C", borderRadius: 7, padding: "6px 12px", fontSize: 12, cursor: "pointer" };
const qtyBtn = { width: 24, height: 24, borderRadius: 6, border: "1px solid #D9CBB2", background: "#fff", fontSize: 14, cursor: "pointer", lineHeight: 1 };
