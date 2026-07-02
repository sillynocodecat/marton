/* MARATHON // TAU CETI IV — fan landing interactions */
(() => {
  "use strict";

  const shotMode = new URLSearchParams(location.search).has("shot"); // static capture
  const reduced =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches || shotMode;
  if (shotMode) {
    document.documentElement.classList.add("static");
    // headless captures render from the document top: shift content instead of scrolling
    const at = new URLSearchParams(location.search).get("at");
    const target = at && document.getElementById(at);
    if (target) {
      const top = Math.round(target.getBoundingClientRect().top + window.scrollY);
      document.body.style.transform = `translateY(${-top}px)`;
    }
  }

  /* ---------- boot sequence ---------- */
  const boot = document.getElementById("boot");
  const bootLog = document.getElementById("boot-log");

  const BOOT_LINES = [
    "UESC FIELD TERMINAL v7.2.1",
    "ESTABLISHING UPLINK ........ OK",
    "SIGNAL SOURCE // TAU CETI IV",
    "RUNNER AUTHENTICATION ..... OK",
    "CAUTION: 30,000 SOULS UNACCOUNTED FOR",
    "> WELCOME TO THE MARATHON_",
  ];

  function endBoot() {
    if (!boot || boot.classList.contains("done")) return;
    boot.classList.add("done");
    setTimeout(() => boot.classList.add("gone"), 750);
  }

  if (boot && bootLog && !reduced) {
    document.body.style.overflow = "hidden";

    // time-based typing: stays correct in throttled/background tabs
    const CHAR_MS = 7;
    const LINE_PAUSE = 110;
    const schedule = [];
    let acc = 0;
    BOOT_LINES.forEach((line) => {
      schedule.push({ line, start: acc, end: acc + line.length * CHAR_MS });
      acc += line.length * CHAR_MS + LINE_PAUSE;
    });
    const total = acc + 240;
    const t0 = performance.now();
    let raf = 0;

    const finish = () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
      endBoot();
    };

    const render = () => {
      const elapsed = performance.now() - t0;
      let out = "";
      for (const s of schedule) {
        if (elapsed >= s.end) {
          out += s.line + "\n";
        } else {
          if (elapsed > s.start) out += s.line.slice(0, Math.ceil((elapsed - s.start) / CHAR_MS));
          break;
        }
      }
      bootLog.textContent = out;
      if (elapsed >= total) finish();
      else raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    // hard safety: never keep the page locked, even if rAF is suspended
    setTimeout(() => {
      if (!boot.classList.contains("done")) {
        bootLog.textContent = BOOT_LINES.join("\n");
        finish();
      }
    }, 5000);

    boot.addEventListener("click", finish);
  } else if (boot) {
    boot.classList.add("gone");
  }

  /* ---------- nav ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* active nav link */
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const sections = navLinks
    .map((a) => document.getElementById(a.dataset.nav))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) =>
            a.classList.toggle("is-active", a.dataset.nav === entry.target.id)
          );
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => navObserver.observe(s));
  }

  /* ---------- scroll reveal ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- counters ---------- */
  const counters = document.querySelectorAll("[data-count]");
  const fmt = (n, comma) =>
    comma ? Math.round(n).toLocaleString("en-US") : String(Math.round(n));

  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    const comma = el.hasAttribute("data-comma");
    if (reduced) {
      el.textContent = fmt(target, comma);
      return;
    }
    const dur = 1400;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased, comma);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => counterObserver.observe(el));
  } else {
    counters.forEach((el) => {
      el.textContent = fmt(parseInt(el.dataset.count, 10), el.hasAttribute("data-comma"));
    });
  }

  /* ---------- terminal autotype ---------- */
  const term = document.getElementById("term-body");
  const TERM_LINES = [
    "> 2794.07.25 — CONTACT LOST: UESC MARATHON",
    "> 2795.11.02 — COLONY STATUS: UNKNOWN",
    "> 2812.03.13 — BIO-EVENT LOGGED // QUARANTINE",
    "> 2827.--.-- — ANOMALY ERUPTION DETECTED",
    "> 2893.__.__ — SALVAGE AUTHORIZATION GRANTED",
    "> 30,000 SOULS. ZERO REMAINS.",
    "> RUN._",
  ];

  if (term) {
    let started = false;
    const runTerm = () => {
      if (started) return;
      started = true;
      if (reduced) {
        term.textContent = TERM_LINES.join("\n");
        return;
      }
      let li = 0;
      let ci = 0;
      let done = "";
      const typeTerm = () => {
        if (li >= TERM_LINES.length) return;
        const cur = TERM_LINES[li];
        ci++;
        if (ci >= cur.length) {
          done += cur + "\n";
          term.textContent = done;
          li++;
          ci = 0;
          setTimeout(typeTerm, 320);
        } else {
          term.textContent = done + cur.slice(0, ci) + "▓";
          setTimeout(typeTerm, 18);
        }
      };
      typeTerm();
    };

    if ("IntersectionObserver" in window) {
      const termObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            runTerm();
            termObserver.disconnect();
          }
        },
        { threshold: 0.4 }
      );
      termObserver.observe(term);
    } else {
      runTerm();
    }
  }

  /* ---------- compass strip ---------- */
  const compass = document.getElementById("compass-track");
  if (compass) {
    const cards = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    let html = "";
    // two identical halves for a seamless -50% loop
    for (let half = 0; half < 2; half++) {
      for (let i = 0; i < 16; i++) {
        const cardinal = i % 2 === 0 ? cards[(i / 2) % 8] : null;
        const deg = String(i * 22.5 % 360).padStart(3, "0");
        html += cardinal
          ? `<span class="card">${cardinal}</span>`
          : `<span>${deg}°</span>`;
        html += `<span>·</span><span>${(200 + i * 7) % 999}</span>`;
      }
    }
    compass.innerHTML = html;
  }

  /* ---------- generic tabs (zones + runners) ---------- */
  function setupTabs(listSelector, btnSelector, panelSelector) {
    const lists = document.querySelectorAll(listSelector);
    lists.forEach((list) => {
      const buttons = [...list.querySelectorAll(btnSelector)];
      const root = list.parentElement;
      const panels = [...root.querySelectorAll(panelSelector)];

      const activate = (btn) => {
        buttons.forEach((b) => {
          const on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
          b.tabIndex = on ? 0 : -1;
        });
        panels.forEach((p) => {
          const on = p.id === btn.dataset.target;
          p.classList.toggle("is-active", on);
          p.toggleAttribute("hidden", !on);
        });
      };

      buttons.forEach((b) => (b.tabIndex = b.classList.contains("is-active") ? 0 : -1));

      buttons.forEach((btn, i) => {
        btn.addEventListener("click", () => activate(btn));
        btn.addEventListener("keydown", (e) => {
          let next = null;
          if (e.key === "ArrowDown" || e.key === "ArrowRight") next = buttons[(i + 1) % buttons.length];
          if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = buttons[(i - 1 + buttons.length) % buttons.length];
          if (e.key === "Home") next = buttons[0];
          if (e.key === "End") next = buttons[buttons.length - 1];
          if (next) {
            e.preventDefault();
            next.focus();
            activate(next);
          }
        });
      });
    });
  }

  setupTabs(".zone-tabs", ".zone-btn", ".zone-panel");
  setupTabs(".runner-list", ".runner-btn", ".runner-panel");

  /* ---------- NuCaloric vending terminal (gimmick) ---------- */
  const naSec = document.getElementById("supply");
  const vendBtn = document.getElementById("na-vend");
  if (naSec && vendBtn) {
    // names -> Shapiro, numbers/specs -> mono. The NuCaloric face lives only on
    // the .na-plate stamp. Slots A1..B3 are stocked; the C row is sold out.
    const RATIONS = [
      { code: "A1", name: "GREENLOAF", spec: "RESTORES 45 HP // OVER 6S",
        flavor: "Compressed marsh algae. Legally classified as food. Essentially.",
        price: "01.00", qty: 3, stamp: "INSPECTED",
        f: { cal: 2000, prot: 40, protdv: 80, rec: 31, water: 90, waterdv: 45, sodium: 1900, soddv: 95, soma: 12, somadv: 100, morale: 3, moraledv: 12 } },
      { code: "A2", name: "HAZARD JELLY", spec: "+30% HAZARD RESISTANCE // 120S",
        flavor: "Coats the stomach lining. Tastes faintly of warning labels.",
        price: "01.20", qty: 5, stamp: "CONTAINS WARNINGS",
        f: { cal: 1400, prot: 12, protdv: 24, rec: 9, water: 40, waterdv: 20, sodium: 2200, soddv: 110, soma: 28, somadv: 100, morale: 1, moraledv: 4 } },
      { code: "A3", name: "PROTEIN SLURRY", spec: "SHIELD REGEN +25% // 90S",
        flavor: "Nine essential proteins. Two known toxins. One favorite from home.",
        price: "02.00", qty: 2, stamp: "SHARE WITH FRIEND",
        f: { cal: 3100, prot: 88, protdv: 176, rec: 71, water: 20, waterdv: 10, sodium: 1600, soddv: 80, soma: 6, somadv: 50, morale: 2, moraledv: 8 } },
      { code: "B1", name: "SELF-REVIVE GEL", spec: "SELF-REVIVE CHARGE ×1",
        flavor: "Death is a temporary logistics problem.",
        price: "09.00", qty: 1, stamp: "DEATH DEFERRED",
        f: { cal: 900, prot: 4, protdv: 8, rec: 4, water: 10, waterdv: 5, sodium: 800, soddv: 40, soma: 44, somadv: 367, morale: 0, moraledv: 0 } },
      { code: "B2", name: "STIM PASTE", spec: "SPRINT HEAT −20% // 60S",
        flavor: "Move faster. Think about it later.",
        price: "02.50", qty: 4, stamp: "DO NOT QUESTION",
        f: { cal: 2600, prot: 22, protdv: 44, rec: 15, water: 15, waterdv: 8, sodium: 2900, soddv: 145, soma: 61, somadv: 508, morale: 9, moraledv: 36 } },
      { code: "B3", name: "FIELD RATION", spec: "CURES TOXIN // HEALS 20 HP",
        flavor: "Best before: the day the colony fell. A favorite from home, essentially.",
        price: "00.50", qty: 3, stamp: "EXPIRED — ISSUE ANYWAY",
        f: { cal: 1800, prot: 30, protdv: 60, rec: 24, water: 60, waterdv: 30, sodium: 2000, soddv: 100, soma: 9, somadv: 75, morale: 4, moraledv: 16 } },
    ];
    const byCode = {};
    RATIONS.forEach((r) => (byCode[r.code] = r));

    const $ = (id) => document.getElementById(id);
    const nameEl = $("na-name"), specEl = $("na-spec"), flavorEl = $("na-flavor");
    const creditEl = $("na-credit"), stockEl = $("na-stock");
    const statusEl = $("na-status"), echoEl = $("na-echo"), stampEl = $("na-stamp");
    const win = $("na-window"), receipts = $("na-receipts");
    const slots = [...naSec.querySelectorAll(".slot")];

    const numFields = [
      ["rf-cal", "cal", 4], ["rf-prot", "prot", 0], ["rf-protdv", "protdv", 0],
      ["rf-rec", "rec", 0], ["rf-water", "water", 0], ["rf-waterdv", "waterdv", 0],
      ["rf-sodium", "sodium", 0], ["rf-soddv", "soddv", 0], ["rf-soma", "soma", 0],
      ["rf-somadv", "somadv", 0], ["rf-morale", "morale", 0], ["rf-moraledv", "moraledv", 0],
    ].map(([id, key, w]) => ({ el: $(id), key, w })).filter((x) => x.el);

    const pad = (n, w) => { const s = String(Math.round(n)); return w ? s.padStart(w, "0") : s; };

    let current = RATIONS[0].f; // currently displayed facts (source for number rolls)
    let sel = RATIONS[0];
    const stock = {};
    RATIONS.forEach((r) => (stock[r.code] = r.qty));

    /* text scramble / decode. The target is aria-hidden; #na-status announces the
       clean result to assistive tech, so noise is never read aloud. */
    const GLYPHS = "!<>-_/[]=+*?#§ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
    function scramble(el, final) {
      if (!el) return;
      if (reduced) { el.textContent = final; el.classList.add("settled"); return; }
      el.classList.remove("settled");
      const queue = [];
      for (let i = 0; i < final.length; i++) {
        const start = Math.floor(Math.random() * 12);
        const end = start + 8 + Math.floor(Math.random() * 16);
        queue.push({ to: final[i], start, end });
      }
      let frame = 0, finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        el.textContent = final;
        el.classList.add("settled");
      };
      // backstop: if rAF is throttled (e.g. backgrounded tab) always settle
      const safety = setTimeout(finish, 1600);
      const run = () => {
        if (finished) return;
        let out = "", done = 0;
        for (const q of queue) {
          if (frame >= q.end) { out += q.to; done++; }
          else if (frame >= q.start) { out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; }
          else out += " ";
        }
        el.textContent = out;
        if (done === queue.length) { clearTimeout(safety); finish(); return; }
        frame++;
        requestAnimationFrame(run);
      };
      run();
    }

    /* roll every RATION FACTS number from the old ration's value to the new one */
    function rollFacts(from, to) {
      if (reduced) { setFactsInstant(to); return; }
      const dur = 620, t0 = performance.now();
      let finished = false;
      const finish = () => { if (finished) return; finished = true; setFactsInstant(to); };
      // backstop: if rAF is throttled the facts must still land on the right numbers
      const safety = setTimeout(finish, 1500);
      const step = (t) => {
        if (finished) return;
        const p = Math.min((t - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        numFields.forEach((n) => {
          const a = from[n.key] || 0, b = to[n.key] || 0;
          n.el.textContent = pad(a + (b - a) * e, n.w);
        });
        if (p < 1) requestAnimationFrame(step);
        else { clearTimeout(safety); finish(); }
      };
      requestAnimationFrame(step);
    }

    function segTick(el) {
      if (reduced) return;
      el.classList.remove("seg-tick"); void el.offsetWidth; el.classList.add("seg-tick");
    }
    function setStatus(msg, err) {
      statusEl.textContent = msg;
      statusEl.classList.toggle("is-err", !!err);
    }

    function setFactsInstant(f) {
      numFields.forEach((n) => (n.el.textContent = pad(f[n.key], n.w)));
      current = f;
    }
    function select(code, animate) {
      const r = byCode[code];
      if (!r) return;
      if (stock[code] <= 0) { setStatus("OUT OF ALLOCATION", true); return; }
      sel = r;
      slots.forEach((s) => s.classList.toggle("is-sel", s.dataset.code === code));
      creditEl.textContent = r.price;
      stockEl.textContent = pad(stock[code], 2);
      specEl.textContent = r.spec;
      flavorEl.textContent = r.flavor;
      if (stampEl) stampEl.textContent = r.stamp;
      if (animate) {
        segTick(creditEl); segTick(stockEl);
        scramble(nameEl, r.name);
        rollFacts(current, r.f);
        if (win && !reduced) { win.classList.remove("vend"); void win.offsetWidth; win.classList.add("vend"); }
      } else {
        nameEl.textContent = r.name; nameEl.classList.add("settled");
        setFactsInstant(r.f);
      }
      setStatus(r.name + " ▸ SELECTED");
    }

    function total(price) {
      return (parseFloat(price) + 0.44).toFixed(2).padStart(5, "0");
    }
    function buildReceipt(r) {
      const empty = receipts.querySelector(".na-receipts-empty");
      if (empty) empty.remove();
      const el = document.createElement("div");
      el.className = "receipt" + (reduced ? "" : " spooling");
      el.innerHTML =
        '<p class="r-h">NUCALORIC — NOURISHMENT, SOLVED.™</p>' +
        '<div class="r-line"><span>DISPENSER UNIT-07</span><span>GAIUS</span></div>' +
        '<div class="r-line"><span>TAU CETI IV</span><span>N. CASCADIA</span></div>' +
        '<div class="r-rule"></div>' +
        '<div class="r-line"><span>' + r.code + "  " + r.name + "</span></div>" +
        '<div class="r-line"><span>1 UNIT</span><span>' + r.price + "</span></div>" +
        '<div class="r-line"><span>SURVIVAL TAX 44-C</span><span>00.44</span></div>' +
        '<div class="r-line r-tot"><span>TOTAL</span><span>' + total(r.price) + "</span></div>" +
        '<div class="r-rule"></div>' +
        '<div class="r-line"><span>RATION AUTH</span><span>NC-4471-Δ</span></div>' +
        '<div class="r-barcode" aria-hidden="true"></div>' +
        '<p class="r-foot">CONSUME BEFORE EXFIL.<br>NOT A SUBSTITUTE FOR A PULSE.</p>';
      receipts.prepend(el);
      while (receipts.children.length > 2) receipts.removeChild(receipts.lastChild);
    }

    function vend() {
      if (!sel) { setStatus("SELECT ITEM ▸", true); return; }
      const code = sel.code;
      if (stock[code] <= 0) { setStatus("OUT OF ALLOCATION", true); return; }
      stock[code]--;
      const slotEl = slots.find((s) => s.dataset.code === code);
      if (slotEl) {
        const q = slotEl.querySelector(".slot-qty");
        if (stock[code] <= 0) {
          slotEl.classList.add("is-sold"); slotEl.classList.remove("is-sel");
          slotEl.disabled = true; slotEl.setAttribute("aria-disabled", "true");
          if (q) q.textContent = "SOLD OUT";
        } else if (q) { q.textContent = "×" + pad(stock[code], 2); }
      }
      stockEl.textContent = pad(stock[code], 2); segTick(stockEl);
      buildReceipt(sel);
      if (stampEl && !reduced) { stampEl.classList.remove("thump"); void stampEl.offsetWidth; stampEl.classList.add("thump"); }
      if (reduced) { setStatus("THANK YOU FOR YOUR COMPLIANCE"); }
      else { setStatus("DISPENSING…"); setTimeout(() => setStatus("THANK YOU FOR YOUR COMPLIANCE"), 700); }
      if (stock[code] <= 0) sel = null;
    }

    /* wire up */
    slots.forEach((s) => {
      if (s.classList.contains("is-sold")) return;
      s.addEventListener("click", () => select(s.dataset.code, true));
    });
    vendBtn.addEventListener("click", vend);

    // keypad: type a slot code (e.g. B2) while the terminal has focus
    let buf = "";
    const echoRender = () => { if (echoEl) echoEl.textContent = (buf + "__").slice(0, 2); };
    echoRender();
    naSec.addEventListener("keydown", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = (e.key || "").toUpperCase();
      if (/^[A-D]$/.test(k)) { buf = k; echoRender(); }
      else if (/^[1-6]$/.test(k) && buf.length === 1) {
        const code = buf + k; buf = ""; echoRender();
        if (byCode[code] && stock[code] > 0) select(code, true);
        else setStatus("USE EXACT CHANGE", true);
      } else if (k === "BACKSPACE" || k === "ESCAPE" || k === "DELETE") { buf = ""; echoRender(); }
    });

    // marquee pause toggles
    naSec.querySelectorAll(".mq-pause").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lane = btn.closest(".na-marq");
        const paused = lane.classList.toggle("is-paused");
        btn.setAttribute("aria-pressed", String(paused));
      });
    });

    // populate A1 at rest (always) so the terminal is never blank — even before
    // it scrolls into view, or if IntersectionObserver never fires
    select("A1", false);

    // entry flourish: cut-to-black wipe + shudder + header/name decode, once
    function armEntry() {
      naSec.classList.add("na-armed");
      scramble(naSec.querySelector(".na-decode"), "INCOMING TRANSMISSION");
      select("A1", true);
    }
    if ("IntersectionObserver" in window && !reduced) {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((en) => { if (en.isIntersecting) { armEntry(); obs.disconnect(); } });
      }, { threshold: 0.3 });
      io.observe(naSec);
    }
  }

  /* ---------- extraction loop autoplay ---------- */
  const loop = document.getElementById("loop");
  if (loop && !reduced) {
    const steps = [...loop.querySelectorAll(".loop-step")];
    let idx = 0;
    let paused = false;
    let onScreen = false;

    loop.addEventListener("mouseenter", () => (paused = true));
    loop.addEventListener("mouseleave", () => (paused = false));

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => (onScreen = entries.some((e) => e.isIntersecting)),
        { threshold: 0.2 }
      ).observe(loop);
    } else {
      onScreen = true;
    }

    setInterval(() => {
      if (paused || !onScreen || document.hidden) return;
      idx = (idx + 1) % steps.length;
      steps.forEach((s, i) => s.classList.toggle("is-active", i === idx));
    }, 2200);
  }

  /* ---------- custom cursor ---------- */
  const cursor = document.getElementById("cursor");
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  if (cursor && finePointer && !reduced) {
    document.documentElement.classList.add("has-cursor");
    let cx = innerWidth / 2, cy = innerHeight / 2;
    let tx = cx, ty = cy;

    window.addEventListener("mousemove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
      cursor.classList.add("live");
    }, { passive: true });

    const lerp = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(lerp);
    };
    requestAnimationFrame(lerp);

    const interactive = "a, button, [role='tab']";
    document.addEventListener("mouseover", (e) => {
      cursor.classList.toggle("on-target", !!e.target.closest(interactive));
    });
  }
})();
