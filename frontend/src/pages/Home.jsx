import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import "./Home.css";

const SLIDE_PRODUCTS = [
  {
    id: 1,
    name: "Wireless Earbuds Pro",
    brand: "boAt",
    category: "Electronics",
    price: "₹1,999",
    badge: "Trending",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=640&q=80",
  },
  {
    id: 2,
    name: "Cold Brew Coffee Cans",
    brand: "Blue Tokai",
    category: "Beverages",
    price: "₹399",
    badge: "Popular",
    image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=640&q=80",
  },
  {
    id: 3,
    name: "Peri Peri Almond Mix",
    brand: "Happilo",
    category: "Snacks",
    price: "₹349",
    badge: "Healthy",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=640&q=80",
  },
  {
    id: 4,
    name: "Rose Water Face Toner",
    brand: "Forest Essentials",
    category: "Personal Care",
    price: "₹695",
    badge: "Pure",
    image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=640&q=80",
  },
  {
    id: 5,
    name: "Noise-Cancelling Headphones",
    brand: "Sony",
    category: "Electronics",
    price: "₹7,499",
    badge: "Top Rated",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=640&q=80",
  },
  {
    id: 6,
    name: "Dark Chocolate 70% Cocoa",
    brand: "Lindt",
    category: "Snacks",
    price: "₹220",
    badge: "Deluxe",
    image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=640&q=80",
  },
  {
    id: 7,
    name: "Sparkling Lemon Water",
    brand: "Bisleri",
    category: "Beverages",
    price: "₹45",
    badge: "Refreshing",
    image: "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=640&q=80",
  },
  {
    id: 8,
    name: "Floor Cleaner Lavender",
    brand: "Lizol",
    category: "Home Care",
    price: "₹195",
    badge: "Essential",
    image: "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=640&q=80",
  },
];

function CheckIcon() {
  return (
    <span className="check" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
      </svg>
    </span>
  );
}

