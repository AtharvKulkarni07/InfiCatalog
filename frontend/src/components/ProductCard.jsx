import { useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "../api.js";

export function ProductImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`img-fallback ${className}`} role="img" aria-label={alt}>
        {alt?.[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function ProductCard({ product }) {
  return (
    <Link to={`/products/${product.id}`} className="card product">
      <div className="thumb">
        <ProductImage src={product.image_url} alt={product.name} />
      </div>
      <div className="card-body">
        <div className="card-tags">
          <span className="pill-category">{product.category}</span>
          <span className="pill-brand">{product.brand}</span>
        </div>
        <h3>{product.name}</h3>
      </div>
      <div className="shelf">
        <span className="tag-price">{formatPrice(product.price)}</span>
        <span className="view-link">Details →</span>
      </div>
    </Link>
  );
}
