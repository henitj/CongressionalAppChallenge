/*
 * EcoTrek web runtime compatibility shims.
 *
 * Why this file exists
 * --------------------
 * The app is an Expo / react-native-web export. Metro emits modern JavaScript,
 * and it also relies on runtime APIs that only exist in recent browsers. That
 * is fine on a desktop, but the Android build hosts this same bundle inside an
 * Android System WebView, and a WebView is only as new as the last time the
 * device updated it. A stock Android 8 phone can sit on WebView 60, and a
 * never-updated Android 12 phone on WebView 93 — either one would load the app
 * bundle, hit a missing API, and leave the user staring at a blank white page.
 *
 * So: scripts/web-compat.mjs transpiles the bundle down to the ES2017-era
 * syntax that WebView 60 understands, and this prelude fills in the runtime
 * gaps it cannot transpile. Everything here is written in ES5 on purpose — it
 * has to be parseable by the very engines it is patching.
 *
 * Every shim is a no-op on a current browser: they only install themselves when
 * the native implementation is missing.
 *
 * Excluded on purpose: `structuredClone`, `WeakRef`, `BigInt` and modern
 * `Intl` formatters. They cannot be emulated faithfully, and the bundle does
 * not touch them while starting up.
 */
(function () {
  'use strict';

  var define = function (object, name, value) {
    try {
      Object.defineProperty(object, name, {
        value: value,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    } catch (error) {
      object[name] = value;
    }
  };

  // --- globalThis (Chrome 71) ----------------------------------------------
  if (typeof globalThis === 'undefined') {
    // eslint-disable-next-line no-new-func
    (function () {
      var self = this;
      define(self, 'globalThis', self);
    }).call(this);
  }

  // --- Object helpers -------------------------------------------------------
  if (!Object.hasOwn) {
    Object.hasOwn = function (object, property) {
      return Object.prototype.hasOwnProperty.call(object, property);
    };
  }

  if (!Object.fromEntries) {
    Object.fromEntries = function (entries) {
      var out = {};
      if (!entries) return out;
      var list = Array.from(entries);
      for (var i = 0; i < list.length; i += 1) {
        var pair = list[i];
        out[pair[0]] = pair[1];
      }
      return out;
    };
  }

  // --- Array / String prototype helpers ------------------------------------
  if (!Array.prototype.at) {
    define(Array.prototype, 'at', function (index) {
      var length = this.length >>> 0;
      var offset = Number(index) || 0;
      var position = offset < 0 ? length + offset : offset;
      return position < 0 || position >= length ? undefined : this[position];
    });
  }

  if (!String.prototype.at) {
    define(String.prototype, 'at', function (index) {
      var text = String(this);
      var offset = Number(index) || 0;
      var position = offset < 0 ? text.length + offset : offset;
      return position < 0 || position >= text.length ? undefined : text.charAt(position);
    });
  }

  if (!Array.prototype.findLast) {
    define(Array.prototype, 'findLast', function (predicate, thisArg) {
      for (var i = this.length - 1; i >= 0; i -= 1) {
        if (predicate.call(thisArg, this[i], i, this)) return this[i];
      }
      return undefined;
    });
  }

  if (!Array.prototype.findLastIndex) {
    define(Array.prototype, 'findLastIndex', function (predicate, thisArg) {
      for (var i = this.length - 1; i >= 0; i -= 1) {
        if (predicate.call(thisArg, this[i], i, this)) return i;
      }
      return -1;
    });
  }

  if (!Array.prototype.flat) {
    define(Array.prototype, 'flat', function (depth) {
      var levels = depth === undefined ? 1 : Number(depth);
      var out = [];
      (function flatten(list, remaining) {
        for (var i = 0; i < list.length; i += 1) {
          var value = list[i];
          if (Array.isArray(value) && remaining > 0) flatten(value, remaining - 1);
          else out.push(value);
        }
      })(this, levels < 0 ? Infinity : levels);
      return out;
    });
  }

  if (!Array.prototype.flatMap) {
    define(Array.prototype, 'flatMap', function (mapper, thisArg) {
      return Array.prototype.flat.call(Array.prototype.map.call(this, mapper, thisArg), 1);
    });
  }

  if (!String.prototype.replaceAll) {
    define(String.prototype, 'replaceAll', function (search, replacement) {
      if (search instanceof RegExp) {
        if (!search.global) throw new TypeError('replaceAll requires a global regular expression');
        return String(this).replace(search, replacement);
      }
      var text = String(this);
      var needle = String(search);
      var out = '';
      var from = 0;
      for (;;) {
        var found = text.indexOf(needle, from);
        if (found === -1) break;
        out += text.slice(from, found) + String(replacement);
        from = found + needle.length;
        if (needle === '') break;
      }
      return out + text.slice(from);
    });
  }

  if (!String.prototype.matchAll) {
    define(String.prototype, 'matchAll', function (pattern) {
      var text = String(this);
      var expression = pattern instanceof RegExp
        ? new RegExp(pattern.source, pattern.flags.indexOf('g') === -1 ? pattern.flags + 'g' : pattern.flags)
        : new RegExp(pattern, 'g');
      var matches = [];
      var match = expression.exec(text);
      while (match !== null) {
        matches.push(match);
        if (match[0] === '') expression.lastIndex += 1;
        match = expression.exec(text);
      }
      return matches[Symbol.iterator]();
    });
  }

  if (!String.prototype.padStart) {
    define(String.prototype, 'padStart', function (length, fill) {
      var text = String(this);
      var padding = fill === undefined ? ' ' : String(fill);
      while (text.length < length && padding) {
        text = padding.slice(0, length - text.length) + text;
        if (!padding) break;
      }
      return text;
    });
  }

  if (!String.prototype.padEnd) {
    define(String.prototype, 'padEnd', function (length, fill) {
      var text = String(this);
      var padding = fill === undefined ? ' ' : String(fill);
      while (text.length < length && padding) {
        text = text + padding.slice(0, length - text.length);
      }
      return text;
    });
  }

  if (!String.prototype.trimStart) {
    define(String.prototype, 'trimStart', function () {
      return String(this).replace(/^\s+/, '');
    });
  }

  if (!String.prototype.trimEnd) {
    define(String.prototype, 'trimEnd', function () {
      return String(this).replace(/\s+$/, '');
    });
  }

  // --- Promise helpers ------------------------------------------------------
  if (typeof Promise !== 'undefined') {
    if (!Promise.prototype.finally) {
      define(Promise.prototype, 'finally', function (callback) {
        var PromiseRef = this.constructor;
        return this.then(
          function (value) {
            return PromiseRef.resolve(callback && callback()).then(function () {
              return value;
            });
          },
          function (reason) {
            return PromiseRef.resolve(callback && callback()).then(function () {
              throw reason;
            });
          }
        );
      });
    }

    if (!Promise.allSettled) {
      Promise.allSettled = function (iterable) {
        var items = Array.from(iterable);
        return Promise.all(
          items.map(function (item) {
            return Promise.resolve(item).then(
              function (value) {
                return { status: 'fulfilled', value: value };
              },
              function (reason) {
                return { status: 'rejected', reason: reason };
              }
            );
          })
        );
      };
    }

    if (!Promise.any) {
      Promise.any = function (iterable) {
        var items = Array.from(iterable);
        return new Promise(function (resolve, reject) {
          var failures = [];
          var remaining = items.length;
          if (!remaining) reject(new Error('All promises were rejected'));
          items.forEach(function (item, index) {
            Promise.resolve(item).then(resolve, function (reason) {
              failures[index] = reason;
              remaining -= 1;
              if (!remaining) reject(new Error('All promises were rejected'));
            });
          });
        });
      };
    }
  }

  if (typeof queueMicrotask === 'undefined') {
    var resolved = typeof Promise !== 'undefined' ? Promise.resolve() : null;
    define(window, 'queueMicrotask', resolved
      ? function (callback) {
          resolved.then(callback).catch(function (error) {
            setTimeout(function () {
              throw error;
            }, 0);
          });
        }
      : function (callback) {
          setTimeout(callback, 0);
        });
  }

  // --- crypto.randomUUID (Chrome 92) ---------------------------------------
  // Random ids only (list keys, cache busting) — never key material.
  if (typeof crypto !== 'undefined' && !crypto.randomUUID && crypto.getRandomValues) {
    define(crypto, 'randomUUID', function () {
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;   // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80;   // variant 10
      var hex = [];
      for (var i = 0; i < bytes.length; i += 1) {
        hex.push((bytes[i] + 0x100).toString(16).slice(1));
      }
      return (
        hex.slice(0, 4).join('') + '-' + hex.slice(4, 6).join('') + '-' +
        hex.slice(6, 8).join('') + '-' + hex.slice(8, 10).join('') + '-' +
        hex.slice(10, 16).join('')
      );
    });
  }

  // --- AbortController (Chrome 66) -----------------------------------------
  // Without it, fetch() simply ignores the signal: network calls keep working,
  // timeouts degrade instead of throwing.
  if (typeof AbortController === 'undefined') {
    var AbortSignalShim = function () {
      this.aborted = false;
      this.onabort = null;
      this._listeners = [];
    };
    AbortSignalShim.prototype.addEventListener = function (type, listener) {
      if (type === 'abort') this._listeners.push(listener);
    };
    AbortSignalShim.prototype.removeEventListener = function (type, listener) {
      if (type !== 'abort') return;
      var index = this._listeners.indexOf(listener);
      if (index >= 0) this._listeners.splice(index, 1);
    };
    AbortSignalShim.prototype.dispatchEvent = function () {
      return true;
    };
    AbortSignalShim.prototype._abort = function () {
      this.aborted = true;
      var event = { type: 'abort', target: this };
      if (typeof this.onabort === 'function') {
        try {
          this.onabort(event);
        } catch (error) {
          /* a throwing listener must not break abort() */
        }
      }
      for (var i = 0; i < this._listeners.length; i += 1) {
        try {
          this._listeners[i](event);
        } catch (error) {
          /* as above */
        }
      }
    };
    var AbortControllerShim = function () {
      this.signal = new AbortSignalShim();
    };
    AbortControllerShim.prototype.abort = function () {
      if (!this.signal.aborted) this.signal._abort();
    };
    define(window, 'AbortController', AbortControllerShim);
    define(window, 'AbortSignal', AbortSignalShim);
  }

  // --- ResizeObserver (Chrome 64) ------------------------------------------
  // react-native-web measures views with it. This version polls on animation
  // frames and only notifies on real size changes, so it cannot loop.
  if (typeof ResizeObserver === 'undefined' && typeof requestAnimationFrame === 'function') {
    var ResizeObserverShim = function (callback) {
      this._callback = callback;
      this._targets = [];
      this._sizes = [];
      this._frame = null;
      this._observe = this._observe.bind(this);
    };
    ResizeObserverShim.prototype.observe = function (target) {
      if (this._targets.indexOf(target) !== -1) return;
      var rect = target.getBoundingClientRect();
      this._targets.push(target);
      this._sizes.push({ width: rect.width, height: rect.height });
      if (this._frame === null) this._frame = requestAnimationFrame(this._observe);
    };
    ResizeObserverShim.prototype.unobserve = function (target) {
      var index = this._targets.indexOf(target);
      if (index === -1) return;
      this._targets.splice(index, 1);
      this._sizes.splice(index, 1);
    };
    ResizeObserverShim.prototype.disconnect = function () {
      this._targets = [];
      this._sizes = [];
      if (this._frame !== null) {
        cancelAnimationFrame(this._frame);
        this._frame = null;
      }
    };
    ResizeObserverShim.prototype._observe = function () {
      this._frame = null;
      var changed = [];
      for (var i = 0; i < this._targets.length; i += 1) {
        var target = this._targets[i];
        var rect = target.getBoundingClientRect();
        var previous = this._sizes[i];
        if (rect.width !== previous.width || rect.height !== previous.height) {
          this._sizes[i] = { width: rect.width, height: rect.height };
          changed.push({
            target: target,
            contentRect: rect,
            borderBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
            contentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
          });
        }
      }
      if (changed.length) {
        try {
          this._callback(changed, this);
        } catch (error) {
          /* observers must not take the app down with them */
        }
      }
      if (this._targets.length) this._frame = requestAnimationFrame(this._observe);
    };
    define(window, 'ResizeObserver', ResizeObserverShim);
  }

  // --- navigator.clipboard (Chrome 66) -------------------------------------
  if (navigator.clipboard === undefined && document.queryCommandSupported) {
    var fallbackCopy = function (text) {
      return new Promise(function (resolve, reject) {
        var field = document.createElement('textarea');
        field.value = String(text);
        field.setAttribute('readonly', 'readonly');
        field.style.position = 'fixed';
        field.style.top = '-1000px';
        document.body.appendChild(field);
        field.select();
        var ok = false;
        try {
          ok = document.execCommand('copy');
        } catch (error) {
          ok = false;
        }
        document.body.removeChild(field);
        ok ? resolve() : reject(new Error('copy failed'));
      });
    };
    var clipboard = {
      writeText: fallbackCopy,
      readText: function () {
        return Promise.reject(new Error('clipboard read is unavailable on this device'));
      },
    };
    define(navigator, 'clipboard', clipboard);
  }
})();
