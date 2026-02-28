import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router";
import { useCart } from "../lib/cart";

export default function Catalog() {
  const products = useQuery(api.products.list);
  const { items, addItem } = useCart();

  if (products === undefined) return <p className="loading">Loading</p>;

  return (
    <div>
      <h1 className="catalog__title">Products</h1>
      <div className="catalog__grid">
        {products.map((product, i) => {
          const inCart = items.find((it) => it.productId === product._id)?.quantity ?? 0;
          const atLimit = inCart >= product.stock;

          return (
            <div
              key={product._id}
              className="product-card"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <Link to={`/product/${product._id}`} className="product-card__link" />
              {product.images && product.images.length > 0 && (
                <div className="product-card__image-wrap">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="product-card__image"
                  />
                </div>
              )}
              <div className="product-card__body">
                <div>
                  <h3 className="product-card__name">{product.name}</h3>
                  <p className="product-card__price">
                    ${(product.price / 100).toFixed(2)}
                  </p>
                  <p className="product-card__stock">
                    {product.stock > 0 ? `${product.stock} in stock` : "Sold out"}
                  </p>
                </div>
                <button
                  className="product-card__btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    addItem(product._id);
                  }}
                  disabled={product.stock === 0 || atLimit}
                >
                  {atLimit && product.stock > 0 ? "Max in cart" : "Add to Cart"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
