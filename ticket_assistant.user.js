// ==UserScript==
// @name         Semi-Automatic Ticket Assistant
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Modular assistant for ticket snatching with UI, pre-filling, and safety controls.
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // ==========================================
  // CONFIGURATION & CONSTANTS
  // ==========================================
  const CONFIG = {
    POLLING_INTERVAL: 100, // 高頻檢測 (ms)
    SELECTORS: {
      // --- 拓元 tixCraft ---
      tixcraft: {
        areas: ".area-list li:not(.none) a, .zone-area-list li:not(.none) a",
        ticket_selects: 'select[id^="TicketForm_ticketPrice_"]',
        agreement: "#TicketForm_agree",
        captcha: "#TicketForm_verifyCode",
      },
      // --- KKTIX ---
      kktix: {
        ticket_selects: "select.form-control",
        agreement: "#person_agree_terms",
        captcha: "#captcha_answer",
        next_btn: ".btn-registration",
      },
    },
  };

  let isRunning = true;

  // ==========================================
  // MODULE 2: AUTOMATION LOGIC
  // ==========================================
  const automationFlow = () => {
    if (!isRunning) return;

    const url = window.location.href;

    // --- 拓元 tixCraft 邏輯 ---
    if (url.includes("tixcraft.com")) {
      // 1. 區域選擇頁面
      if (url.includes("/ticket/area")) {
        const availableArea = document.querySelector(CONFIG.SELECTORS.tixcraft.areas);
        if (availableArea) {
          updateStatus("TixCraft: Area found!");
          availableArea.click();
        }
      }
      // 2. 訂購頁面
      if (url.includes("/ticket/order")) {
        const selects = document.querySelectorAll(CONFIG.SELECTORS.tixcraft.ticket_selects);
        selects.forEach((select) => {
          if (select.value === "0" && select.options.length > 2) {
            select.value = "2"; // 預設 2 張
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });
        const agree = document.querySelector(CONFIG.SELECTORS.tixcraft.agreement);
        if (agree && !agree.checked) {
          agree.checked = true;
          updateStatus("TixCraft: Agreement checked.");
        }
        const captcha = document.querySelector(CONFIG.SELECTORS.tixcraft.captcha);
        if (captcha && document.activeElement !== captcha) {
          captcha.focus();
          updateStatus("TixCraft: Focusing Captcha!");
        }
      }
    }

    // --- KKTIX 邏輯 ---
    if (url.includes("kktix.com")) {
      // 1. 活動首頁 (自動點擊報名)
      const nextBtn = document.querySelector(CONFIG.SELECTORS.kktix.next_btn);
      if (nextBtn && !url.includes("/registrations/")) {
        updateStatus("KKTIX: Clicking registration!");
        nextBtn.click();
      }

      // 2. 購票頁面
      if (url.includes("/registrations/new")) {
        // 自動選張數 (第一個票種選 2 張)
        const selects = document.querySelectorAll(CONFIG.SELECTORS.kktix.ticket_selects);
        if (selects.length > 0 && selects[0].value === "0") {
          selects[0].value = "2"; // 預設 2 張
          selects[0].dispatchEvent(new Event("change", { bubbles: true }));
          updateStatus("KKTIX: Quantity set.");
        }

        // 自動勾選同意
        const agree = document.querySelector(CONFIG.SELECTORS.kktix.agreement);
        if (agree && !agree.checked) {
          agree.checked = true;
          updateStatus("KKTIX: Agreement checked.");
        }

        // 聚焦驗證碼
        const captcha = document.querySelector(CONFIG.SELECTORS.kktix.captcha);
        if (captcha && document.activeElement !== captcha) {
          captcha.focus();
          updateStatus("KKTIX: Focusing Captcha!");
        }
      }
    }
  };

  // ==========================================
  // MODULE 3: UI OVERLAY (UI/UX Pro Max Style)
  // ==========================================
  const createOverlay = () => {
    if (document.getElementById("ticket-assistant-ui")) return;

    const div = document.createElement("div");
    div.id = "ticket-assistant-ui";
    div.style = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
            color: #00e5ff;
            padding: 20px;
            border-radius: 12px;
            font-family: 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 8px 32px rgba(0, 229, 255, 0.2);
            border: 1px solid rgba(0, 229, 255, 0.3);
            min-width: 220px;
            backdrop-filter: blur(8px);
        `;
    div.innerHTML = `
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <span style="width: 10px; height: 10px; background: #00e5ff; border-radius: 50%; box-shadow: 0 0 8px #00e5ff;"></span>
                TICKET ASSISTANT
            </div>
            <div style="font-size: 13px; color: #aaa; margin-bottom: 4px;">SYSTEM STATUS</div>
            <div id="status-display" style="font-weight: 500; margin-bottom: 12px; color: #fff;">Initializing...</div>
            <div style="font-size: 13px; color: #aaa; margin-bottom: 4px;">TARGET SITE</div>
            <div id="site-display" style="font-family: monospace; font-size: 14px; color: #fff; margin-bottom: 16px;">Scanning...</div>
            <div style="display: flex; gap: 8px;">
                <button id="toggle-script" style="
                    flex: 1;
                    padding: 8px 12px;
                    border: none;
                    border-radius: 6px;
                    background: #00e5ff;
                    color: #000;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                ">STOP</button>
            </div>
        `;
    document.body.appendChild(div);

    div.querySelector("#toggle-script").onclick = () => {
      isRunning = !isRunning;
      const btn = div.querySelector("#toggle-script");
      btn.innerText = isRunning ? "STOP" : "START";
      btn.style.background = isRunning ? "#00e5ff" : "#666";
      updateStatus(isRunning ? "Scanning" : "Paused");
    };

    // 更新顯示網站
    const url = window.location.href;
    const siteDisplay = div.querySelector("#site-display");
    if (url.includes("tixcraft.com")) siteDisplay.innerText = "tixCraft Mode";
    if (url.includes("kktix.com")) siteDisplay.innerText = "KKTIX Mode";
  };

  const updateStatus = (msg) => {
    const el = document.querySelector("#status-display");
    if (el) el.innerText = msg;
  };

  // ==========================================
  // MAIN EXECUTION
  // ==========================================
  const init = () => {
    console.log("[Assistant] Initializing...");
    createOverlay();
    updateStatus("Ready...");

    setInterval(automationFlow, CONFIG.POLLING_INTERVAL);
  };

  // Wait for document to be ready
  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init);
  }
})();
