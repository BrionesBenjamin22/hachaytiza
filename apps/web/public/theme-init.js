(function () {
  function apply() {
    var preference = "system";
    try { var saved = localStorage.getItem("hyt-theme-v1"); if (saved === "light" || saved === "dark") preference = saved; } catch (_) {}
    var dark = preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }
  apply();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", apply);
  window.addEventListener("storage", apply);
})();
