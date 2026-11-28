/* google.script.run shim — frontend (js1/js2/js3) BINA BADLE naye backend se baat karta hai.
 * Wahi builder pattern: google.script.run.withSuccessHandler(..).withFailureHandler(..).api(fn,args,auth) */
(function () {
  function makeRunner() {
    var succ = function () {}, fail = function () {};
    var runner = {
      withSuccessHandler: function (f) { succ = f || succ; return runner; },
      withFailureHandler: function (f) { fail = f || fail; return runner; },
      withUserObject: function () { return runner; },
      api: function (fn, args, auth) {
        try {
          var ctl = (typeof AbortController !== "undefined") ? new AbortController() : null;
          var tmr = ctl ? setTimeout(function () { ctl.abort(); }, 45000) : null; // v46: 45s timeout — warna busy overlay atak jaata hai
          fetch(window.ERP_CFG.API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fn: fn, args: args || [], auth: auth || null }),
            keepalive: (fn === "logAccess" || fn === "impersonateEnd"), // logout flush bhi pahunch jaye
            signal: ctl ? ctl.signal : undefined
          }).then(function (r) { if (tmr) clearTimeout(tmr); return r.json(); }).then(function (j) {
            if (j && j.ok) succ(j.res);
            else fail({ message: (j && j.err) || "Server error" });
          }).catch(function (e) {
            if (tmr) clearTimeout(tmr);
            fail({ message: (e && e.name === "AbortError") ? "Server se jawab nahi aaya (timeout) — dobara try karo" : "Network: " + (e && e.message ? e.message : "server se baat nahi ho paayi") });
          });
        } catch (e) {
          fail({ message: String(e && e.message || e) });
        }
      }
    };
    return runner;
  }
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, "run", { get: function () { return makeRunner(); } });
})();
