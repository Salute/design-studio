/* ============================================================
   Cozy Studio — v3 (design test)
   Nav, drawer, scroll reveals, seamless marquees, FAQ, email.
   ============================================================ */

/* ── the only settings you need to touch ────────────────────
   FORM_ENDPOINT: leave "" and the form opens the visitor's mail
   client with everything filled in. Paste a JSON endpoint
   (Formspree, Basin, Getform, Netlify…) for real submissions.
   ───────────────────────────────────────────────────────── */
const STUDIO_EMAIL  = "hello@cozy.studio";
const FORM_ENDPOINT = "";

/* ── sticky nav shadow ──────────────────────────────────── */
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("is-stuck", window.scrollY > 8);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ── mobile drawer ──────────────────────────────────────── */
const burger = document.getElementById("burger");
const drawer = document.getElementById("drawer");

const setDrawer = (open) => {
  drawer.hidden = !open;
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
};

burger.addEventListener("click", () =>
  setDrawer(burger.getAttribute("aria-expanded") !== "true")
);
drawer.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => setDrawer(false))
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setDrawer(false);
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 900) setDrawer(false);
});

/* ── scroll reveal ──────────────────────────────────────── */
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealables = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && !reduced) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add("is-in"));
}

/* ── marquees ───────────────────────────────────────────────
   The CSS translates the track by -50%, so the loop is only
   seamless when the track holds exactly two identical halves.
   Duplicate the authored children once, here, rather than
   maintaining a copy of every chip in the markup.
   ───────────────────────────────────────────────────────── */
document.querySelectorAll("[data-marquee]").forEach((track) => {
  const originals = [...track.children];
  originals.forEach((node) => {
    const clone = node.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });
});

/* ── FAQ: one open at a time ────────────────────────────── */
const qas = document.querySelectorAll(".qa");
qas.forEach((qa) => {
  qa.addEventListener("toggle", () => {
    if (!qa.open) return;
    qas.forEach((other) => {
      if (other !== qa) other.open = false;
    });
  });
});

/* ── email + year, written from one place ───────────────── */
document.querySelectorAll("[data-email]").forEach((el) => {
  el.setAttribute("href", "mailto:" + STUDIO_EMAIL);
  if (el.textContent.trim().includes("@")) el.textContent = STUDIO_EMAIL;
});

document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});

/* ============================================================
   CONTACT FORM
   Same three fields, same validation and the same two delivery
   paths as designs A and B — only the styling differs.
   ============================================================ */
const form      = document.getElementById("contact-form");
const statusEl  = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");

const FIELDS   = ["name", "email", "company"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const showError = (name, message) => {
  const input = form.elements[name];
  const slot  = form.querySelector(`[data-err-for="${name}"]`);
  if (slot) slot.textContent = message;
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
};

const setStatus = (message, kind) => {
  statusEl.textContent = message;
  statusEl.className =
    "cform__status is-visible " + (kind === "ok" ? "is-ok" : "is-err");
};

const validate = () => {
  FIELDS.forEach((n) => showError(n, ""));
  const problems = [];

  const name    = form.elements.name.value.trim();
  const email   = form.elements.email.value.trim();
  const company = form.elements.company.value.trim();

  if (name.length < 2)        { showError("name", "Please tell us your name."); problems.push("name"); }
  if (!EMAIL_RE.test(email))  { showError("email", "That email doesn't look right."); problems.push("email"); }
  if (company.length < 2)     { showError("company", "Which company are you with?"); problems.push("company"); }

  if (problems.length) {
    const first = form.elements[problems[0]];
    first.focus();
    first.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }
  return problems.length === 0;
};

/* live-clear an error once the visitor starts fixing it */
FIELDS.forEach((n) => {
  form.elements[n].addEventListener("input", () => {
    if (form.elements[n].getAttribute("aria-invalid") === "true") showError(n, "");
  });
});

const collect = () => {
  const data = new FormData(form);
  return {
    name:    data.get("name").trim(),
    email:   data.get("email").trim(),
    company: data.get("company").trim(),
  };
};

const asPlainText = (d) =>
  [`Name:    ${d.name}`, `Email:   ${d.email}`, `Company: ${d.company}`].join("\n");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  /* honeypot — a bot filled the hidden field; pretend it worked */
  if (form.elements.company_website.value) {
    setStatus("Thanks — we'll be in touch shortly.", "ok");
    return;
  }

  if (!validate()) return;

  const data    = collect();
  const subject = `New enquiry — ${data.company}`;

  /* No endpoint configured → hand off to the visitor's mail client. */
  if (!FORM_ENDPOINT) {
    window.location.href =
      `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(asPlainText(data))}`;
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
      body: JSON.stringify({ ...data, _subject: subject }),
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
