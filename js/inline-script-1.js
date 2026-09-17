(function () {
  try {
    var raw = sessionStorage.getItem('mdz:page-transition');
    if (!raw) return;
    var payload = JSON.parse(raw);
    sessionStorage.removeItem('mdz:page-transition');
    if (payload && payload.at && Date.now() - payload.at < 3000) {
      document.documentElement.classList.add('has-pending-page-transition');
      setTimeout(function () {
        document.documentElement.classList.remove('has-pending-page-transition', 'is-page-transitioning');
      }, 700);
    }
  } catch (error) { }
})();