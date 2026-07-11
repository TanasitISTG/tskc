import Link from "next/link";

export const metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default function AuthPlaceholderPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">TSKC account</p>
        <h1 id="auth-title">Your account<br />is on its way.</h1>
        <p>
          Sign-up and sign-in are coming soon. Until then, you can return to the home page and explore opening a store.
        </p>
        <Link className="button button-primary" href="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
