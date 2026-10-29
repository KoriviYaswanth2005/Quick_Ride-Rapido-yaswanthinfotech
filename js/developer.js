document.addEventListener("DOMContentLoaded", () => {
  const copyButton = document.getElementById("devCopyEmail");

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      const email = "yaswanthinfotech@gmail.com";

      try {
        await navigator.clipboard.writeText(email);
        copyButton.innerHTML =
          '<i class="fa-solid fa-circle-check"></i> Email Copied!';
      } catch (error) {
        window.prompt("Copy this email address:", email);
      }

      setTimeout(() => {
        copyButton.innerHTML =
          '<i class="fa-regular fa-copy"></i> Copy Email';
      }, 2000);
    });
  }
  const animatedItems = document.querySelectorAll(
    ".dev-card, .dev-project-banner"
  );

  if ("IntersectionObserver" in window) {
    animatedItems.forEach(item => {
      item.style.opacity = "0";
      item.style.transform = "translateY(20px)";
      item.style.transition =
        "opacity .7s ease, transform .7s ease";
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    animatedItems.forEach(item => observer.observe(item));
  }
});
