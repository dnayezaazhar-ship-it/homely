"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, ShoppingBag } from "lucide-react";
import Link from "next/link";
import Navbar from "../../components/Navbar";

type Product = { id: string; name: string; description: string | null; accountId?: string; priceId?: string; unitAmount: number | null; currency: string };

export default function StorefrontPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState("");
  const purchase = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("purchase");

  useEffect(() => {
    fetch("/api/stripe/products", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as Product[] | { error?: string };
        if (!response.ok) throw new Error("error" in result ? result.error : "We could not load products.");
        setProducts(result as Product[]);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "We could not load products."))
      .finally(() => setLoading(false));
  }, []);

  const buy = async (productId: string) => {
    setBuying(productId);
    setError("");
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Checkout could not start.");
      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not start.");
      setBuying("");
    }
  };

  return <main className="storefront-page"><Navbar /><section className="storefront-shell">
    <div className="storefront-heading"><div><p className="eyebrow">Homely shop</p><h1>Bring a little stay home.</h1><p>Simple goods and experiences from Homely hosts, paid securely through Stripe Checkout.</p></div><Link className="storefront-host-link" href="/host/products">Sell something</Link></div>
    {purchase === "success" && <p className="stripe-success-message" role="status"><CheckCircle2 size={16} /> Payment complete. Thanks for supporting a Homely host.</p>}
    {purchase === "cancelled" && <p className="stripe-dashboard-message" role="status">Checkout was cancelled. Your cart is still here.</p>}
    {error && <p className="stripe-status-error" role="alert">{error}</p>}
    {loading ? <p className="storefront-empty">Loading products...</p> : products.length === 0 ? <div className="storefront-empty"><ShoppingBag size={24} /><p>No products are live yet.</p><Link href="/host/products">Create the first product</Link></div> : <div className="storefront-grid">{products.map((product) => <article className="storefront-product" key={product.id}><div className="storefront-product-art"><ShoppingBag size={28} /></div><div className="storefront-product-copy"><p className="eyebrow">Host product</p><h2>{product.name}</h2><p>{product.description || "A thoughtful offering from the Homely community."}</p><span className="storefront-host-id">Connected account {product.accountId?.slice(0, 12)}...</span><div className="storefront-product-footer"><strong>{formatMoney(product.unitAmount, product.currency)}</strong><button type="button" onClick={() => void buy(product.id)} disabled={buying === product.id}><CreditCard size={15} /> {buying === product.id ? "Opening..." : "Buy now"}</button></div></div></article>)}</div>}
  </section></main>;
}

function formatMoney(amount: number | null, currency: string) {
  if (amount === null) return "Price unavailable";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}
