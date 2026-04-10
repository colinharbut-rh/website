/**
 * Reporting Hub - Main JavaScript
 * Replaces webflow.js (582KB) with lightweight vanilla JS (~8KB)
 * Handles: dropdowns, mobile nav, tabs, smooth scroll, back-to-top,
 *           video lightbox, download popup, opacity animation cleanup
 */

(function () {
  'use strict';

  // ============================================================
  // Mobile Navigation Toggle
  // ============================================================

  function initMobileNav() {
    const navButtons = document.querySelectorAll('.w-nav-button');
    navButtons.forEach(function (btn) {
      const nav = btn.closest('.w-nav');
      if (!nav) return;
      const menu = nav.querySelector('.w-nav-menu');
      if (!menu) return;

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const isOpen = menu.classList.contains('w--open');
        if (isOpen) {
          menu.classList.remove('w--open');
          btn.classList.remove('w--open');
        } else {
          menu.classList.add('w--open');
          btn.classList.add('w--open');
        }
      });
    });

    // Close mobile nav when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.w-nav')) {
        document.querySelectorAll('.w-nav-menu.w--open').forEach(function (menu) {
          menu.classList.remove('w--open');
        });
        document.querySelectorAll('.w-nav-button.w--open').forEach(function (btn) {
          btn.classList.remove('w--open');
        });
      }
    });
  }

  // ============================================================
  // Dropdown Menus
  // ============================================================

  function initDropdowns() {
    const dropdowns = document.querySelectorAll('.w-dropdown');

    dropdowns.forEach(function (dropdown) {
      const toggle = dropdown.querySelector('.w-dropdown-toggle');
      const list = dropdown.querySelector('.w-dropdown-list');
      if (!toggle || !list) return;

      const isHover = dropdown.getAttribute('data-hover') === 'true';
      const delay = parseInt(dropdown.getAttribute('data-delay') || '0', 10);
      let closeTimeout = null;

      function open() {
        clearTimeout(closeTimeout);
        // Close other dropdowns at the same level
        dropdown.parentElement.querySelectorAll('.w-dropdown-list.w--open').forEach(function (other) {
          if (other !== list) {
            other.classList.remove('w--open');
            var otherToggle = other.parentElement.querySelector('.w-dropdown-toggle');
            if (otherToggle) otherToggle.classList.remove('w--open');
          }
        });
        list.classList.add('w--open');
        toggle.classList.add('w--open');
        toggle.setAttribute('aria-expanded', 'true');
      }

      function close() {
        closeTimeout = setTimeout(function () {
          list.classList.remove('w--open');
          toggle.classList.remove('w--open');
          toggle.setAttribute('aria-expanded', 'false');
        }, delay);
      }

      // Click to toggle
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (list.classList.contains('w--open')) {
          list.classList.remove('w--open');
          toggle.classList.remove('w--open');
          toggle.setAttribute('aria-expanded', 'false');
        } else {
          open();
        }
      });

      // Hover behavior (only on desktop)
      if (isHover) {
        dropdown.addEventListener('mouseenter', function () {
          if (window.innerWidth > 991) open();
        });
        dropdown.addEventListener('mouseleave', function () {
          if (window.innerWidth > 991) close();
        });
      }

      list.addEventListener('mouseenter', function () { clearTimeout(closeTimeout); });
      list.addEventListener('mouseleave', function () {
        if (isHover && window.innerWidth > 991) close();
      });
    });

    // Close all dropdowns when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.w-dropdown')) {
        document.querySelectorAll('.w-dropdown-list.w--open').forEach(function (list) {
          list.classList.remove('w--open');
          var toggle = list.parentElement.querySelector('.w-dropdown-toggle');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        });
      }
    });

    // Close dropdowns on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.w-dropdown-list.w--open').forEach(function (list) {
          list.classList.remove('w--open');
        });
        closeVideoModal();
        closeDownloadPopup();
        var schedulePopup = document.querySelector('.popup-wrapper');
        if (schedulePopup) { schedulePopup.style.display = 'none'; document.body.style.overflow = ''; }
      }
    });
  }

  // ============================================================
  // FAQ Accordion
  // ============================================================

  function initFaqAccordion() {
    document.querySelectorAll('.faq-question-2').forEach(function (question) {
      var wrap = question.closest('.faq-wrap-2');
      if (!wrap) return;
      question.addEventListener('click', function () {
        wrap.classList.toggle('is-open');
      });
    });

    // .faq-accordions pattern (power-bi/certification.html)
    document.querySelectorAll('.faq-accordions').forEach(function (accordion) {
      accordion.addEventListener('click', function () {
        var wrapper = accordion.closest('.faq-wrapper');
        if (!wrapper) return;
        var answers = wrapper.querySelector('.faq-answers');
        if (!answers) return;
        var isOpen = wrapper.classList.toggle('is-open');
        answers.style.height = isOpen ? answers.scrollHeight + 'px' : '0px';
      });
    });

    // .faq-question pattern (install-guide.html)
    document.querySelectorAll('.faq-question').forEach(function (question) {
      question.addEventListener('click', function () {
        var wrapper = question.closest('.faq-install-wrapp');
        if (!wrapper) return;
        var answers = wrapper.querySelector('.faq-ans.answer');
        if (!answers) return;
        var isOpen = wrapper.classList.toggle('is-open');
        answers.style.height = isOpen ? answers.scrollHeight + 'px' : '0px';
      });
    });
  }

  // ============================================================
  // Tabs
  // ============================================================

  function initTabs() {
    const tabContainers = document.querySelectorAll('.w-tabs');

    tabContainers.forEach(function (container) {
      const tabLinks = container.querySelectorAll('.w-tab-link');
      const tabPanes = container.querySelectorAll('.w-tab-pane');

      tabLinks.forEach(function (link, index) {
        link.addEventListener('click', function (e) {
          e.preventDefault();

          tabLinks.forEach(function (l) { l.classList.remove('w--current'); });
          tabPanes.forEach(function (p) { p.classList.remove('w--tab-active'); });

          link.classList.add('w--current');
          if (tabPanes[index]) tabPanes[index].classList.add('w--tab-active');

          // Match by data-w-tab attribute
          var tabId = link.getAttribute('data-w-tab');
          if (tabId) {
            tabPanes.forEach(function (pane) {
              if (pane.getAttribute('data-w-tab') === tabId) pane.classList.add('w--tab-active');
            });
          }
        });
      });
    });
  }

  // ============================================================
  // Smooth Scroll for Anchor Links
  // ============================================================

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (href === '#' || href === '') return;
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ============================================================
  // Navbar Background on Scroll
  // ============================================================

  function initNavbarScroll() {
    var navbar = document.querySelector('.navbar');
    if (!navbar) return;

    function updateNavbar() {
      navbar.classList.toggle('bg-black', window.scrollY > 50);
    }

    window.addEventListener('scroll', updateNavbar, { passive: true });
    updateNavbar();
  }

  // ============================================================
  // Current Page Highlight
  // ============================================================

  function initCurrentPage() {
    var currentPath = window.location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.w-nav-link, .footer-link').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      var linkPath = href.split('/').pop().split('#')[0].split('?')[0];
      if (linkPath === currentPath) {
        link.classList.add('w--current');
        if (link.hasAttribute('aria-current')) link.setAttribute('aria-current', 'page');
      }
    });
  }

  // ============================================================
  // Clear Stuck Opacity:0 (Webflow scroll animations removed)
  // ============================================================

  function clearStuckOpacity() {
    // Elements with inline style="opacity:0" that Webflow would animate in
    // but we removed the animation JS — make them visible
    document.querySelectorAll('[style*="opacity"]').forEach(function (el) {
      var style = el.getAttribute('style') || '';
      // Only clear opacity:0 that is a Webflow animation artifact
      // (elements that also have data-w-id would have been animated)
      if (/opacity:\s*0/.test(style)) {
        el.style.opacity = '';
        // Also clear transform that Webflow sets as animation start state
        if (/transform/.test(style) && style.replace(/opacity:\s*0;?\s*/g, '').replace(/transform:[^;]+;?/g, '').trim() === '') {
          el.style.transform = '';
        }
      }
    });
  }

  // ============================================================
  // Video Lightbox (Vimeo / YouTube)
  // ============================================================

  var videoModal = null;

  function buildVideoModal() {
    if (document.getElementById('rh-video-modal')) return;
    var modal = document.createElement('div');
    modal.id = 'rh-video-modal';
    modal.innerHTML =
      '<div class="rh-video-overlay"></div>' +
      '<div class="rh-video-inner">' +
        '<button class="rh-video-close" aria-label="Close video">&times;</button>' +
        '<div class="rh-video-frame"></div>' +
      '</div>';
    document.body.appendChild(modal);

    modal.querySelector('.rh-video-overlay').addEventListener('click', closeVideoModal);
    modal.querySelector('.rh-video-close').addEventListener('click', closeVideoModal);
    videoModal = modal;
  }

  function openVideoModal(url) {
    buildVideoModal();
    var frame = videoModal.querySelector('.rh-video-frame');
    frame.innerHTML = '<iframe src="' + url + '" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>';
    videoModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    if (!videoModal) return;
    videoModal.classList.remove('is-open');
    document.body.style.overflow = '';
    // Stop video by clearing iframe src
    var frame = videoModal.querySelector('.rh-video-frame');
    if (frame) frame.innerHTML = '';
  }

  function initVideoLightbox() {
    // Webflow lightbox — read URL from data-wf-lightbox-slug or inline JSON script sibling
    document.querySelectorAll('.w-lightbox, [data-lightbox]').forEach(function (el) {
      // Try to find the Vimeo/YouTube URL from adjacent JSON script
      var vimeoUrl = null;
      var sibling = el.nextElementSibling;
      while (sibling) {
        if (sibling.tagName === 'SCRIPT' && sibling.textContent.includes('vimeo.com')) {
          try {
            var data = JSON.parse(sibling.textContent);
            if (data.items && data.items[0] && data.items[0].url) {
              vimeoUrl = data.items[0].url;
            }
          } catch (err) {}
          break;
        }
        sibling = sibling.nextElementSibling;
      }
      // Also check inside the element's parent for a script
      if (!vimeoUrl) {
        var parent = el.parentElement;
        if (parent) {
          var scripts = parent.querySelectorAll('script');
          scripts.forEach(function (s) {
            if (s.textContent.includes('vimeo.com') || s.textContent.includes('youtube.com')) {
              try {
                var data = JSON.parse(s.textContent);
                if (data.items && data.items[0] && data.items[0].url) vimeoUrl = data.items[0].url;
              } catch (err) {}
            }
          });
        }
      }
      // Fallback: check data-video-url attribute
      if (!vimeoUrl) vimeoUrl = el.getAttribute('data-video-url') || el.getAttribute('data-src');

      if (vimeoUrl) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          openVideoModal(vimeoUrl);
        });
      }
    });

    // Also handle any generic "Watch Now" / play buttons with a data-video or data-vimeo
    document.querySelectorAll('[data-video-id], [data-vimeo-id]').forEach(function (el) {
      var id = el.getAttribute('data-video-id') || el.getAttribute('data-vimeo-id');
      if (!id) return;
      var url = 'https://player.vimeo.com/video/' + id + '?autoplay=1';
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openVideoModal(url);
      });
    });
  }

  // ============================================================
  // Download Popup
  // ============================================================

  function initDownloadPopup() {
    var popup = document.querySelector('.download-popup');
    if (!popup) return;

    // Open triggers — any .download-button on the page
    document.querySelectorAll('.download-button, [data-open-download]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openDownloadPopup();
      });
    });

    // Close on overlay click (clicking outside the popup card)
    popup.addEventListener('click', function (e) {
      if (e.target === popup) closeDownloadPopup();
    });

    // Close button (if present)
    popup.querySelectorAll('[data-close-popup], .popup-close, .close-popup').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        closeDownloadPopup();
      });
    });

    // Form submission — redirect to PDF after submit
    var form = popup.querySelector('form');
    if (form) {
      var redirectUrl = form.getAttribute('data-redirect') || form.getAttribute('redirect');

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Basic validation
        var email = form.querySelector('[type=email], [name=Email]');
        if (email && !email.value.trim()) {
          email.focus();
          return;
        }

        // Turnstile: require solved before proceeding
        var turnstileInput = form.querySelector('[name="cf-turnstile-response"]');
        if (!turnstileInput || !turnstileInput.value) {
          return;
        }

        // Show brief loading state
        var submitBtn = form.querySelector('[type=submit]');
        if (submitBtn) {
          submitBtn.value = 'Opening...';
          submitBtn.disabled = true;
        }

        // Redirect to PDF
        setTimeout(function () {
          if (redirectUrl) window.open(redirectUrl, '_blank');
          closeDownloadPopup();
          if (submitBtn) {
            submitBtn.value = 'Download Now';
            submitBtn.disabled = false;
          }
          form.reset();
          // Reset Turnstile widget so it can be used again if popup reopens
          if (window.turnstile) {
            var widget = form.querySelector('.cf-turnstile');
            if (widget) window.turnstile.reset(widget);
          }
        }, 400);
      });
    }
  }

  function openDownloadPopup() {
    var popup = document.querySelector('.download-popup');
    if (!popup) return;
    popup.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Turnstile skips hidden elements on page load — render explicitly when popup opens.
    // Retry if the Turnstile script hasn't finished loading yet (race condition with async/defer).
    (function tryRender(attempt) {
      if (window.turnstile) {
        popup.querySelectorAll('.cf-turnstile').forEach(function (widget) {
          if (!widget.querySelector('iframe')) {
            window.turnstile.render(widget);
          }
        });
      } else if (attempt < 50) {
        setTimeout(function () { tryRender(attempt + 1); }, 100);
      }
    }(0));
  }

  function closeDownloadPopup() {
    var popup = document.querySelector('.download-popup');
    if (!popup) return;
    popup.style.display = 'none';
    document.body.style.overflow = '';
  }

  // ============================================================
  // Schedule Popup (HubSpot Meetings modal)
  // ============================================================

  function initSchedulePopup() {
    var popup = document.querySelector('.popup-wrapper');
    if (!popup) return;

    // "Schedule it Now" button opens the popup
    document.querySelectorAll('.primary-copy').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        popup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      });
    });

    // Close button (.image-15) hides the popup
    var closeBtn = popup.querySelector('.image-15');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        popup.style.display = 'none';
        document.body.style.overflow = '';
      });
    }

    // Click on overlay (outside .modal) also closes
    popup.addEventListener('click', function (e) {
      if (e.target === popup) {
        popup.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  }

  // ============================================================
  // Microsoft Card — wire any href="#" cards that show a video
  // ============================================================

  function initMicrosoftCard() {
    document.querySelectorAll('.microsoft-card').forEach(function (card) {
      var href = card.getAttribute('href');
      if (!href || href === '#') return; // already handled by HTML fix
      // If it's still "#", the HTML fix should have updated it
    });
  }

  // ============================================================
  // HubSpot Meetings iframe loader
  // ============================================================

  function initHubSpotMeetings() {
    // HubSpot's MeetingsEmbedCode.js handles iframe creation when present.
    // This fallback only runs if that script is absent (e.g. pages that use
    // data-src without the embed script tag).
    if (window.MeetingsEmbedCode) return;
    document.querySelectorAll('.meetings-iframe-container[data-src]').forEach(function (container) {
      var src = container.getAttribute('data-src');
      if (!src || container.querySelector('iframe')) return;
      var iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.width = '100%';
      iframe.setAttribute('data-hs-ignore', 'true');
      iframe.style.cssText = 'min-width:312px;min-height:615px;height:715px;border:none;';
      container.appendChild(iframe);
    });
  }

  // ============================================================
  // Scroll Animations (Intersection Observer)
  // ============================================================

  function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) return;

    var singles = [
      { sel: '.section-heading',    dir: 'up'    },
      { sel: '.heading-style-h1',   dir: 'up'    },
      { sel: '.heading-style-h2',   dir: 'up'    },
      { sel: '.anothe-title',       dir: 'up'    },
      { sel: '.subtitle',           dir: 'up'    },
      { sel: '.hero-left',          dir: 'left'  },
      { sel: '.hero-image',         dir: 'right' },
      { sel: '.limit-top-content',  dir: 'up'    },
      { sel: '.microsoft-top',      dir: 'up'    },
      { sel: '.microsoft-overlay',  dir: 'up'    },
      { sel: '.solution-component', dir: 'up'    },
      { sel: '.foooter-top',        dir: 'up'    },
      { sel: '.footer-component',   dir: 'up'    },
      { sel: '.customiz-header',    dir: 'up'    },
      { sel: '.customize-paragraph', dir: 'up'   },
      { sel: '.uui-section-header', dir: 'up'    },
      { sel: '.limit-section-header', dir: 'up'  },
      { sel: '.cta-component',      dir: 'up'    },
      { sel: '.rich-text-block',    dir: 'up'    },
      { sel: '.pricing-header',     dir: 'up'    },
      { sel: '.blog-post_content-left', dir: 'up' },
    ];

    var groups = [
      { sel: '.bottom-limit-grid',               dir: 'up'    },
      { sel: '.platform-grid',                   dir: 'up'    },
      { sel: '.security-section .w-layout-grid', dir: 'up'    },
      { sel: '.blog-section .w-dyn-list',        dir: 'up'    },
      { sel: '.microsoft-right',                 dir: 'up'    },
      { sel: '.experience-grid',                 dir: 'scale' },
      { sel: '.customiz-grid',                   dir: 'scale' },
      { sel: '.pricing-cards',                   dir: 'scale' },
      { sel: '.testimony-wrapper',               dir: 'scale' },
      { sel: '.core-values-cards',               dir: 'scale' },
      { sel: '.future-bright-cards-wrapper',     dir: 'scale' },
      { sel: '.why-bi-cards',                    dir: 'scale' },
      { sel: '.bi-genius-cards',                 dir: 'scale' },
      { sel: '.ai-cards-grid',                   dir: 'scale' },
      { sel: '.ai-final-cards-embed',            dir: 'scale' },
      { sel: '.pricing-question-cards',          dir: 'scale' },
      { sel: '.insights-cards',                  dir: 'scale' },
      { sel: '.partners-grid',                   dir: 'scale' },
      { sel: '.blog-grid',                       dir: 'scale' },
      { sel: '.lp-cards-grid',                   dir: 'scale' },
    ];

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('anim-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0.1 });

    singles.forEach(function(item) {
      document.querySelectorAll(item.sel).forEach(function(el) {
        el.classList.add('anim-ready', 'anim-' + item.dir);
        observer.observe(el);
      });
    });

    groups.forEach(function(item) {
      document.querySelectorAll(item.sel).forEach(function(parent) {
        Array.from(parent.children).forEach(function(child, i) {
          child.classList.add('anim-ready', 'anim-' + item.dir);
          child.style.transitionDelay = Math.min(i * 100, 400) + 'ms';
          observer.observe(child);
        });
      });
    });

    // Handle data-aos elements (17 pages use data-aos="fade-up")
    document.querySelectorAll('[data-aos]').forEach(function(el) {
      var aosVal = el.getAttribute('data-aos');
      var dir = 'up';
      if (aosVal === 'fade-left') dir = 'left';
      else if (aosVal === 'fade-right') dir = 'right';
      el.classList.add('anim-ready', 'anim-' + dir);
      var delay = el.getAttribute('data-aos-delay');
      if (delay) el.style.transitionDelay = delay + 'ms';
      observer.observe(el);
    });
  }

  // ============================================================
  // Blog Pagination (6 items per page, 3×2 grid)
  // ============================================================

  function initBlogPagination() {
    // Target only the main blog list, not the single featured post
    var list = document.querySelector('.blog-list:not(.is-single)');
    if (!list) return;

    var paginationWrapper = document.querySelector('.w-pagination-wrapper.pagination');
    if (!paginationWrapper) return;

    var prevBtn = paginationWrapper.querySelector('.w-pagination-previous');
    var nextBtn = paginationWrapper.querySelector('.w-pagination-next');
    var pageCount = paginationWrapper.querySelector('.w-page-count');

    var items = Array.from(list.querySelectorAll('.blog-item'));
    if (!items.length) return;

    var ITEMS_PER_PAGE = 6;
    var totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    var currentPage = 1;

    function showPage(page, scroll) {
      var start = (page - 1) * ITEMS_PER_PAGE;
      var end = start + ITEMS_PER_PAGE;

      items.forEach(function(item, i) {
        item.style.display = (i >= start && i < end) ? '' : 'none';
      });

      if (pageCount) {
        pageCount.textContent = 'Page ' + page + ' of ' + totalPages;
        pageCount.setAttribute('aria-label', 'Page ' + page + ' of ' + totalPages);
      }

      // Disable / enable nav buttons
      var disabledStyle = 'opacity:.35;pointer-events:none;cursor:default;';
      prevBtn.style.cssText = page <= 1 ? disabledStyle : '';
      nextBtn.style.cssText = page >= totalPages ? disabledStyle : '';

      currentPage = page;

      // Scroll to top of the blog section (skip on initial load)
      if (scroll) {
        var scrollTarget = list.closest('.blog-list-wrapper') || list;
        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    prevBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (currentPage > 1) showPage(currentPage - 1, true);
    });

    nextBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (currentPage < totalPages) showPage(currentPage + 1, true);
    });

    // Initialise first page (no scroll)
    showPage(1, false);
  }

  // ============================================================
  // Initialize Everything
  // ============================================================

  // ============================================================
  // Turnstile submit guard
  // Blocks native form submission to Formspree until the widget
  // has been solved (cf-turnstile-response input is populated).
  // ============================================================

  function initTurnstileGuard() {
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form.querySelector('.cf-turnstile')) return;

      var tokenInput = form.querySelector('[name="cf-turnstile-response"]');
      // Allow only if the input exists and has a value (widget solved)
      if (tokenInput && tokenInput.value) return;

      // Widget not yet solved — block submission and show feedback
      e.preventDefault();
      e.stopImmediatePropagation();

      var widget = form.querySelector('.cf-turnstile');
      if (widget) {
        // If the widget hasn't rendered yet (Turnstile was slow), trigger it now
        if (!widget.querySelector('iframe') && window.turnstile) {
          window.turnstile.render(widget);
        }
        // Place error message after the widget, not inside it, so it's visible
        // even when the widget hasn't rendered
        var msg = widget.parentNode.querySelector('.ts-error-msg');
        if (!msg) {
          msg = document.createElement('p');
          msg.className = 'ts-error-msg';
          msg.style.cssText = 'color:#c00;font-size:13px;margin:4px 0 0;';
          widget.insertAdjacentElement('afterend', msg);
        }
        msg.textContent = 'Please complete the security check above to continue.';
      }
    }, true);
  }

  function init() {
    document.documentElement.classList.add('w-mod-js');
    if ('ontouchstart' in window || (window.DocumentTouch && document instanceof DocumentTouch)) {
      document.documentElement.classList.add('w-mod-touch');
    }

    clearStuckOpacity();
    initMobileNav();
    initDropdowns();
    initFaqAccordion();
    initTabs();
    initSmoothScroll();
    initNavbarScroll();
    initCurrentPage();
    initVideoLightbox();
    initDownloadPopup();
    initSchedulePopup();
    initMicrosoftCard();
    initHubSpotMeetings();
    initScrollAnimations();
    initBlogPagination();
    initTurnstileGuard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
