/* ============================================================
   Hideal: v4 ("the manual")
   Sidebar scroll-spy, the FAQ and the contact form. The demo
   screen animates itself in CSS; nothing here drives it.
   ============================================================ */

/* ── the only settings you need to touch ────────────────────
   FORM_ENDPOINT: leave "" and the form opens the visitor's mail
   client with everything filled in. Paste a JSON endpoint
   (Formspree, Basin, Getform, Netlify…) for real submissions.
   ───────────────────────────────────────────────────────── */
const STUDIO_EMAIL  = "oguzhannakyoll+design@gmail.com";
const FORM_ENDPOINT = "";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── year, written from one place ────────────────────────── */
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});

/* ── sidebar scroll-spy ─────────────────────────────────────
   The nav marks whichever section is nearest the top of the
   viewport, the way a docs sidebar tracks the page you're on.
   ───────────────────────────────────────────────────────── */
const spyLinks = [...document.querySelectorAll("[data-spy]")];
const spyTargets = spyLinks
  .map((link) => document.getElementById(link.dataset.spy))
  .filter(Boolean);

const setActive = (id) => {
  spyLinks.forEach((link) =>
    link.classList.toggle("is-active", link.dataset.spy === id)
  );
};

if (spyTargets.length) {
  const spy = () => {
    const line = 120;                       /* the "you are here" line */
    let current = null;                     /* above the first section */
    spyTargets.forEach((section) => {
      if (section.getBoundingClientRect().top <= line) current = section.id;
    });
    /* the last section can never reach the line at the page bottom */
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      current = spyTargets[spyTargets.length - 1].id;
    }
    setActive(current);
  };

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        spy();
        ticking = false;
      });
    },
    { passive: true }
  );
  spy();
}

/* ── "Let's chat" ───────────────────────────────────────────
   The href does the scrolling on its own; this only moves the
   caret into the first field so a keyboard visitor lands in the
   form rather than at the top of the section. preventScroll
   keeps it from cancelling the smooth scroll already underway.
   ───────────────────────────────────────────────────────── */
document.querySelectorAll("[data-cta]").forEach((cta) => {
  cta.addEventListener("click", () => {
    const first = document.getElementById("name");
    if (!first) return;
    setTimeout(() => first.focus({ preventScroll: true }), reduced ? 0 : 500);
  });
});

/* ── FAQ: one open at a time, and it slides ─────────────────
   <details> gives no transition of its own; the browser just
   shows or hides the body. So we take the click, animate the
   height ourselves, and only flip `open` once the close has
   finished playing.
   ───────────────────────────────────────────────────────── */
const qas = [...document.querySelectorAll(".qa")];
const SLIDE_MS = 260;

const slide = (qa, opening) => {
  const body = qa.querySelector(".qa__body");
  if (!body) {
    qa.open = opening;
    return;
  }

  /* a click mid-flight replaces whatever was already playing */
  if (qa._slide) {
    qa._slide.cancel();
    qa._slide = null;
  }

  /* the body has no height to measure until the panel is open */
  if (opening) qa.open = true;
  const full = body.scrollHeight;

  /* the body carries bottom padding, and with border-box sizing a
     height of 0 still renders that padding, so the collapse would stall
     at 12px and then snap away. Animate the padding down with it so
     the panel actually reaches zero. */
  const pad = getComputedStyle(body).paddingBottom;

  const shut = { height: "0px", paddingBottom: "0px", opacity: 0 };
  const wide = { height: full + "px", paddingBottom: pad, opacity: 1 };

  qa._slide = body.animate(
    opening ? [shut, wide] : [wide, shut],
    {
      duration: SLIDE_MS,
      easing: "cubic-bezier(.2,.7,.3,1)",
      /* hold the collapsed frame so it can't flash back to full
         height in the gap before `open` flips */
      fill: opening ? "none" : "forwards",
    }
  );

  qa._slide.onfinish = () => {
    if (!opening) qa.open = false;
    if (qa._slide) qa._slide.cancel();
    qa._slide = null;
  };
};

qas.forEach((qa) => {
  const summary = qa.querySelector("summary");

  summary.addEventListener("click", (e) => {
    e.preventDefault();                 /* we drive the open state */
    const opening = !qa.open;

    if (reduced) {
      qas.forEach((other) => { if (other !== qa) other.open = false; });
      qa.open = opening;
      return;
    }

    qas.forEach((other) => {
      if (other !== qa && other.open) slide(other, false);
    });
    slide(qa, opening);
  });
});

/* ============================================================
   CONTACT FORM
   Same three fields, same validation and the same two delivery
   paths as designs A, B and C; only the styling differs.
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

  /* honeypot: a bot filled the hidden field, so pretend it worked */
  if (form.elements.company_website.value) {
    setStatus("Thanks, we'll be in touch shortly.", "ok");
    return;
  }

  if (!validate()) return;

  const data    = collect();
  const subject = `New enquiry from ${data.company}`;

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
    setStatus("Thanks, your enquiry landed. We'll reply within one business day.", "ok");
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
