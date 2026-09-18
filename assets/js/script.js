document.addEventListener("DOMContentLoaded", () => {
  const bg = document.querySelector(".hero__bg");
  const logo = document.querySelector(".logo");
  const cta = document.querySelector(".cta");
  const badge = document.querySelector(".badge");
  const content = document.querySelector(".hero__content");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // swap the CTA copy to the email address on hover/focus
  const ctaText = cta ? cta.querySelector(".cta__text") : null;
  if (cta && ctaText) {
    const defaultText = cta.dataset.defaultText || ctaText.textContent;
    const hoverText = cta.dataset.hoverText || defaultText;

    const setCtaText = (value) => {
      if (value === ctaText.textContent) return;

      if (reduceMotion || typeof gsap === "undefined") {
        ctaText.textContent = value;
        return;
      }

      gsap.killTweensOf(ctaText);
      gsap.to(ctaText, {
        opacity: 0,
        y: -6,
        duration: 0.12,
        ease: "power2.in",
        onComplete: () => {
          ctaText.textContent = value;
          gsap.fromTo(ctaText, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" });
        },
      });
    };

    cta.addEventListener("mouseenter", () => setCtaText(hoverText));
    cta.addEventListener("mouseleave", () => setCtaText(defaultText));
    cta.addEventListener("focus", () => setCtaText(hoverText));
    cta.addEventListener("blur", () => setCtaText(defaultText));
  }

  if (reduceMotion || typeof gsap === "undefined") {
    return;
  }

  gsap.set([bg, logo, badge], { opacity: 1 });

  // logo + badge entrance timings mirror the reference site's spring-based reveal
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.fromTo(bg, { opacity: 0, scale: 1.16 }, { opacity: 1, scale: 1.08, duration: 1.6, ease: "power2.out" })
    .fromTo(
      logo,
      { opacity: 0, scale: 0.45, rotate: -7 },
      { opacity: 1, scale: 1, rotate: 0, duration: 0.65, ease: "back.out(1.9)" },
      0.15
    )
    .fromTo(badge, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.1)" }, 0.25);

  // slow cinematic breathing zoom, loops after the intro settles
  tl.eventCallback("onComplete", () => {
    gsap.to(bg, {
      scale: 1.14,
      duration: 16,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  });

  // gentle ambient float on the badge
  gsap.to(badge, {
    y: "+=10",
    duration: 3.2,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
    delay: 1.6,
  });

  // mouse parallax — disabled on touch devices
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (canHover) {
    const moveContent = gsap.quickTo(content, "x", { duration: 0.7, ease: "power3.out" });
    const moveContentY = gsap.quickTo(content, "y", { duration: 0.7, ease: "power3.out" });
    const moveBg = gsap.quickTo(bg, "x", { duration: 1, ease: "power3.out" });
    const moveBgY = gsap.quickTo(bg, "y", { duration: 1, ease: "power3.out" });

    window.addEventListener("mousemove", (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      moveContent(nx * 18);
      moveContentY(ny * 12);
      moveBg(nx * -10);
      moveBgY(ny * -6);
    });
  }

  // tactile 3D press effect on the CTA button
  if (cta) {
    const restShadow = "4px 4px 0 0 rgba(0,0,0,0.9)";
    const hoverShadow = "7px 7px 0 0 rgba(0,0,0,0.9)";
    const pressShadow = "2px 2px 0 0 rgba(0,0,0,0.9)";

    cta.addEventListener("mouseenter", () => {
      gsap.to(cta, { x: -3, y: -3, boxShadow: hoverShadow, duration: 0.25, ease: "power3.out" });
    });
    cta.addEventListener("mouseleave", () => {
      gsap.to(cta, { x: 0, y: 0, boxShadow: restShadow, duration: 0.3, ease: "power3.out" });
    });
    cta.addEventListener("mousedown", () => {
      gsap.to(cta, { x: 2, y: 2, boxShadow: pressShadow, duration: 0.1, ease: "power2.out" });
    });
    cta.addEventListener("mouseup", () => {
      gsap.to(cta, { x: -3, y: -3, boxShadow: hoverShadow, duration: 0.15, ease: "power2.out" });
    });
  }
});
