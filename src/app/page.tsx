import Link from "next/link";

const faqs = [
  {
    question: "What can I sell on TSKC?",
    answer:
      "TSKC is for digital products that can be delivered right away: keys and codes, one-time text, downloadable files, templates, guides, and creative assets.",
  },
  {
    question: "How does receipt payment work?",
    answer:
      "Buyers transfer the displayed amount and attach their receipt. The system checks it before confirming the order, so sellers can deliver with confidence.",
  },
  {
    question: "What does the subscription include?",
    answer:
      "Sellers pay THB 149 per month to open a store, manage products, and start selling on TSKC. There are no hidden packages in the first release.",
  },
];

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand" href="#top" aria-label="TSKC home">
          TSKC
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#seller">For sellers</a>
          <a href="#buyer">For buyers</a>
          <a href="#products">Products</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="header-actions">
          <Link className="button button-secondary sign-in-link" href="/auth">
            Sign in
          </Link>
          <Link className="button button-primary" href="/auth">
            Open your store
          </Link>
        </div>
        <details className="mobile-nav">
          <summary aria-label="Open navigation menu">
            <span />
            <span />
          </summary>
          <nav aria-label="Mobile navigation">
            <a href="#seller">For sellers</a>
            <a href="#buyer">For buyers</a>
            <a href="#products">Products</a>
            <a href="#pricing">Pricing</a>
            <Link href="/auth">Sign in</Link>
          </nav>
        </details>
      </header>

      <section className="hero section" id="top" aria-labelledby="hero-title">
        <p className="eyebrow">Digital commerce, made clear</p>
        <h1 id="hero-title">Sell digital goods<br />without the friction</h1>
        <div className="hero-bottom">
          <p>
            TSKC gives creators and sellers one place to open a store, sell products, and deliver them to customers.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/auth">
              Create your store
            </Link>
            <a className="text-link" href="#seller">
              See how selling works <span aria-hidden="true">↘</span>
            </a>
          </div>
        </div>
      </section>

      <section className="section workflow-section" id="seller" aria-labelledby="seller-title">
        <div className="section-heading">
          <p className="eyebrow">For sellers</p>
          <h2 id="seller-title">Set up once.<br />Keep selling.</h2>
        </div>
        <div className="workflow-grid">
          <article className="workflow-copy">
            <span className="step-number">01</span>
            <h3>Add products and stock</h3>
            <p>Add text, keys, or files to sell, with real stock counts and product details your customers can see.</p>
          </article>
          <article className="workflow-copy">
            <span className="step-number">02</span>
            <h3>Confirm orders with proof</h3>
            <p>Customers attach a transfer receipt. The system checks it before the order changes status and the product is delivered.</p>
          </article>
          <div className="product-mockup seller-mockup" aria-label="Example order-management screen">
            <div className="mockup-bar"><span /> <span /> <span /></div>
            <div className="mockup-title">Recent orders</div>
            <div className="order-row"><strong>Getting Started Guide</strong><span>Paid</span></div>
            <div className="order-row"><strong>Key: PRO-01</strong><span>Receipt pending</span></div>
            <div className="order-row"><strong>Template Pack</strong><span>Delivered</span></div>
          </div>
        </div>
      </section>

      <section className="section workflow-section buyer-section" id="buyer" aria-labelledby="buyer-title">
        <div className="section-heading">
          <p className="eyebrow">For buyers</p>
          <h2 id="buyer-title">Choose, transfer,<br />receive instantly.</h2>
        </div>
        <div className="workflow-grid workflow-grid-reverse">
          <div className="product-mockup buyer-mockup" aria-label="Example buyer storefront">
            <div className="mockup-bar"><span /> <span /> <span /></div>
            <p className="shop-label">Mild&apos;s store</p>
            <div className="mini-product"><span>Notion Guide</span><strong>THB 149</strong></div>
            <div className="mini-product"><span>Content Calendar</span><strong>THB 249</strong></div>
            <div className="mockup-button">Pay with receipt</div>
          </div>
          <article className="workflow-copy">
            <span className="step-number">01</span>
            <h3>Buy from clear storefronts</h3>
            <p>See the product details, price, and payment method before deciding to buy.</p>
          </article>
          <article className="workflow-copy">
            <span className="step-number">02</span>
            <h3>Attach your receipt</h3>
            <p>Once the receipt is checked, the key, text, or file you bought is ready in your account.</p>
          </article>
        </div>
      </section>

      <section className="section products-section" id="products" aria-labelledby="products-title">
        <div className="section-heading compact-heading">
          <p className="eyebrow">What you can sell</p>
          <h2 id="products-title">Anything you can<br />deliver on a screen.</h2>
        </div>
        <div className="product-grid">
          <article className="product-card spotlight-violet">
            <span className="card-kicker">Text and keys</span>
            <h3>Codes ready<br />with every order</h3>
            <p>Top-up codes, coupons, private links, and one-time text.</p>
          </article>
          <article className="product-card">
            <span className="card-kicker">Downloads</span>
            <h3>Send files<br />to the right people</h3>
            <p>Documents, templates, image packs, and files customers can download again.</p>
          </article>
          <article className="product-card">
            <span className="card-kicker">Guides and templates</span>
            <h3>Share how<br />you do your best work</h3>
            <p>Notion templates, e-books, worksheets, and knowledge products.</p>
          </article>
          <article className="product-card spotlight-orange">
            <span className="card-kicker">Creative work</span>
            <h3>Turn ideas into<br />products that sell</h3>
            <p>Assets, presets, fonts, sound packs, and your original digital work.</p>
          </article>
        </div>
      </section>

      <section className="section pricing-section" id="pricing" aria-labelledby="pricing-title">
        <div className="pricing-intro">
          <p className="eyebrow">Simple pricing</p>
          <h2 id="pricing-title">One price<br />to open your store.</h2>
          <p>Pay monthly to start selling, manage your store, and take care of your digital products.</p>
        </div>
        <article className="pricing-card">
          <p className="card-kicker">For sellers</p>
          <p className="price"><span>THB 149</span> / month</p>
          <ul>
            <li>Your own digital storefront</li>
            <li>Text, keys, and file products</li>
            <li>Order status and delivery</li>
            <li>Receipt checks before confirmation</li>
          </ul>
          <Link className="button button-primary" href="/auth">
            Open your store
          </Link>
        </article>
      </section>

      <section className="section receipt-section" aria-labelledby="receipt-title">
        <div>
          <p className="eyebrow">Check before delivery</p>
          <h2 id="receipt-title">A receipt is more<br />than an image.</h2>
        </div>
        <p>
          Every order begins with clear transfer evidence. Buyers attach a receipt, sellers see the status, and the system checks it before delivery.
          It reduces payment follow-up and keeps both sides clear on the next step.
        </p>
      </section>

      <section className="section faq-section" id="faq" aria-labelledby="faq-title">
        <div className="section-heading compact-heading">
          <p className="eyebrow">Frequently asked questions</p>
          <h2 id="faq-title">Start with<br />straight answers.</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question} className="faq-row">
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="closing-cta" aria-labelledby="closing-title">
        <p className="eyebrow">Ready when you are</p>
        <h2 id="closing-title">Start selling what you make.</h2>
        <Link className="button button-primary" href="/auth">
          Create your store
        </Link>
      </section>

      <footer className="site-footer">
        <Link className="brand" href="#top">TSKC</Link>
        <p>A digital storefront platform for independent sellers.</p>
        <nav aria-label="Footer navigation">
          <a href="#seller">Sellers</a>
          <a href="#buyer">Buyers</a>
          <a href="#pricing">Pricing</a>
          <Link href="/auth">Sign in</Link>
        </nav>
      </footer>
    </main>
  );
}
