import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "../lib/cart";

export default function Cart() {
  const { items, removeItem, updateQuantity, totalItems } = useCart();
  const productIds = items.map((i) => i.productId);
  const products = useQuery(
    api.products.getMultiple,
    productIds.length > 0 ? { ids: productIds } : "skip",
  );

  if (totalItems === 0) {
    return (
      <div>
        <h1>Cart</h1>
        <p>Your cart is empty. <Link to="/">Browse products</Link></p>
      </div>
    );
  }

  if (products === undefined) return <p>Loading...</p>;

  const cartWithProducts = items
    .map((item) => {
      const product = products.find((p) => p._id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  const subtotal = cartWithProducts.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0,
  );

  return (
    <div>
      <h1>Cart</h1>
      {cartWithProducts.map(({ productId, quantity, product }) => (
        <div key={productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
          <div>
            <strong>{product.name}</strong>
            <span> — ${(product.price / 100).toFixed(2)} each</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button onClick={() => updateQuantity(productId, quantity - 1)}>-</button>
            <span>{quantity}</span>
            <button onClick={() => updateQuantity(productId, quantity + 1)}>+</button>
            <button onClick={() => removeItem(productId)}>Remove</button>
          </div>
        </div>
      ))}
      <p style={{ marginTop: "1rem", fontSize: "1.2rem" }}>
        Subtotal: ${(subtotal / 100).toFixed(2)}
      </p>
      <Link to="/checkout">
        <button>Proceed to Checkout</button>
      </Link>
    </div>
  );
}
