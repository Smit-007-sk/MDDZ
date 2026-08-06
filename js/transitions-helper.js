if (!raw) return;
        var payload = JSON.parse(raw);
        if (payload && payload.at && Date.now() - payload.at < 12000) {
          document.documentElement.classList.add('has-pending-page-transition');
        }
      } catch (error) { }
    })();