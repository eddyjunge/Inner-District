import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCart } from "../lib/cart";
import { detectUserCurrency, formatPrice } from "../lib/currencyDisplay";

export default function Cart() {
  const { items, removeItem, updateQuantity, totalItems } = useCart();
  const productIds = items.map((i) => i.productId);
  const products = useQuery(
    api.products.getMultiple,
    productIds.length > 0 ? { ids: productIds } : "skip",
  );
  const exchangeRates = useQuery(api.exchangeRates.getRates);
  const refreshRates = useAction(api.exchangeRates.fetchAndCache);
  const userCurrency = useMemo(() => detectUserCurrency(), []);

  useEffect(() => {
    refreshRates();
  }, [refreshRates]);

  const rates = exchangeRates?.rates ?? null;

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
              {formatPrice(product.price, rates, userCurrency)} each
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
          Subtotal: {formatPrice(subtotal, rates, userCurrency)}
        </p>
        <Link to="/checkout">
          <button className="cart__checkout-btn">Proceed to Checkout</button>
        </Link>
      </div>
    </div>
  );
}
