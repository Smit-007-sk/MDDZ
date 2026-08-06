/* =============================================================
   MAIN ORCHESTRATOR — Logs and manages module initialization
   ============================================================= */

console.log("MDZ Engine: Initializing modular architecture...");

document.addEventListener("DOMContentLoaded", () => {
  console.log("MDZ Engine: DOM loaded. Bootstrapping interactive systems...");
  
  // Modules self-register and initialize automatically via DOMContentLoaded hooks.
  // This orchestrator serves as the namespace hook for debugging.
  window.MDZ = {
    version: "2.0.0",
    initializedAt: Date.now()
  };
});
