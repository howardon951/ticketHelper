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
    POLLING_INTERVAL: 500, // ms
    USER_DATA: {
      name: "YOUR_NAME",
      phone: "0912345678",
      email: "example@mail.com",
      id: "A123456789",
    },
    SELECTORS: {
      submit_btn: 'button[type="submit"]',
      name_input: 'input[name="name"]',
      // Add more selectors here
    },
  };

  let isRunning = true;

  // ==========================================
  // MODULE 1: ENVIRONMENT & DETECTION
  // ==========================================
  const waitForElement = (selector, timeout = 10000) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const timer = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(timer);
          resolve(el);
        } else if (Date.now() - start > timeout) {
          clearInterval(timer);
          reject(
            new Error(`Element ${selector} not found within ${timeout}ms`),
          );
        }
      }, 100);
    });
  };

  // ==========================================
  // MODULE 3: UI OVERLAY
  // ==========================================
  const createOverlay = () => {
    const div = document.createElement("div");
    div.id = "ticket-assistant-ui";
    div.style = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.85);
            color: #00ff00;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            border: 1px solid #00ff00;
            min-width: 150px;
        `;
    div.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #00ff00;">TICKET ASSISTANT</div>
            <div id="status-display">Status: Loading...</div>
            <div id="countdown-display">Target: --:--:--</div>
            <button id="toggle-script" style="margin-top: 10px; cursor: pointer;">STOP</button>
        `;
    document.body.appendChild(div);

    div.querySelector("#toggle-script").onclick = () => {
      isRunning = !isRunning;
      div.querySelector("#toggle-script").innerText = isRunning
        ? "STOP"
        : "START";
      div.querySelector("#status-display").innerText =
        `Status: ${isRunning ? "Running" : "Paused"}`;
    };
  };

  const updateStatus = (msg) => {
    const el = document.querySelector("#status-display");
    if (el) el.innerText = `Status: ${msg}`;
  };

  // ==========================================
  // MODULE 2: DATA PRE-FILLING
  // ==========================================
  const fillData = () => {
    if (!isRunning) return;
    Object.keys(CONFIG.SELECTORS).forEach((key) => {
      const el = document.querySelector(CONFIG.SELECTORS[key]);
      if (el && CONFIG.USER_DATA[key]) {
        el.value = CONFIG.USER_DATA[key];
        el.dispatchEvent(new Event("input", { bubbles: true }));
        console.log(`[Assistant] Filled ${key}`);
      }
    });
  };

  // ==========================================
  // MAIN EXECUTION
  // ==========================================
  const init = () => {
    console.log("[Assistant] Initializing...");
    createOverlay();
    updateStatus("Ready");

    setInterval(() => {
      if (isRunning) {
        fillData();
        // Add more repetitive checks here
      }
    }, CONFIG.POLLING_INTERVAL);
  };

  // Wait for document to be ready
  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init);
  }
})();
