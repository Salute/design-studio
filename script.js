/* ============================================================
   Cozy Studio — site behaviour
   ============================================================ */

/* ────────────────────────────────────────────────────────────
   CONFIG — edit these two lines and nothing else.

   STUDIO_EMAIL : where enquiries should land.
   FORM_ENDPOINT: leave "" and the form opens the visitor's mail
                  client pre-filled (works with zero setup).
                  Paste a Formspree / Basin / Netlify / your own
                  POST URL here and it submits in the background
                  instead. e.g. "https://formspree.io/f/abcdwxyz"
   ──────────────────────────────────────────────────────────── */
const STUDIO_EMAIL  = "hello@cozy.studio";

/* Spots open for NEXT month. Set to 0 when you're full — the badge
   switches to a waitlist message on its own. The month name is
   always computed, so it never goes stale. */
const SPOTS_LEFT = 2;
const FORM_ENDPOINT = "";

/* ── nav: shadow on scroll ──────────────────────────────── */
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("is-stuck", window.scrollY > 8);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ── mobile menu ────────────────────────────────────────── */
const burger = document.getElementById("burger");
const menu = document.getElementById("mobile-menu");

const setMenu = (open) => {
  menu.hidden = !open;
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
};

burger.addEventListener("click", () => {
  setMenu(burger.getAttribute("aria-expanded") !== "true");
});
menu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => setMenu(false))
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menu.hidden) { setMenu(false); burger.focus(); }
});
// close the menu if the viewport grows past the mobile breakpoint
window.addEventListener("resize", () => {
  if (window.innerWidth > 860 && !menu.hidden) setMenu(false);
});

/* ── reveal on scroll ───────────────────────────────────── */
const revealables = document.querySelectorAll(".reveal");
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add("is-in"));
}

/* ── FAQ: one open at a time ────────────────────────────── */
const faqItems = document.querySelectorAll(".faq__item");
faqItems.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    faqItems.forEach((other) => { if (other !== item) other.open = false; });
  });
});

/* ── footer year + email wiring ─────────────────────────── */
document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
  a.href = "mailto:" + STUDIO_EMAIL;
  if (a.id === "direct-email" || a.textContent.includes("@")) a.textContent = STUDIO_EMAIL;
});

/* ── availability badge ─────────────────────────────────── */
const nextMonthName = () => {
  const d = new Date();
  d.setDate(1);                    // avoids the Jan 31 -> Mar 3 rollover
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleString("en-US", { month: "long" });
};

const availabilityEl = document.getElementById("availability");
if (availabilityEl) {
  const month = nextMonthName();
  availabilityEl.textContent =
    SPOTS_LEFT > 0
      ? `${SPOTS_LEFT} ${SPOTS_LEFT === 1 ? "spot" : "spots"} left for ${month}`
      : `Fully booked — join the waitlist for ${month}`;
}

/* ── contact form ───────────────────────────────────────── */
const form = document.getElementById("contact-form");
const statusEl = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const showError = (name, message) => {
  const input = form.elements[name];
  const slot = form.querySelector(`[data-err-for="${name}"]`);
  if (slot) slot.textContent = message;
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
};

const clearErrors = () => {
  ["name", "email", "company"].forEach((n) => showError(n, ""));
};

const setStatus = (message, kind) => {
  statusEl.textContent = message;
  statusEl.className = "form__status is-visible " + (kind === "ok" ? "is-ok" : "is-err");
};

const validate = () => {
  clearErrors();
  const problems = [];

  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const company = form.elements.company.value.trim();

  if (name.length < 2) { showError("name", "Please tell us your name."); problems.push("name"); }
  if (!EMAIL_RE.test(email)) { showError("email", "That email doesn't look right."); problems.push("email"); }
  if (company.length < 2) { showError("company", "Which company are you with?"); problems.push("company"); }

  if (problems.length) {
    const first = form.elements[problems[0]];
    first.focus();
    first.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  return problems.length === 0;
};

// live-clear an error once the visitor starts fixing it
["name", "email", "company"].forEach((n) => {
  form.elements[n].addEventListener("input", () => {
    if (form.elements[n].getAttribute("aria-invalid") === "true") showError(n, "");
  });
});

const collect = () => {
  const data = new FormData(form);
  return {
    name: data.get("name").trim(),
    email: data.get("email").trim(),
    company: data.get("company").trim(),
  };
};

const asPlainText = (d) =>
  [`Name:    ${d.name}`, `Email:   ${d.email}`, `Company: ${d.company}`].join("\n");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // honeypot — a bot filled the hidden field; pretend it worked
  if (form.elements.company_website.value) {
    setStatus("Thanks — we'll be in touch shortly.", "ok");
    return;
  }

  if (!validate()) return;

  const data = collect();

  /* No endpoint configured → hand off to the visitor's mail client. */
  if (!FORM_ENDPOINT) {
    const subject = `New enquiry — ${data.company}`;
    window.location.href =
      `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(asPlainText(data))}`;
    setStatus(
      `Opening your email app with the details filled in. If nothing happens, send it straight to ${STUDIO_EMAIL}.`,
      "ok"
    );
    return;
  }

  /* Endpoint configured → background POST. */
  submitBtn.classList.add("is-busy");
  submitBtn.textContent = "Sending…";

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, _subject: `New enquiry — ${data.company}` }),
    });

    if (!res.ok) throw new Error("Bad response " + res.status);

    form.reset();
    setStatus("Thanks — your enquiry landed. We'll reply within one business day.", "ok");
  } catch (err) {
    setStatus(
      `Something went wrong on our end. Please email us directly at ${STUDIO_EMAIL} and we'll pick it up from there.`,
      "err"
    );
  } finally {
    submitBtn.classList.remove("is-busy");
    submitBtn.textContent = "Send enquiry";
  }
});
