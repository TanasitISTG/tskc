import Link from "next/link";

const faqs = [
  {
    question: "What am I buying?",
    answer:
      "A single subscription plan for your own branded website. It is a home for your business, not a marketplace account.",
  },
  {
    question: "Do my visitors need TSKC accounts?",
    answer:
      "No. TSKC is built around your business having a direct web presence. Visitor account features are not part of this product model.",
  },
  {
    question: "Can I start with one plan?",
    answer:
      "Yes. The first release has one straightforward monthly plan, so every seller gets the same clear starting point.",
  },
];

export default function Home() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand" href="#top" aria-label="TSKC home">TSKC</Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#website">Your website</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Plan</a>
        </nav>
        <div className="header-actions">
          <Link className="button button-secondary sign-in-link" href="/auth">Sign in</Link>
          <Link className="button button-primary" href="/auth">Get your website</Link>
        </div>
        <details className="mobile-nav">
          <summary aria-label="Open navigation menu"><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            <a href="#website">Your website</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Plan</a>
            <Link href="/auth">Sign in</Link>
          </nav>
        </details>
      </header>

      <section className="hero section" id="top" aria-labelledby="hero-title">
        <p className="eyebrow">A home online for independent businesses</p>
        <h1 id="hero-title">Your brand<br />deserves its own site.</h1>
        <div className="hero-bottom">
          <p>TSKC sells one simple plan: a branded website that gives your business a clear, professional place to live online.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/auth">Choose your plan</Link>
            <a className="text-link" href="#website">See what&apos;s included <span aria-hidden="true">↘</span></a>
          </div>
        </div>
      </section>

      <section className="section website-section" id="website" aria-labelledby="website-title">
        <div className="section-heading">
          <p className="eyebrow">One account. One branded website.</p>
          <h2 id="website-title">A direct home for<br />your business.</h2>
        </div>
        <div className="website-grid">
          <article className="workflow-copy"><p className="step-number">01</p><h3>Make it recognisably yours</h3><p>Bring together your business name, visual identity, and essential information in one calm, professional destination.</p></article>
          <article className="workflow-copy"><p className="step-number">02</p><h3>Keep the message clear</h3><p>Give visitors a focused place to understand who you are, what you offer, and how to reach you.</p></article>
          <div className="site-mockup" aria-label="Example branded business website">
            <div className="mockup-bar"><span /> <span /> <span /></div>
            <p className="mockup-brand">SORA STUDIO</p>
            <div className="mockup-hero">A considered<br />home for work<br />with character.</div>
            <div className="mockup-nav"><span>About</span><span>Work</span><span>Contact</span></div>
          </div>
        </div>
      </section>

      <section className="section steps-section" id="how-it-works" aria-labelledby="steps-title">
        <div className="section-heading compact-heading"><p className="eyebrow">From plan to presence</p><h2 id="steps-title">A short path to<br />your own corner<br />of the web.</h2></div>
        <div className="product-grid">
          <article className="product-card spotlight-violet"><p className="card-kicker">Choose the plan</p><h3>One clear<br />starting point</h3><p>Create an account and subscribe to the single website plan.</p></article>
          <article className="product-card"><p className="card-kicker">Shape the site</p><h3>Put your brand<br />at the centre</h3><p>Set up the essentials that make the website unmistakably yours.</p></article>
          <article className="product-card"><p className="card-kicker">Publish</p><h3>Give people<br />a way in</h3><p>Share a focused website that represents your business directly.</p></article>
          <article className="product-card spotlight-orange"><p className="card-kicker">Manage</p><h3>Keep your home<br />up to date</h3><p>Use one seller account to manage the subscription and your website.</p></article>
        </div>
      </section>

      <section className="section pricing-section" id="pricing" aria-labelledby="pricing-title">
        <div className="pricing-intro"><p className="eyebrow">One plan. No role selection.</p><h2 id="pricing-title">Everything starts<br />with your website.</h2><p>There is no buyer side, marketplace catalogue, or separate seller tier. You subscribe as the business owner.</p></div>
        <article className="pricing-card"><p className="card-kicker">Branded website plan</p><p className="price"><span>THB 149</span> / month</p><ul><li>One branded business website</li><li>One seller account to manage it</li><li>Plan and website setup flow</li><li>Direct, focused public presence</li></ul><Link className="button button-primary" href="/auth">Get your website</Link></article>
      </section>

      <section className="section faq-section" id="faq" aria-labelledby="faq-title">
        <div className="section-heading compact-heading"><p className="eyebrow">Frequently asked questions</p><h2 id="faq-title">A simple product<br />should have<br />straight answers.</h2></div>
        <div className="faq-list">{faqs.map((faq) => <details key={faq.question} className="faq-row"><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
      </section>

      <section className="closing-cta" aria-labelledby="closing-title"><p className="eyebrow">Your next address online</p><h2 id="closing-title">Build the website<br />your brand needs.</h2><Link className="button button-primary" href="/auth">Choose your plan</Link></section>

      <footer className="site-footer"><Link className="brand" href="#top">TSKC</Link><p>Branded websites for independent businesses.</p><nav aria-label="Footer navigation"><a href="#website">Website</a><a href="#pricing">Plan</a><Link href="/auth">Sign in</Link></nav></footer>
    </main>
  );
}
