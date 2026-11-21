(function () {
  const messageType = "danoff-focus-setting";
  const original = {
    visibilityState: Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState"),
    hidden: Object.getOwnPropertyDescriptor(Document.prototype, "hidden"),
    webkitVisibilityState: Object.getOwnPropertyDescriptor(Document.prototype, "webkitVisibilityState"),
    webkitHidden: Object.getOwnPropertyDescriptor(Document.prototype, "webkitHidden"),
    hasFocus: Document.prototype.hasFocus,
    windowFocus: window.focus,
    windowBlur: window.blur
  };

  let enabled = false;

  function setProperty(prototype, name, descriptor) {
    try {
      Object.defineProperty(prototype, name, descriptor);
    } catch (error) {
      // Some browser pages expose non-configurable properties.
    }
  }

  function stopFocusLoss(event) {
    if (!enabled) return;
    event.stopImmediatePropagation();
  }

  function enable() {
    if (enabled) return;
    enabled = true;

    setProperty(Document.prototype, "visibilityState", {
      configurable: true,
      enumerable: true,
      get: () => "visible"
    });
    setProperty(Document.prototype, "hidden", {
      configurable: true,
      enumerable: true,
      get: () => false
    });
    setProperty(Document.prototype, "webkitVisibilityState", {
      configurable: true,
      enumerable: true,
      get: () => "visible"
    });
    setProperty(Document.prototype, "webkitHidden", {
      configurable: true,
      enumerable: true,
      get: () => false
    });
    setProperty(Document.prototype, "hasFocus", {
      configurable: true,
      value: () => true
    });

    try {
      window.focus = () => {};
      window.blur = () => {};
    } catch (error) {
      // Ignore pages that prevent replacing these methods.
    }

    for (const eventName of ["visibilitychange", "blur", "focus"]) {
      window.addEventListener(eventName, stopFocusLoss, true);
      document.addEventListener(eventName, stopFocusLoss, true);
    }
  }

  function disable() {
    if (!enabled) return;
    enabled = false;

    if (original.visibilityState) {
      setProperty(Document.prototype, "visibilityState", original.visibilityState);
    }
    if (original.hidden) {
      setProperty(Document.prototype, "hidden", original.hidden);
    }
    if (original.webkitVisibilityState) {
      setProperty(Document.prototype, "webkitVisibilityState", original.webkitVisibilityState);
    }
    if (original.webkitHidden) {
      setProperty(Document.prototype, "webkitHidden", original.webkitHidden);
    }
    setProperty(Document.prototype, "hasFocus", {
      configurable: true,
      value: original.hasFocus
    });

    try {
      window.focus = original.windowFocus;
      window.blur = original.windowBlur;
    } catch (error) {
      // Ignore pages that prevent restoring these methods.
    }

    for (const eventName of ["visibilitychange", "blur", "focus"]) {
      window.removeEventListener(eventName, stopFocusLoss, true);
      document.removeEventListener(eventName, stopFocusLoss, true);
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.type !== messageType) return;
    if (event.data.enabled) enable();
    else disable();
  });
})();
