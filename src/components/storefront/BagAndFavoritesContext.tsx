"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface BagItem {
  variationId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  color: string;
  size: string;
  unitPrice: number;
  maxStock: number;
  quantity: number;
  imageUrl: string;
}

interface BagContextValue {
  items: BagItem[];
  favorites: string[];
  isBagOpen: boolean;
  openBag: () => void;
  closeBag: () => void;
  addItem: (item: Omit<BagItem, "quantity"> & { quantity?: number }) => {
    added: boolean;
    message: string;
  };
  updateQuantity: (variationId: string, quantity: number) => void;
  removeItem: (variationId: string) => void;
  clearBag: () => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  totalItems: number;
  subtotal: number;
}

const BagContext = createContext<BagContextValue | undefined>(undefined);

const BAG_STORAGE_KEY = "suzano_sports_bag_v1";
const FAV_STORAGE_KEY = "suzano_sports_fav_v1";

export function BagAndFavoritesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<BagItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawBag = localStorage.getItem(BAG_STORAGE_KEY);
      if (rawBag) setItems(JSON.parse(rawBag));
      const rawFav = localStorage.getItem(FAV_STORAGE_KEY);
      if (rawFav) setFavorites(JSON.parse(rawFav));
    } catch {
      // ignore storage errors
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites, hydrated]);

  const addItem: BagContextValue["addItem"] = (input) => {
    if (input.maxStock <= 0) {
      return {
        added: false,
        message: "Esta variação está esgotada no momento.",
      };
    }

    const qtyToAdd = Math.max(1, input.quantity || 1);
    const existing = items.find((i) => i.variationId === input.variationId);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + qtyToAdd > input.maxStock) {
      return {
        added: false,
        message: `Temos apenas ${input.maxStock} unidade(s) disponível(is) desta variação.`,
      };
    }

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.variationId === input.variationId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: Math.min(input.maxStock, next[idx].quantity + qtyToAdd),
          unitPrice: input.unitPrice,
          maxStock: input.maxStock,
        };
        return next;
      }
      return [
        ...prev,
        {
          ...input,
          quantity: qtyToAdd,
        },
      ];
    });

    setIsBagOpen(true);
    return {
      added: true,
      message: "Produto adicionado à sua sacola!",
    };
  };

  const updateQuantity = (variationId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variationId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.variationId === variationId
          ? { ...item, quantity: Math.min(item.maxStock, quantity) }
          : item
      )
    );
  };

  const removeItem = (variationId: string) => {
    setItems((prev) => prev.filter((i) => i.variationId !== variationId));
  };

  const clearBag = () => {
    setItems([]);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const isFavorite = (productId: string) => favorites.includes(productId);

  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal =
    Math.round(
      items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0) * 100
    ) / 100;

  return (
    <BagContext.Provider
      value={{
        items,
        favorites,
        isBagOpen,
        openBag: () => setIsBagOpen(true),
        closeBag: () => setIsBagOpen(false),
        addItem,
        updateQuantity,
        removeItem,
        clearBag,
        toggleFavorite,
        isFavorite,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </BagContext.Provider>
  );
}

export function useBag() {
  const ctx = useContext(BagContext);
  if (!ctx) {
    throw new Error("useBag deve ser utilizado dentro de BagAndFavoritesProvider");
  }
  return ctx;
}
