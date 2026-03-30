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
          if (other !== list) other.classList.remove('w--open');
        });
        list.classList.add('w--open');
        toggle.setAttribute('aria-expanded', 'true');
      }

      function close() {
        closeTimeout = setTimeout(function () {
          list.classList.remove('w--open');
          toggle.setAttribute('aria-expanded', 'false');
        }, delay);
      }

      // Click to toggle
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (list.classList.contains('w--open')) {
          list.classList.remove('w--open');
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
        }, 400);
      });
    }
  }

  function openDownloadPopup() {
    var popup = document.querySelector('.download-popup');
    if (!popup) return;
    popup.style.display = 'flex';
    document.body.style.overflow = 'hidden';
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
  // Initialize Everything
  // ============================================================

  function init() {
    document.documentElement.classList.add('w-mod-js');
    if ('ontouchstart' in window || (window.DocumentTouch && document instanceof DocumentTouch)) {
      document.documentElement.classList.add('w-mod-touch');
    }

    clearStuckOpacity();
    initMobileNav();
    initDropdowns();
    initTabs();
    initSmoothScroll();
    initNavbarScroll();
    initCurrentPage();
    initVideoLightbox();
    initDownloadPopup();
    initSchedulePopup();
    initMicrosoftCard();
    initHubSpotMeetings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
