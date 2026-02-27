import { Link } from "react-router";

export default function Cancel() {
  return (
    <div>
      <h1>Payment Cancelled</h1>
      <p>Your payment was cancelled. No charges were made.</p>
      <Link to="/cart">Return to Cart</Link>
    </div>
  );
}
