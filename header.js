const siteHeader = document.getElementById("siteHeader");

let isCompact = false;
let ticking = false;

function updateHeader() {
  if (!siteHeader) return;

  const scrollY = window.scrollY;

  if (!isCompact && scrollY > 140) {
    siteHeader.classList.add("compact");
    isCompact = true;
  }

  if (isCompact && scrollY < 30) {
    siteHeader.classList.remove("compact");
    isCompact = false;
  }

  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    window.requestAnimationFrame(updateHeader);
    ticking = true;
  }
});