export default function Home() {
  const { user } = useAuth();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section with hero-main.png Background */}
      <section className="hero hero-custom-bg" id="home">
        <div className="container hero-grid">
          <div className="hero-copy-wrap">
            <h1>
              Every product.
              <span>One clearer view.</span>
            </h1>
            <p className="hero-copy">
              A smarter, unified workspace to organise products, enrich catalog data, and discover inventory instantly.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-yellow" to="/catalog">
                Explore Global Catalog <span className="arrow">↗</span>
              </Link>
              {user ? (
                <Link className="btn btn-outline-light" to="/products">
                  My Catalog ↗
                </Link>
              ) : (
                <Link className="btn btn-outline-light" to="/login">
                  Sign in ↗
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sliding Catalog Showcase */}
      <section className="sliding-catalog-section">
        <div className="container">
          <div className="sliding-head">
            <div>
              <div className="kicker">CURATED COLLECTION</div>
              <h2>Trending in the Catalog</h2>
            </div>
            <Link className="btn btn-outline-dark" to="/catalog">
              View All Products <span className="arrow">↗</span>
            </Link>
          </div>
        </div>
        <div className="sliding-marquee-wrap" aria-label="Sliding catalog items">
          <div className="sliding-marquee-track">
            {[...SLIDE_PRODUCTS, ...SLIDE_PRODUCTS].map((item, idx) => (
              <Link
                key={`${item.id}-${idx}`}
                to={`/catalog?category=${encodeURIComponent(item.category)}`}
                className="slide-card"
              >
                <div className="slide-card-img-wrap">
                  <img src={item.image} alt={item.name} loading="lazy" />
                  <span className="slide-badge">{item.badge}</span>
                </div>
                <div className="slide-card-body">
                  <span className="slide-meta">{item.brand} • {item.category}</span>
                  <h3 className="slide-title">{item.name}</h3>
                  <span className="slide-price">{item.price}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Core features */}
      <section className="section section-soft" id="features">
        <div className="container">
          <div className="section-heading reveal">
            <div className="kicker">A CATALOG THAT WORKS FOR YOU</div>
            <h2>
              From product sprawl
              <br />
              to product clarity.
            </h2>
            <p>
              Bring your catalog into focus with a workspace designed to make everyday product management feel simple.
            </p>
          </div>
          <div className="features">
            <article className="feature reveal">
              <span className="number">01</span>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </div>
              <h3>Everything, organised</h3>
              <p>
                Keep product details, brands, categories, pricing, and descriptions together in one dependable source of truth.
              </p>
            </article>

            <article className="feature reveal delay-1">
              <span className="number">02</span>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" />
                  <circle cx="12" cy="12" r="5" />
                  <path d="m10 12 1.3 1.3L14.5 10" />
                </svg>
              </div>
              <h3>Details that stand out</h3>
              <p>
                Create richer product listings with helpful descriptions and consistent information that is easier to browse and understand.
              </p>
            </article>

            <article className="feature reveal delay-2">
              <span className="number">03</span>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="10.8" cy="10.8" r="6.8" />
                  <path d="m16 16 4.5 4.5M8 10.8h5.6M10.8 8v5.6" />
                </svg>
              </div>
              <h3>Find it naturally</h3>
              <p>
                Move beyond endless scrolling. Search by the words you know and narrow results with practical filters and sorting.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Product catalog showcase */}
      <section className="section" id="discover">
        <div className="container split">
          <div className="split-visual reveal">
            <img
              src="/assets/home1.png"
              alt="Illustrated product shelves showing a wide, organised catalog"
              loading="lazy"
            />
          </div>
          <div className="split-copy reveal delay-1">
            <div className="kicker">BUILT FOR EVERYDAY MOMENTUM</div>
            <h2>Your products, in their right place.</h2>
            <p>
              A great catalog is more than a list. InfiCatalog gives every product a clear home, so your team can spend less time maintaining information and more time putting it to work.
            </p>
            <ul className="check-list">
              <li>
                <CheckIcon />
                <span>Keep product information consistent and easy to update.</span>
              </li>
              <li>
                <CheckIcon />
                <span>Browse by category, brand, price, or the detail that matters.</span>
              </li>
              <li>
                <CheckIcon />
                <span>Move from a product overview to the details in just a click.</span>
              </li>
            </ul>
            <Link className="btn btn-yellow" to="/catalog">
              Explore Global Catalog <span className="arrow">↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* AI product intelligence */}
      <section className="section section-soft" id="ai-search">
        <div className="container">
          <div className="ai-band reveal">
            <div className="ai-visual-wrap">
              <div className="ai-image-card">
                <img
                  src="/assets/home2.png"
                  alt="AI powered product intelligence"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="ai-band-copy">
              <div className="kicker">A LITTLE HELP FROM AI</div>
              <h2>
                Better product details.
                <br />
                Less blank-page time.
              </h2>
              <p>
                Turn a few essentials into a helpful starting point for your product copy. Let AI help shape the words, then review and make them yours.
              </p>
              <Link className="btn btn-yellow" to={user ? "/products" : "/register"}>
                Try InfiCatalog <span className="arrow">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Discover feature showcase with home3.png */}
      <section className="section" id="search-feature">
        <div className="container split split-reverse">
          <div className="split-visual alt-bg reveal">
            <img
              src="/assets/home3.png"
              alt="Search and discover products instantly"
              loading="lazy"
            />
          </div>
          <div className="split-copy reveal delay-1">
            <div className="kicker">SEARCH AND DISCOVERY</div>
            <h2>Search and discover products instantly.</h2>
            <p>
              Find whatever you need naturally. Browse with live facets, explore by category and brand, or search by ordinary words to uncover relevant items with zero friction.
            </p>
            <ul className="check-list">
              <li>
                <CheckIcon />
                <span>Type natural queries to pinpoint products right away.</span>
              </li>
              <li>
                <CheckIcon />
                <span>Filter dynamically by price ranges, brand names, and categories.</span>
              </li>
              <li>
                <CheckIcon />
                <span>Sort by prices or newest additions to keep product flows smooth.</span>
              </li>
            </ul>
            <Link className="btn btn-yellow" to="/catalog">
              Explore Global Catalog <span className="arrow">↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section section-soft" id="how-it-works">
        <div className="container">
          <div className="section-heading reveal">
            <div className="kicker">SIMPLE BY DESIGN</div>
            <h2>
              Good catalog habits
              <br />
              start right here.
            </h2>
            <p>
              Everything you need to get from product information to a catalog your team can actually use.
            </p>
          </div>
          <div className="steps">
            <article className="step reveal">
              <h3>Bring products together</h3>
              <p>
                Add your products and keep essential information in one organised place.
              </p>
            </article>
            <article className="step reveal delay-1">
              <h3>Enrich the details</h3>
              <p>
                Build clearer descriptions and make product information more useful and consistent.
              </p>
            </article>
            <article className="step reveal delay-2">
              <h3>Search with confidence</h3>
              <p>
                Find, filter, sort, and open the right product without losing your flow.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card reveal">
            <div className="kicker">A CLEARER CATALOG STARTS NOW</div>
            <h2>Ready to put your products in focus?</h2>
            <p>
              Bring your catalog together and make product discovery feel refreshingly simple.
            </p>
            <div className="cta-actions">
              <Link className="btn btn-yellow" to={user ? "/products" : "/register"}>
                Get started with InfiCatalog <span className="arrow">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <img
                src="/assets/logo.png"
                alt="InfiCatalog"
                className="brand-logo-img"
                style={{ height: "36px", width: "auto", marginBottom: "0.85rem" }}
              />
              <p>
                A clearer, more considered home for every product in your catalog.
              </p>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <strong>Explore</strong>
                <a href="#features">Platform</a>
                <a href="#discover">Product catalog</a>
                <a href="#ai-search">AI assistance</a>
              </div>
              <div className="footer-col">
                <strong>Your workspace</strong>
                {user ? (
                  <>
                    <Link to="/products">Product catalog</Link>
                    <Link to="/products/new">Add product</Link>
                  </>
                ) : (
                  <>
                    <Link to="/login">Log in</Link>
                    <Link to="/register">Create account</Link>
                  </>
                )}
                <a href="#home">Back to top ↑</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 InfiCatalog. A product catalog, made clearer.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
