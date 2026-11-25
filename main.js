/* Clara Martins — portfolio behaviour.
   1. Name typing   2. Menu   3. Sideways strips (+ continuous strip)   4. Sketchbook wall + threads   5. Lightbox */

(() => {
  const phone = window.matchMedia("(max-width: 760px)");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- 1. Name: typed letter by letter, with a blinking cursor ---------- */
  const hero = document.querySelector(".hero");
  const letters = [];
  document.querySelectorAll("[data-split]").forEach((word) => {
    const text = word.textContent.trim();
    word.textContent = "";
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = "ch";
      span.setAttribute("aria-hidden", "true");
      span.textContent = ch;
      word.appendChild(span);
      letters.push(span);
    }
  });

  const caret = document.createElement("span");
  caret.className = "caret";
  caret.setAttribute("aria-hidden", "true");
  caret.textContent = "|";

  if (calm.matches || !letters.length) {
    letters.forEach((l) => l.classList.add("on"));
    hero.classList.add("is-typed");
  } else {
    letters[0].before(caret);
    let i = 0;
    const typeNext = () => {
      const l = letters[i];
      l.classList.add("on");
      l.after(caret);
      i++;
      if (i === letters.length) { hero.classList.add("is-typed"); return; }
      const newWord = letters[i].parentElement !== l.parentElement;
      // a little irregular, like someone typing; a pause between the two words
      setTimeout(typeNext, newWord ? 420 : 95 + Math.random() * 110);
    };
    setTimeout(typeNext, 650);
  }

  /* ---------- 2. Menu ---------- */
  const side = document.querySelector(".side");
  const menuBtn = document.querySelector(".menu-btn");

  new IntersectionObserver(([entry]) => {
    document.body.classList.toggle("past-hero", !entry.isIntersecting);
    if (entry.isIntersecting) closeMenu();
  }, { threshold: 0.12 }).observe(hero);

  function closeMenu() {
    side.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.textContent = "Menu";
  }
  menuBtn.addEventListener("click", () => {
    const open = !side.classList.contains("is-open");
    side.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "Close" : "Menu";
  });
  side.querySelectorAll(".menu a").forEach((a) => a.addEventListener("click", closeMenu));

  const links = new Map([...side.querySelectorAll('.menu a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a]));
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove("is-active"));
      links.get(e.target.id)?.classList.add("is-active");
    });
  }, { rootMargin: "-35% 0px -60% 0px" });
  document.querySelectorAll("main section[id], main footer[id]").forEach((s) => sectionObserver.observe(s));

  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- 3. Strips: drag with the mouse, arrows, swipe on phones ---------- */
  let suppressClick = false;
  const box = document.querySelector(".lightbox");

  document.querySelectorAll(".strip").forEach((strip) => {
    const loop = strip.classList.contains("strip-loop");
    const nav = strip.closest(".series")?.querySelector(".strip-nav");
    const [prev, next] = nav ? nav.querySelectorAll("button") : [];

    // Continuous strip: a second copy of the photos follows the first, so the end joins the start
    let originals = [];
    if (loop) {
      originals = [...strip.querySelectorAll("img")];
      originals.forEach((img, n) => {
        const copy = img.cloneNode(true);
        copy.dataset.clone = n;
        copy.alt = "";
        copy.setAttribute("aria-hidden", "true");
        strip.appendChild(copy);
      });
    }
    // Width of one full set of photos (where the copy begins)
    const cycle = () => strip.querySelector("[data-clone]").offsetLeft - originals[0].offsetLeft;
    const wrap = () => {
      const w = cycle();
      if (w <= 0) return;
      if (strip.scrollLeft >= w) strip.scrollLeft -= w;
      else if (strip.scrollLeft <= 0) strip.scrollLeft += w;
    };

    const update = () => {
      if (!prev || loop) return;
      prev.disabled = strip.scrollLeft < 4;
      next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
    };
    strip.addEventListener("scroll", () => { update(); }, { passive: true });
    window.addEventListener("resize", update);
    strip.querySelectorAll("img").forEach((img) => img.addEventListener("load", update));
    update();

    let pausedUntil = 0;
    nav?.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      if (loop) { pausedUntil = performance.now() + 1400; if (strip.scrollLeft < strip.clientWidth) strip.scrollLeft += cycle(); }
      strip.scrollBy({ left: Number(btn.dataset.dir) * strip.clientWidth * 0.8, behavior: "smooth" });
    });

    let startX = 0, startScroll = 0, down = false, moved = false;
    strip.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false;
      startX = e.clientX; startScroll = strip.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = true; strip.classList.add("is-dragging"); }
      if (moved) {
        strip.scrollLeft = startScroll - dx;
        if (loop) { const before = strip.scrollLeft; wrap(); startScroll += strip.scrollLeft - before; }
      }
    });
    window.addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      if (moved) {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
        strip.classList.remove("is-dragging");
      }
      if (loop) pausedUntil = performance.now() + 1200;
    });
    strip.addEventListener("dragstart", (e) => e.preventDefault());

    if (!loop) return;

    // Gentle constant drift; it stops while the pointer is over it, a finger is on it,
    // the enlarged view is open, or the strip is off screen.
    const SPEED = 34; // pixels per second
    let hovering = false, touching = false, visible = false, pos = 0, last = 0;
    strip.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovering = true; });
    strip.addEventListener("pointerleave", () => { hovering = false; });
    strip.addEventListener("touchstart", () => { touching = true; }, { passive: true });
    strip.addEventListener("touchend", () => { touching = false; pausedUntil = performance.now() + 1500; }, { passive: true });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(strip);

    const tick = (now) => {
      const dt = last ? Math.min(now - last, 100) / 1000 : 0;
      last = now;
      const moving = visible && !hovering && !touching && !down && box.hidden && now > pausedUntil && !calm.matches;
      if (!moving) {
        pos = strip.scrollLeft;
        if (visible && !down && now > pausedUntil) wrap();
      } else {
        if (Math.abs(strip.scrollLeft - pos) > 2) pos = strip.scrollLeft; // moved by a wheel or trackpad
        pos += SPEED * dt;
        const w = cycle();
        if (w > 0 && pos >= w) pos -= w;
        strip.scrollLeft = pos;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* ---------- 4. Sketchbook wall ----------
     x / y / w are percentages of the wall's width, so the composition keeps its shape at any size. */
  const wall = document.querySelector(".wall");
  const layouts = {
    wide: {
      s1: [3, 4, 15, -1.2], c1: [24, 1, 19, 0.8], s6: [47, 5, 18, -0.6], s2: [72, 2, 19, 1],
      s3: [7, 30, 18, 0.7], c3: [34, 25, 10, -1], s5: [52, 29, 18, 0.9], c2: [77, 33, 16, -0.7],
      s7: [19, 53, 17, 1.1], s4: [50, 55, 17, -0.8],
    },
    narrow: {
      s1: [4, 2, 40, -1.2], c1: [52, 6, 44, 0.8], s6: [4, 46, 40, -0.6], s2: [48, 42, 48, 1],
      c3: [64, 80, 26, -1], s3: [4, 86, 50, 0.7], s5: [6, 132, 42, 0.9], c2: [52, 130, 44, -0.7],
      s7: [50, 174, 44, 1.1], s4: [4, 182, 42, -0.8],
    },
  };
  const threads = [
    ["s1", "c1"], ["c1", "s6"], ["s6", "s2"], ["s1", "s3"], ["c1", "c3"], ["s6", "c3"], ["s6", "s5"],
    ["s2", "s5"], ["s2", "c2"], ["s3", "c3"], ["c3", "s5"], ["s3", "s7"], ["c3", "s4"], ["s7", "s4"],
    ["s4", "c2"], ["s5", "c2"], ["s5", "s4"], ["c1", "s3"],
  ];
  // Threads that run off to the edge of the wall and end in a small nail: [piece, side, shift]
  const loose = [
    ["s1", "left", -0.05], ["s1", "top", 0.05], ["c1", "top", 0.08], ["s2", "top", -0.04], ["s2", "right", 0.05],
    ["s3", "left", 0.07], ["c2", "right", -0.05], ["c2", "right", 0.12], ["s4", "bottom", 0.06], ["s7", "bottom", -0.07],
    ["s7", "left", 0.04],
  ];

  function placeWall() {
    if (!wall) return;
    const layout = phone.matches ? layouts.narrow : layouts.wide;
    const W = wall.clientWidth;
    const centres = {};
    let bottom = 0;

    wall.querySelectorAll("img[data-pin]").forEach((img) => {
      const spec = layout[img.dataset.pin];
      if (!spec) return;
      const [x, y, w, tilt] = spec;
      const ratio = img.getAttribute("height") / img.getAttribute("width");
      const left = (x / 100) * W, top = (y / 100) * W, width = (w / 100) * W, height = width * ratio;
      Object.assign(img.style, { left: `${left}px`, top: `${top}px`, width: `${width}px` });
      img.style.setProperty("--tilt", `${tilt}deg`);
      centres[img.dataset.pin] = [left + width / 2, top + height / 2];
      bottom = Math.max(bottom, top + height);
    });

    const H = bottom + W * 0.04;
    wall.style.height = `${H}px`;

    const svg = wall.querySelector(".threads");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    let out = "";
    for (const [a, b] of threads) {
      if (!centres[a] || !centres[b]) continue;
      out += `<line x1="${centres[a][0]}" y1="${centres[a][1]}" x2="${centres[b][0]}" y2="${centres[b][1]}"/>`;
    }
    for (const [id, edge, shift] of loose) {
      const c = centres[id];
      if (!c) continue;
      const end = {
        left: [0, c[1] + shift * W], right: [W, c[1] + shift * W],
        top: [c[0] + shift * W, 0], bottom: [c[0] + shift * W, H],
      }[edge];
      out += `<line x1="${c[0]}" y1="${c[1]}" x2="${end[0]}" y2="${end[1]}"/><circle cx="${end[0]}" cy="${end[1]}" r="1.8"/>`;
    }
    svg.innerHTML = out;
    wall.classList.add("is-placed");
  }

  if (wall) {
    placeWall();
    new ResizeObserver(placeWall).observe(wall);
    phone.addEventListener("change", placeWall);
  }

  /* ---------- 5. Lightbox ---------- */
  const boxImg = box.querySelector(".lb-img");
  const boxCap = box.querySelector(".lb-caption");
  const closeBtn = box.querySelector(".lb-close");
  let list = [], index = 0, lastFocus = null;

  const full = (img) => img.getAttribute("src").replace(/-s\.jpg$/, ".jpg");

  function show(i) {
    index = (i + list.length) % list.length;
    const img = list[index];
    boxImg.src = full(img);
    boxImg.alt = img.alt;
    const gallery = img.closest("[data-gallery]").dataset.gallery;
    const note = img.closest("figure")?.querySelector("figcaption")?.textContent;
    boxCap.textContent = `${gallery} — ${index + 1} / ${list.length}${note ? " · " + note : ""}`;
    [list[index + 1], list[index - 1]].forEach((p) => { if (p) new Image().src = full(p); });
  }

  function open(img) {
    // A copy in the continuous strip opens its original
    if (img.dataset.clone !== undefined) img = img.parentElement.querySelectorAll("img:not([data-clone])")[img.dataset.clone];
    const gallery = img.closest("[data-gallery]").dataset.gallery;
    list = [...document.querySelectorAll("[data-gallery]")]
      .filter((g) => g.dataset.gallery === gallery)
      .flatMap((g) => [...g.querySelectorAll("img:not([data-clone])")]);
    lastFocus = document.activeElement;
    show(list.indexOf(img));
    box.hidden = false;
    document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(() => box.classList.add("is-open"));
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    box.classList.remove("is-open");
    document.documentElement.style.overflow = "";
    setTimeout(() => { box.hidden = true; boxImg.removeAttribute("src"); }, 250);
    lastFocus?.focus({ preventScroll: true });
  }

  document.addEventListener("click", (e) => {
    const img = e.target.closest("[data-gallery] img");
    if (!img || box.contains(img)) return;
    if (suppressClick) { e.preventDefault(); return; }
    open(img);
  });

  box.addEventListener("click", (e) => {
    if (e.target.closest(".lb-prev")) show(index - 1);
    else if (e.target.closest(".lb-next")) show(index + 1);
    else close();
  });

  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(index + 1);
    else if (e.key === "ArrowLeft") show(index - 1);
  });

  let touchX = null;
  box.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) { show(index + (dx < 0 ? 1 : -1)); e.preventDefault(); }
  });
})();
