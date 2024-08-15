// Loader feature
const loader = document.getElementById("loader");
document.documentElement.style.overflow = "hidden";
window.addEventListener("load", function () {
  loader.remove();
  document.documentElement.style.overflow = "auto";
});

// Sidebar Feature
const sidebar = document.getElementById("sidebar");
const openBtn = document.getElementById("menu-open");
const closeBtn = document.getElementById("menu-close");
const overlay = document.getElementById("overlay");

openBtn.addEventListener("click", () => {
  sidebar.classList.add("active");
  overlay.style.display = "block";
  closeBtn.style.display = "block";
  openBtn.style.display = "none";
});

closeBtn.addEventListener("click", () => {
  sidebar.classList.remove("active");
  overlay.style.display = "none";
  closeBtn.style.display = "none";
  openBtn.style.display = "block";
});

overlay.addEventListener("click", () => {
  sidebar.classList.remove("active");
  overlay.style.display = "none";
  closeBtn.style.display = "none";
  openBtn.style.display = "block";
});
