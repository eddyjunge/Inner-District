import { Link } from "react-router";

export default function Cancel() {
  return (
    <div className="status-page">
      <h1 className="status-page__title">Payment Cancelled</h1>
      <p className="status-page__detail">
        Your payment was cancelled. No charges were made.
      </p>
      <Link to="/cart" className="status-page__link">
        &larr; Return to Cart
      </Link>
    </div>
  );
}
