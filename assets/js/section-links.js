// Gives every section heading a stable id derived from its text, plus a small
// anchor that appears on hover and copies a direct link to that section.
// Nothing needs to be set by hand in the content files.
(function () {
  "use strict";

  var HEADING_SELECTOR = "h2, h3, h4";

  // Parts of a heading that are decoration rather than title: right hand side
  // links (BibTeX, ORCiD, "Submit an update.") and print-only duplicates.
  var IGNORED_IN_TITLE = ".right, .onlyPrint, .heading-anchor";

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/['\u2018\u2019"\u201c\u201d]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function titleOf(heading) {
    var clone = heading.cloneNode(true);
    var extras = clone.querySelectorAll(IGNORED_IN_TITLE);

    Array.prototype.forEach.call(extras, function (node) {
      node.parentNode.removeChild(node);
    });

    return clone.textContent.replace(/\s+/g, " ").trim();
  }

  // Place the anchor immediately after the last visible character of the
  // title, ahead of any floated right hand side content and the whitespace
  // (often an em space) that separates the two.
  function insertAnchor(heading, anchor) {
    var before = heading.querySelector(".right");

    while (before && before.parentNode !== heading) {
      before = before.parentNode;
    }

    while (
      before &&
      before.previousSibling &&
      before.previousSibling.nodeType === 3 &&
      !before.previousSibling.nodeValue.trim()
    ) {
      before = before.previousSibling;
    }

    var text = before ? before.previousSibling : heading.lastChild;

    if (text && text.nodeType === 3) {
      var visible = text.nodeValue.replace(/\s+$/, "").length;

      if (visible < text.nodeValue.length) {
        before = text.splitText(visible);
      }
    }

    if (before) {
      heading.insertBefore(anchor, before);
    } else {
      heading.appendChild(anchor);
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var field = document.createElement("textarea");

      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "absolute";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();

      try {
        document.execCommand("copy") ? resolve() : reject();
      } catch (error) {
        reject(error);
      } finally {
        document.body.removeChild(field);
      }
    });
  }

  function buildAnchor(heading, title) {
    var anchor = document.createElement("a");

    anchor.className = "heading-anchor noPrint";
    anchor.href = "#" + heading.id;
    // The site sets <base target="_blank">, so opt back in to this tab.
    anchor.target = "_self";
    anchor.textContent = "#";
    anchor.setAttribute("aria-label", "Copy link to " + title);
    anchor.setAttribute("title", "Copy link to this section");

    anchor.addEventListener("click", function (event) {
      event.preventDefault();

      var url =
        location.origin + location.pathname + location.search + "#" + heading.id;

      if (window.history && history.replaceState) {
        history.replaceState(null, "", "#" + heading.id);
      } else {
        location.hash = heading.id;
      }

      copyText(url)
        .then(function () {
          anchor.classList.add("copied");
          window.setTimeout(function () {
            anchor.classList.remove("copied");
          }, 1400);
        })
        .catch(function () {
          // Clipboard unavailable; the URL bar still holds the link.
        });
    });

    return anchor;
  }

  function scrollToHash() {
    if (!location.hash) {
      return;
    }

    var target;

    try {
      target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    } catch (error) {
      target = document.getElementById(location.hash.slice(1));
    }

    if (target) {
      target.scrollIntoView();
    }
  }

  function init() {
    var body = document.body;

    if (!body || body.classList.contains("layout-home")) {
      return;
    }

    var content = document.querySelector(".page-content");

    if (!content) {
      return;
    }

    var headings = content.querySelectorAll(HEADING_SELECTOR);
    var used = {};

    Array.prototype.forEach.call(headings, function (heading) {
      if (heading.classList.contains("post-title")) {
        return;
      }

      var title = titleOf(heading);
      var slug = heading.id || slugify(title);

      if (!slug) {
        return;
      }

      if (used[slug]) {
        used[slug] += 1;
        slug = slug + "-" + used[slug];
      } else {
        used[slug] = 1;
      }

      heading.id = slug;
      insertAnchor(heading, buildAnchor(heading, title));
    });

    scrollToHash();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
