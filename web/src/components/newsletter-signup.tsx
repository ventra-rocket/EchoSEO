import { type FormEvent, useState } from "react";

type NewsletterLocale = "en" | "vi";

const COPY: Record<
  NewsletterLocale,
  {
    label: string;
    placeholder: string;
    subscribe: string;
    loading: string;
    success: string;
    error: string;
  }
> = {
  en: {
    label: "Email address",
    placeholder: "you@example.com",
    subscribe: "Subscribe",
    loading: "…",
    success: "You're on the list.",
    error: "Something went wrong",
  },
  vi: {
    label: "Địa chỉ email",
    placeholder: "ban@vidu.com",
    subscribe: "Đăng ký",
    loading: "…",
    success: "Bạn đã có trong danh sách.",
    error: "Đã có lỗi xảy ra",
  },
};

/** Newsletter subscribe form. Shared by the marketing footer and home page. */
export function NewsletterSignup({
  locale = "en",
}: {
  locale?: NewsletterLocale;
}) {
  const t = COPY[locale];
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || t.error);
      }
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : t.error);
    }
  };

  if (status === "success") {
    return (
      <p role="status" aria-live="polite" className="text-sm text-neutral-900">
        {t.success}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="on">
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          {t.label}
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.placeholder}
          disabled={status === "loading"}
          className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-500 transition focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="h-10 shrink-0 rounded-lg bg-neutral-950 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          {status === "loading" ? t.loading : t.subscribe}
        </button>
      </div>
      {status === "error" && (
        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-xs text-red-600"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}
