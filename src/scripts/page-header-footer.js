export const pageHeaderFooter = function (App) {
  // 4Site Code Start
  const searchBtn = document.querySelector(".search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "https://www.worldwildlife.org/search";
    });
  }

  // Converted to Vanilla JS and moved into Page Template
  // if ("wwfHeader" in window) {
  //   let wwfHeader = window.wwfHeader;
  //   const contentHeader = document.querySelector(".content-header");
  //   if (contentHeader) {
  //     const shadedLight = document.createElement("div");
  //     shadedLight.classList.add("shaded-light-pattern");
  //     if (wwfHeader.toLowerCase().includes("panda")) {
  //       shadedLight.classList.add("panda-nation");
  //       wwfHeader = `Panda<span class='h2-orange'>Nation</span>`;
  //     }
  //     shadedLight.innerHTML = `
  //     <div class="section-parts wrapper">
  //       <div id="panda-nation-banner-header" class="row">
  //         <div id="panda-nation-title" class="span5">
  //           <h2>${wwfHeader}</h2>
  //         </div>
  //       </div>
  //     </div>
  //     `;
  //     contentHeader.appendChild(shadedLight);
  //     App.setBodyData("no-content-header", false);
  //   }
  // } else if (
  //   "pageJson" in window &&
  //   ["tweetpage", "advocacypetition", "emailtotarget"].includes(
  //     window.pageJson.pageType
  //   )
  // ) {
  //   const contentHeader = document.querySelector(".content-header");
  //   if (contentHeader) {
  //     const shadedLight = document.createElement("div");
  //     shadedLight.classList.add("shaded-light-pattern");
  //     shadedLight.innerHTML = `
  //     <div class="section-parts wrapper">
  //       <div id="panda-nation-banner-header" class="row">
  //         <div id="panda-nation-title" class="span5">
  //           <h2>Action Center</h2>
  //         </div>
  //       </div>
  //     </div>
  //     `;
  //     contentHeader.appendChild(shadedLight);
  //     App.setBodyData("no-content-header", false);
  //   }
  // }

  // 4Site Code End
  ((window, document) => {
    var _self = {
      headerNav: {
        init: function () {
          var _this = this;

          _this.setVars();
          _this.bindEvents();
        },

        setVars: function () {
          const _this = _self.headerNav;

          _this.$header = document.getElementById("header");
          if (!_this.$header) return;
          _this.$dropdown = _this.$header.querySelector("div.dropdown");
          _this.$control = _this.$header.querySelectorAll(".control-expand");
          _this.$accordionControls =
            _this.$header.querySelectorAll(".control-accordion");
          _this.$actionNavControls = [..._this.$accordionControls].filter(
            (el) => /^action-nav.*/.test(el.getAttribute("aria-controls"))
          );
          _this.mobileHeaderMq = window.matchMedia("(max-width: 767px)");
          _this.searchControls = _this.$header.querySelectorAll(".search-btn");
        },

        bindEvents: function () {
          const _this = _self.headerNav;

          if (!_this.$header) return;

          _this.$control.forEach((control) => {
            control.addEventListener("click", _this.handleDropdownClick);
          });

          _this.$accordionControls.forEach((el) => {
            el.addEventListener("click", _this.handleAccordionClick);
            el.addEventListener("mouseenter", _this.handleAccordionHover);
            el.addEventListener("mouseleave", _this.handleAccordionHover);
            _this
              .getPanel(el.getAttribute("aria-controls"))
              .addEventListener("mouseleave", _this.handleDropdownHover);
          });
          document.addEventListener("click", _this.handleDocumentClick);
          _this.searchControls.forEach((el) => {
            el.addEventListener("click", _this.handleAccordionClick);
          });
        },

        handleDropdownClick: function (e) {
          const _this = _self.headerNav;

          const $target = e.currentTarget;
          const $panel = _this.getPanel($target.getAttribute("aria-controls"));
          if (
            (!_this.$control[0].classList.contains("expanded") &&
              _this.$control[0] ===
                document.querySelector("#header .control.control-expand")) ||
            !_this.isPanelExpanded($panel) ||
            !document.querySelector(".nav-content .dropdown.dropdown-expanded")
          ) {
            _this.$dropdown.classList.add("dropdown-expanded");
            _this.$control.forEach((control) => {
              control.classList.add("expanded");
            });
          } else {
            _this.$dropdown.classList.remove("dropdown-expanded");
            _this.$control.forEach((control) => {
              control.classList.remove("expanded");
            });
          }

          if (!_this.panelScrollTops) {
            setTimeout(_this.setPanelScrollTops, 250);
          }

          document.querySelector("body").classList.toggle("freeze");

          e.preventDefault();
        },

        handleAccordionClick: function (e) {
          const _this = _self.headerNav;

          const $target = e.currentTarget;
          const $panel = _this.getPanel($target.getAttribute("aria-controls"));

          if (_this.mobileHeaderMq.matches) {
            const panelScrollTop = _this.getPanelScrollTop($panel);
          }

          if (_this.isPanelExpanded($panel)) {
            _this.closePanel($panel, $target);
            _this.setPanelHeight($panel, 0);
            $target.classList.remove("expanded");
          } else {
            _this.closeExpandedPanels();
            _this.expandPanel($panel, $target);
            _this.setPanelHeight(
              $panel,
              _this.getPanelHeight(
                $panel.querySelectorAll(".nav-item-accordion-inner")
              )
            );
            $target.classList.add("expanded");

            if (
              _this.mobileHeaderMq.matches &&
              !$target === _this.$actionNavControls
            ) {
              _this.scrollToPanel(panelScrollTop);
            }
          }

          e.preventDefault();
        },

        handleAccordionHover: function (e) {
          const _this = _self.headerNav;
          const $target = e.currentTarget;
          const $panel = _this.getPanel($target.getAttribute("aria-controls"));
          const isMouseenterClick =
            e.type === "mouseenter" && !_this.isPanelExpanded($panel);
          const isMouseleaveClick =
            e.type === "mouseleave" &&
            e.relatedTarget !== undefined &&
            e.relatedTarget !== null &&
            $panel.contains(e.relatedTarget) &&
            !e.relatedTarget.classList.contains("nav-item") &&
            !e.relatedTarget.classList.contains("action-link") &&
            e.relatedTarget !==
              document.querySelectorAll("ul.nav.primary-nav")[0];

          if (
            (isMouseenterClick || isMouseleaveClick) &&
            _this.shouldHoverWork()
          ) {
            $target.click();
          }
        },

        handleDropdownHover: function (e) {
          const _this = _self.headerNav;
          const $target = e.target;
          const $control = document.querySelector(
            `[aria-controls=${$target.getAttribute("id")}]`
          );

          const isMouseleaveClick =
            e.relatedTarget !== undefined &&
            e.relatedTarget !== null &&
            !($control === e.relatedTarget) &&
            !e.relatedTarget.classList.contains("nav-item") &&
            !e.relatedTarget.classList.contains("action-link") &&
            !$control.contains(e.relatedTarget);

          if (isMouseleaveClick && _this.shouldHoverWork()) {
            $control.click();
          }
        },

        handleDocumentClick: function (e) {
          if (_self.headerNav.mobileHeaderMq.matches) {
            // close any open menus (on mobile) with search click
            const _this = _self.headerNav;
            const clickFromInsideSearch =
              e.target.closest(".search")?.length === 1;

            if (clickFromInsideSearch) {
              _this.closeExpandedPanels();
            }
          } else {
            // close any open menus (on desktop) with off-nav or off-search clicks
            const _this = _self.headerNav;
            const clickFromOutsideNavItem =
              e.target.closest(".nav-items") === null;
            const clickFromOutsideSearch = e.target.closest(".search") === null;

            if (clickFromOutsideNavItem && clickFromOutsideSearch) {
              _this.closeExpandedPanels();
            }
          }
        },

        getPanel: function (id) {
          return document.getElementById(id);
        },

        getPanelHeight: function ($el) {
          return $el[0].getBoundingClientRect().height;
        },

        setPanelHeight: function ($el, height) {
          const maxHeight = height + "px";

          $el.style.maxHeight = maxHeight;
        },

        setPanelScrollTops: function () {
          const _this = _self.headerNav;

          _this.panelScrollTops = [];

          _this.$accordionControls.forEach((el, index) => {
            const $target = el;
            const $panel = _this.getPanel(
              $target.getAttribute("aria-controls")
            );

            _this.panelScrollTops[index] =
              $panel.parentNode.getBoundingClientRect().top + window.scrollY;
          });
        },

        getPanelScrollTop: function ($currentPanel) {
          const _this = _self.headerNav;

          _this.$accordionControls.forEach((el, index) => {
            const $target = el;
            const $panel = _this.getPanel(
              $target.getAttribute("aria-controls")
            );

            if ($panel[0] === $currentPanel[0]) {
              _this.currentPanelScrollTop = _this.panelScrollTops[index];
            }
          });

          return _this.currentPanelScrollTop;
        },

        scrollToPanel: function (panelScrollTop) {
          const _this = _self.headerNav;
          _this.$dropdown.scrollTop(panelScrollTop);
        },

        isPanelExpanded: function ($el) {
          if ($el) {
            const hiddenAttr = $el.getAttribute("hidden");
            return (
              hiddenAttr !== "" && hiddenAttr !== true && hiddenAttr === null
            );
          } else {
            return true;
          }
        },

        shouldHoverWork: function () {
          // only hover for desktop header on non-touch devices
          // removing modenizr to simplify code
          return !_self.headerNav.mobileHeaderMq.matches;
        },

        expandPanel: function ($el, $trigger) {
          $trigger.setAttribute("aria-expanded", true);
          $el.removeAttribute("hidden");
        },

        closePanel: function ($el, $trigger) {
          // use delay to all for css fade-out
          $trigger.setAttribute("aria-expanded", false);
          $el.setAttribute("hidden", true);
        },

        closeExpandedPanels: function () {
          const _this = _self.headerNav;

          _this.$accordionControls.forEach((el) => {
            const $target = el;
            const $panel = _this.getPanel(
              $target.getAttribute("aria-controls")
            );
            if (_this.isPanelExpanded($panel)) {
              _this.closePanel($panel, $target);
              _this.setPanelHeight($panel, 0);
              $target.classList.toggle("expanded");
            }
          });
        },
      },
    };
    _self.headerNav.init();
  })(window, document);
};
