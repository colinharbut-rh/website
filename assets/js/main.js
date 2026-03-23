/**
 * Reporting Hub - Main JavaScript
 * Replaces webflow.js (582KB) with lightweight vanilla JS (~5KB)
 * Handles: dropdowns, mobile nav, tabs, smooth scroll, back-to-top
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
          if (window.innerWidth > 991) {
            open();
          }
        });

        dropdown.addEventListener('mouseleave', function () {
          if (window.innerWidth > 991) {
            close();
          }
        });
      }

      // Keep open when hovering over dropdown list
      list.addEventListener('mouseenter', function () {
        clearTimeout(closeTimeout);
      });

      list.addEventListener('mouseleave', function () {
        if (isHover && window.innerWidth > 991) {
          close();
        }
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

          // Remove active from all
          tabLinks.forEach(function (l) { l.classList.remove('w--current'); });
          tabPanes.forEach(function (p) { p.classList.remove('w--tab-active'); });

          // Activate clicked tab
          link.classList.add('w--current');
          if (tabPanes[index]) {
            tabPanes[index].classList.add('w--tab-active');
          }

          // Also try matching by data-w-tab attribute
          var tabId = link.getAttribute('data-w-tab');
          if (tabId) {
            tabPanes.forEach(function (pane) {
              if (pane.getAttribute('data-w-tab') === tabId) {
                pane.classList.add('w--tab-active');
              }
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
      if (window.scrollY > 50) {
        navbar.classList.add('bg-black');
      } else {
        navbar.classList.remove('bg-black');
      }
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
        if (link.hasAttribute('aria-current')) {
          link.setAttribute('aria-current', 'page');
        }
      }
    });
  }

  // ============================================================
  // Initialize Everything
  // ============================================================

  function init() {
    // Add w-mod-js class (replaces the inline webflow detection script)
    document.documentElement.classList.add('w-mod-js');
    if ('ontouchstart' in window || (window.DocumentTouch && document instanceof DocumentTouch)) {
      document.documentElement.classList.add('w-mod-touch');
    }

    initMobileNav();
    initDropdowns();
    initTabs();
    initSmoothScroll();
    initNavbarScroll();
    initCurrentPage();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
