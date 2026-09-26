"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import StripeOnboardingStatus from "../../../components/StripeOnboardingStatus";

export default function HostProductsPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const createProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/stripe/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, priceInCents: Math.round(Number(price) * 100), currency: "usd" }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Product creation failed.");
      setName(""); setDescription(""); setPrice(""); setMessage("Product created. It is now visible in the storefront.");
    } catch (productError) {
      setError(productError instanceof Error ? productError.message : "Product creation failed.");
    } finally {
      setSaving(false);
    }
  };

  return <main className="listing-form-page"><Navbar /><section className="listing-form-shell"><Link className="back-link" href="/host">Host dashboard</Link><div className="listing-form-heading"><p className="eyebrow">Host products</p><h1>Sell a piece of the stay.</h1><p>Create a platform-level Stripe product and route each successful payment to your connected account through a destination charge.</p></div><div className="stripe-product-status"><p className="eyebrow">Live account status</p><StripeOnboardingStatus /></div><form className="listing-form" onSubmit={createProduct}><div className="listing-form-section"><h2>Product details</h2><div className="form-grid"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Hand-thrown breakfast mug" required /></label><label>Price in USD<input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" type="number" min="0.50" step="0.01" placeholder="24.00" required /></label><label className="form-span-two">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A small reminder of a slower morning." rows={4} /></label></div></div>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="stripe-success-message" role="status">{message}</p>}<div className="listing-form-actions"><Link className="form-cancel" href="/storefront">View storefront</Link><button className="form-submit" type="submit" disabled={saving}>{saving ? "Creating..." : "Create product"}</button></div></form></section></main>;
}