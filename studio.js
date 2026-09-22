/* ============================================================
   Cozy Studio — alternate design, page behaviour
   Standalone: this page does not share state with script.js.
   ============================================================ */

/* ────────────────────────────────────────────────────────────
   CONFIG — the same two settings as the original page.
   ──────────────────────────────────────────────────────────── */
const STUDIO_EMAIL  = "hello@cozy.studio";
const FORM_ENDPOINT = "";
const SPOTS_LEFT    = 2;

/* ── nav: hairline appears on scroll ────────────────────── */
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
  if (e.key === "Escape" && !drawer.hidden) { setDrawer(false); burger.focus(); }
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 960 && !drawer.hidden) setDrawer(false);
});

/* ── reveal on scroll ───────────────────────────────────── */
const revealables = document.querySelectorAll(".reveal, .step");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduced && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
  );
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add("is-in"));
}

/* ── stat counters ──────────────────────────────────────── */
const counters = document.querySelectorAll("[data-count]");

const runCount = (el) => {
  const target = Number(el.dataset.count);
  if (reduced || target === 0) { el.textContent = String(target); return; }

  const DURATION = 1100;
  const start = performance.now();

  const tick = (now) => {
    const t = Math.min((now - start) / DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3);           // easeOutCubic
    el.textContent = String(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

if ("IntersectionObserver" in window) {
  const co = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCount(entry.target);
        co.unobserve(entry.target);
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((el) => co.observe(el));
} else {
  counters.forEach((el) => (el.textContent = el.dataset.count));
}

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
      : `Fully booked — waitlist open for ${month}`;
}

/* ── footer year + email wiring ─────────────────────────── */
document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
  a.href = "mailto:" + STUDIO_EMAIL;
  if (a.hasAttribute("data-email")) a.textContent = STUDIO_EMAIL;
});

/* ── contact form ───────────────────────────────────────── */
const form = document.getElementById("contact-form");
const statusEl = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");

const REQUIRED = ["name", "email", "company"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const showError = (name, message) => {
  const input = form.elements[name];
  const slot = form.querySelector(`[data-err-for="${name}"]`);
  if (slot) slot.textContent = message;
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
};

const setStatus = (message, kind) => {
  statusEl.textContent = message;
  statusEl.className = "form__status is-visible " + (kind === "ok" ? "is-ok" : "is-err");
};

const validate = () => {
  REQUIRED.forEach((n) => showError(n, ""));
  const problems = [];

  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
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

// live-clear an error once the visitor starts fixing it
REQUIRED.forEach((n) => {
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

  // honeypot — a bot filled the hidden field; pretend it worked
  if (form.elements.company_website.value) {
    setStatus("Thanks — we'll be in touch shortly.", "ok");
    return;
  }

  if (!validate()) return;

  const data = collect();
  const subject = `New enquiry — ${data.company}`;

  /* No endpoint configured → hand off to the visitor's mail client. */
  if (!FORM_ENDPOINT) {
    window.location.href =
      `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(asPlainText(data))}`;
    setStatus(
      `Opening your email app with the details filled in. If nothing happens, send it straight to ${STUDIO_EMAIL}.`,
      "ok"
    );
    return;
  }

  /* Endpoint configured → background POST. */
  const label = submitBtn.textContent;
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
  } catch {
    setStatus(
      `Something went wrong on our end. Please email us directly at ${STUDIO_EMAIL} and we'll pick it up from there.`,
      "err"
    );
  } finally {
    submitBtn.classList.remove("is-busy");
    submitBtn.textContent = label;
  }
});
