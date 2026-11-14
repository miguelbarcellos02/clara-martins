/* Clara Martins — portfolio behaviour.
   1. Name animation   2. Menu   3. Sideways strips   4. Sketchbook wall + threads   5. Lightbox */

(() => {
  const phone = window.matchMedia("(max-width: 760px)");

  /* ---------- 1. Name: split into letters so each one can move in ---------- */
  let n = 0;
  document.querySelectorAll("[data-split]").forEach((word) => {
    const text = word.textContent.trim();
    word.textContent = "";
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = "ch";
      span.setAttribute("aria-hidden", "true");
      span.style.setProperty("--i", n++);
      span.textContent = ch;
      word.appendChild(span);
    }
  });

  /* ---------- 2. Menu ---------- */
  const hero = document.querySelector(".hero");
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

  document.querySelectorAll(".strip").forEach((strip) => {
    const nav = strip.closest(".series")?.querySelector(".strip-nav");
    const [prev, next] = nav ? nav.querySelectorAll("button") : [];

    const update = () => {
      if (!prev) return;
      prev.disabled = strip.scrollLeft < 4;
      next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
    };
    strip.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    strip.querySelectorAll("img").forEach((img) => img.addEventListener("load", update));
    update();

    nav?.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
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
      if (moved) strip.scrollLeft = startScroll - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      if (moved) {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
        strip.classList.remove("is-dragging");
      }
    });
    strip.addEventListener("dragstart", (e) => e.preventDefault());
  });

  /* ---------- 4. Sketchbook wall ----------
     x / y / w are percentages of the wall's width, so the composition keeps its shape at any size. */
  const wall = document.querySelector(".wall");
  const layouts = {
    wide: {
      s1: [3, 4, 15, -1.2], c1: [24, 1, 19, 0.8], s6: [50, 6, 11, -0.6], s2: [72, 2, 19, 1],
      s3: [7, 30, 18, 0.7], c3: [34, 25, 10, -1], s5: [56, 31, 11, 0.9], c2: [76, 33, 16, -0.7],
      s7: [22, 52, 11, 1.1], s4: [50, 55, 17, -0.8],
    },
    narrow: {
      s1: [4, 2, 40, -1.2], c1: [52, 6, 44, 0.8], s6: [8, 44, 26, -0.6], s2: [46, 42, 48, 1],
      c3: [64, 80, 26, -1], s3: [4, 92, 50, 0.7], s5: [10, 136, 30, 0.9], c2: [50, 132, 46, -0.7],
      s7: [54, 176, 36, 1.1], s4: [4, 192, 46, -0.8],
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
  const box = document.querySelector(".lightbox");
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
    const gallery = img.closest("[data-gallery]").dataset.gallery;
    list = [...document.querySelectorAll("[data-gallery]")]
      .filter((g) => g.dataset.gallery === gallery)
      .flatMap((g) => [...g.querySelectorAll("img")]);
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
