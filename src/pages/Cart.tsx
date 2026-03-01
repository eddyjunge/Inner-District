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
        <h1 className="cart__title">Cart</h1>
        <p className="cart__empty">
          Your cart is empty. <Link to="/">Browse products</Link>
        </p>
      </div>
    );
  }

  if (products === undefined) return <p className="loading">Loading</p>;

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
      <h1 className="cart__title">Cart</h1>
      {cartWithProducts.map(({ productId, quantity, product }) => (
        <div key={productId} className="cart-item">
          <div>
            <div className="cart-item__name">{product.name}</div>
            <div className="cart-item__price">
              €{(product.price / 100).toFixed(2)} each
              {quantity >= product.stock && (
                <span className="cart-item__limit"> · max reached</span>
              )}
            </div>
          </div>
          <div className="cart-item__controls">
            <button
              className="cart-item__qty-btn"
              onClick={() => updateQuantity(productId, quantity - 1)}
            >
              -
            </button>
            <span className="cart-item__qty">{quantity}</span>
            <button
              className="cart-item__qty-btn"
              onClick={() => updateQuantity(productId, quantity + 1)}
              disabled={quantity >= product.stock}
            >
              +
            </button>
            <button
              className="cart-item__remove"
              onClick={() => removeItem(productId)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <div className="cart__footer">
        <p className="cart__subtotal">
          Subtotal: €{(subtotal / 100).toFixed(2)}
        </p>
        <Link to="/checkout">
          <button className="cart__checkout-btn">Proceed to Checkout</button>
        </Link>
      </div>
    </div>
  );
}
