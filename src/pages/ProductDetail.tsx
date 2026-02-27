import { useParams, Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCart } from "../lib/cart";

export default function ProductDetail() {
  const { id } = useParams();
  const product = useQuery(api.products.get, {
    id: id as Id<"products">,
  });
  const { addItem } = useCart();

  if (product === undefined) return <p>Loading...</p>;
  if (product === null) return <p>Product not found. <Link to="/">Back to store</Link></p>;

  return (
    <div>
      <Link to="/">&larr; Back</Link>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
        ${(product.price / 100).toFixed(2)}
      </p>
      <p>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
      <button
        onClick={() => addItem(product._id)}
        disabled={product.stock === 0}
      >
        Add to Cart
      </button>
    </div>
  );
}
