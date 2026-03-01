import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCart } from "../lib/cart";
import { detectUserCurrency, formatPrice } from "../lib/currencyDisplay";

export default function ProductDetail() {
  const { id } = useParams();
  const product = useQuery(api.products.get, {
    id: id as Id<"products">,
  });
  const { items, addItem } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const exchangeRates = useQuery(api.exchangeRates.getRates);
  const refreshRates = useAction(api.exchangeRates.fetchAndCache);
  const userCurrency = useMemo(() => detectUserCurrency(), []);

  useEffect(() => {
    refreshRates();
  }, [refreshRates]);

  const rates = exchangeRates?.rates ?? null;

  if (product === undefined) return <p className="loading">Loading</p>;

  if (product === null) {
    return (
      <div className="product-detail">
        <p className="product-detail__notfound">Product not found</p>
        <Link to="/" className="product-detail__back" style={{ marginTop: "2rem" }}>
          Back to store
        </Link>
      </div>
    );
  }

  const images = product.images || [];
  const inCart = items.find((it) => it.productId === product._id)?.quantity ?? 0;
  const isDigital = (product as any).productType === "digital";
  const atLimit = isDigital ? false : inCart >= product.stock;

  return (
    <div className="product-detail">
      <Link to="/" className="product-detail__back">&larr; Back</Link>
      {images.length > 0 && (
        <div className="product-detail__gallery">
          <img
            src={images[activeImage]}
            alt={product.name}
            className="product-detail__image"
          />
          {images.length > 1 && (
            <div className="product-detail__thumbs">
              {images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className={`product-detail__thumb${i === activeImage ? " product-detail__thumb--active" : ""}`}
                  onClick={() => setActiveImage(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <h1 className="product-detail__name">{product.name}</h1>
      <p className="product-detail__desc">{product.description}</p>
      <p className="product-detail__price">
        {formatPrice(product.price, rates, userCurrency)}
      </p>
      <p className="product-detail__stock">
        {isDigital ? "Digital download" : product.stock > 0 ? `${product.stock} in stock` : "Sold out"}
        {inCart > 0 && ` · ${inCart} in cart`}
      </p>
      <button
        className="product-detail__btn"
        onClick={() => addItem(product._id)}
        disabled={!isDigital && (product.stock === 0 || atLimit)}
      >
        {atLimit && product.stock > 0 ? "Max in cart" : "Add to Cart"}
      </button>
    </div>
  );
}
