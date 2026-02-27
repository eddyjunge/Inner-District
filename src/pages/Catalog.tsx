import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router";
import { useCart } from "../lib/cart";

export default function Catalog() {
  const products = useQuery(api.products.list);
  const { addItem } = useCart();

  if (products === undefined) return <p>Loading...</p>;

  return (
    <div>
      <h1>Products</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem" }}>
        {products.map((product) => (
          <div key={product._id} style={{ border: "1px solid #ddd", padding: "1rem", borderRadius: "8px" }}>
            <Link to={`/product/${product._id}`}>
              <h3>{product.name}</h3>
            </Link>
            <p>${(product.price / 100).toFixed(2)}</p>
            <p>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
            <button
              onClick={() => addItem(product._id)}
              disabled={product.stock === 0}
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
