"use client";

import Link from "next/link";
import { DashCard, DashIntro, DashShell } from "@/components/clinic/DashKit";
import { shopProducts } from "@/lib/shop-products";

export default function ShopPage() {
  return (
    <DashShell>
      <DashIntro
        kicker="Shop"
        title="Devices and braces"
        text="Support gear for the phone camera, Bluetooth motion sensor, and Bluetooth muscle sensor."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {shopProducts.map((product) => (
          <DashCard key={product.id}>
            <div className="h-48 bg-[#e8f3fb]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
            </div>
            <div className="p-6">
              <p className="text-sm font-semibold capitalize text-[#2f4a60]">{product.category.replace("-", " ")}</p>
              <h2 className="rm-serif mt-1 text-2xl font-semibold text-[#1b3348]">{product.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[#2f4a60]">{product.description}</p>
              <ul className="mt-4 space-y-1 text-sm text-[#2f4a60]">
                {product.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between">
                <p className="rm-serif text-2xl font-semibold text-[#1b3348]">${product.price}</p>
                <button
                  type="button"
                  className="rm-btn rm-btn-brand h-11 min-h-0 rounded-full px-5 text-sm"
                  onClick={() => alert(`${product.name} added to cart (demo — no checkout in this app).`)}
                >
                  Add to cart
                </button>
              </div>
            </div>
          </DashCard>
        ))}
      </div>
      <p className="mt-8 text-center">
        <Link href="/" className="text-sm font-semibold text-[#1b3348]">
          ← Back to home
        </Link>
      </p>
    </DashShell>
  );
}
