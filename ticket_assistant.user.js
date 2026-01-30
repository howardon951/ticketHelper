// ==UserScript==
// @name         KKTIX 搶票助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  KKTIX 自動化搶票：輸入活動網址 → 自動選票、勾選、下一步
// @author       You
// @match        *://kktix.com/*
// @match        *://*.kktix.cc/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // ==========================================
  // 狀態管理
  // ==========================================
  const STATE_KEY = "kktix_assistant_state";

  const getState = () => {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY)) || {};
    } catch {
      return {};
    }
  };

  const saveState = (newState) => {
    const current = getState();
    localStorage.setItem(STATE_KEY, JSON.stringify({ ...current, ...newState }));
  };

  const clearState = () => {
    localStorage.removeItem(STATE_KEY);
  };

  // ==========================================
  // 工具函數
  // ==========================================
  const log = (msg) => {
    console.log(`[KKTIX助手] ${msg}`);
    const el = document.getElementById("status-display");
    if (el) el.textContent = msg;
  };

  const parseEventUrl = (url) => {
    // 支援格式：
    // https://ntw.kktix.cc/events/ntw-copy-2
    // https://kktix.com/events/ntw-copy-2
    const match = url.match(/(?:kktix\.cc|kktix\.com)\/events\/([^\/\?]+)/);
    if (match) {
      return match[1]; // 返回 event slug
    }
    return null;
  };

  const getRegistrationUrl = (eventSlug) => {
    return `https://kktix.com/events/${eventSlug}/registrations/new`;
  };

  // ==========================================
  // 票種資訊讀取
  // ==========================================
  const getTicketInfo = () => {
    const tickets = [];
    // KKTIX 使用 .ticket-unit 作為票種容器
    const units = document.querySelectorAll(".ticket-unit");

    units.forEach((unit, index) => {
      const plusBtn = unit.querySelector("button.plus, button.btn-default.plus");
      const inputEl = unit.querySelector('input[type="text"]');
      const texts = unit.innerText.split("\n").filter((t) => t.trim());

      if (plusBtn && texts.length >= 2) {
        tickets.push({
          index,
          name: texts[0].trim(),
          price: texts.find((t) => t.includes("TWD"))?.trim() || texts[1].trim(),
          input: inputEl,
          plusBtn,
        });
      }
    });

    return tickets;
  };

  // ==========================================
  // 自動化執行
  // ==========================================
  const executeAutomation = () => {
    const state = getState();
    if (!state.autoRun) return;

    log("執行自動化中...");

    // 1. 關閉彈出視窗
    const closeDialog = document.querySelector(".modal .btn-default.pull-right");
    if (closeDialog && closeDialog.textContent.includes("暫時不要")) {
      closeDialog.click();
      log("已關閉彈出視窗");
    }

    // 等待頁面載入
    setTimeout(() => {
      const tickets = getTicketInfo();
      if (tickets.length === 0) {
        log("等待票種載入...");
        setTimeout(executeAutomation, 500);
        return;
      }

      // 2. 選擇票種和張數
      const targetIndex = state.ticketIndex || 0;
      const targetQty = state.quantity || 2;
      const targetTicket = tickets[targetIndex];

      if (targetTicket) {
        log(`選擇 ${targetTicket.name} x ${targetQty} 張`);

        const currentQty = parseInt(targetTicket.input.value) || 0;
        const clicksNeeded = targetQty - currentQty;

        if (clicksNeeded > 0) {
          for (let i = 0; i < clicksNeeded; i++) {
            setTimeout(() => targetTicket.plusBtn.click(), i * 60);
          }
        }
      }

      // 3. 勾選同意條款
      setTimeout(() => {
        const agree = document.querySelector("#person_agree_terms");
        if (agree && !agree.checked) {
          agree.click();
          log("已勾選同意條款");
        }

        // 4. 點擊下一步
        setTimeout(() => {
          const nextBtn = document.querySelector("button.btn-primary.btn-lg:not([disabled])");
          if (nextBtn) {
            log("點擊下一步...");
            nextBtn.click();
            clearState(); // 完成後清除狀態
          } else {
            log("下一步按鈕尚未啟用，請手動點擊");
          }
        }, 300);
      }, targetQty * 80 + 200);

    }, 800);
  };

  // ==========================================
  // UI 介面
  // ==========================================
  const createUI = () => {
    if (document.getElementById("kktix-assistant-ui")) return;

    const state = getState();

    const div = document.createElement("div");
    div.id = "kktix-assistant-ui";
    div.innerHTML = `
      <style>
        #kktix-assistant-ui {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          border-radius: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          width: 360px;
          overflow: hidden;
        }
        #kktix-assistant-ui * {
          box-sizing: border-box;
        }
        #kktix-assistant-ui .header {
          background: linear-gradient(90deg, #00d9ff, #00ff88);
          padding: 14px 18px;
          font-weight: bold;
          font-size: 15px;
          color: #000;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        #kktix-assistant-ui .header .dot {
          width: 10px;
          height: 10px;
          background: #000;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.9); }
        }
        #kktix-assistant-ui .body {
          padding: 18px;
        }
        #kktix-assistant-ui .section {
          margin-bottom: 18px;
        }
        #kktix-assistant-ui .section:last-child {
          margin-bottom: 0;
        }
        #kktix-assistant-ui .section-title {
          font-size: 11px;
          color: #888;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        #kktix-assistant-ui .status-box {
          background: rgba(0, 217, 255, 0.1);
          border: 1px solid rgba(0, 217, 255, 0.3);
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 13px;
          color: #00d9ff;
        }
        #kktix-assistant-ui label {
          display: block;
          font-size: 12px;
          color: #aaa;
          margin-bottom: 6px;
        }
        #kktix-assistant-ui input[type="text"],
        #kktix-assistant-ui select {
          width: 100%;
          padding: 10px 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 13px;
          margin-bottom: 12px;
          transition: border-color 0.2s;
        }
        #kktix-assistant-ui input[type="text"]:focus,
        #kktix-assistant-ui select:focus {
          outline: none;
          border-color: #00d9ff;
        }
        #kktix-assistant-ui input[type="text"]::placeholder {
          color: #666;
        }
        #kktix-assistant-ui .form-row {
          display: flex;
          gap: 12px;
        }
        #kktix-assistant-ui .form-row > div {
          flex: 1;
        }
        #kktix-assistant-ui .form-row > div:first-child {
          flex: 1.5;
        }
        #kktix-assistant-ui .form-row select {
          margin-bottom: 0;
        }
        #kktix-assistant-ui .btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 10px;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 10px;
        }
        #kktix-assistant-ui .btn:last-child {
          margin-bottom: 0;
        }
        #kktix-assistant-ui .btn-primary {
          background: linear-gradient(90deg, #00d9ff, #00ff88);
          color: #000;
        }
        #kktix-assistant-ui .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 217, 255, 0.4);
        }
        #kktix-assistant-ui .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        #kktix-assistant-ui .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        #kktix-assistant-ui .ticket-preview {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 12px;
          font-size: 12px;
        }
        #kktix-assistant-ui .ticket-preview .label {
          color: #888;
          margin-bottom: 4px;
        }
        #kktix-assistant-ui .ticket-preview .value {
          color: #00ff88;
          font-weight: 600;
        }
        #kktix-assistant-ui .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 16px 0;
        }
        #kktix-assistant-ui .help-text {
          font-size: 11px;
          color: #666;
          margin-top: 8px;
        }
      </style>

      <div class="header">
        <span class="dot"></span>
        KKTIX 搶票助手 v1.0
      </div>

      <div class="body">
        <div class="section">
          <div class="section-title">系統狀態</div>
          <div class="status-box" id="status-display">準備就緒</div>
        </div>

        <div class="section">
          <div class="section-title">步驟 1：輸入活動網址</div>
          <label>活動 URL</label>
          <input type="text" id="input-url" placeholder="https://xxx.kktix.cc/events/xxx" value="${state.eventUrl || ""}">
          <div class="help-text">例如：https://ntw.kktix.cc/events/ntw-copy-2</div>
        </div>

        <div class="section">
          <div class="section-title">步驟 2：選擇票種與張數</div>
          <div class="form-row">
            <div>
              <label>票種（第幾個）</label>
              <select id="select-ticket">
                <option value="0" ${state.ticketIndex === 0 ? "selected" : ""}>第 1 個票種</option>
                <option value="1" ${state.ticketIndex === 1 ? "selected" : ""}>第 2 個票種</option>
                <option value="2" ${state.ticketIndex === 2 ? "selected" : ""}>第 3 個票種</option>
                <option value="3" ${state.ticketIndex === 3 ? "selected" : ""}>第 4 個票種</option>
              </select>
            </div>
            <div>
              <label>購買張數</label>
              <select id="select-quantity">
                <option value="1" ${state.quantity === 1 ? "selected" : ""}>1 張</option>
                <option value="2" ${state.quantity === 2 || !state.quantity ? "selected" : ""}>2 張</option>
                <option value="3" ${state.quantity === 3 ? "selected" : ""}>3 張</option>
                <option value="4" ${state.quantity === 4 ? "selected" : ""}>4 張</option>
              </select>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="section">
          <button class="btn btn-primary" id="btn-start">開始搶票</button>
          <button class="btn btn-secondary" id="btn-test">測試（不按下一步）</button>
        </div>
      </div>
    `;

    document.body.appendChild(div);
    bindEvents();
  };

  const bindEvents = () => {
    // 開始搶票
    document.getElementById("btn-start").onclick = () => {
      const url = document.getElementById("input-url").value.trim();
      const ticketIndex = parseInt(document.getElementById("select-ticket").value);
      const quantity = parseInt(document.getElementById("select-quantity").value);

      if (!url) {
        log("請輸入活動網址！");
        return;
      }

      const eventSlug = parseEventUrl(url);
      if (!eventSlug) {
        log("網址格式錯誤！");
        return;
      }

      // 儲存狀態
      saveState({
        eventUrl: url,
        eventSlug,
        ticketIndex,
        quantity,
        autoRun: true,
        autoClickNext: true,
      });

      log("前往購票頁面...");

      // 導航到購票頁面
      const regUrl = getRegistrationUrl(eventSlug);
      window.location.href = regUrl;
    };

    // 測試模式（不按下一步）
    document.getElementById("btn-test").onclick = () => {
      const url = document.getElementById("input-url").value.trim();
      const ticketIndex = parseInt(document.getElementById("select-ticket").value);
      const quantity = parseInt(document.getElementById("select-quantity").value);

      if (!url) {
        log("請輸入活動網址！");
        return;
      }

      const eventSlug = parseEventUrl(url);
      if (!eventSlug) {
        log("網址格式錯誤！");
        return;
      }

      // 儲存狀態（測試模式不自動按下一步）
      saveState({
        eventUrl: url,
        eventSlug,
        ticketIndex,
        quantity,
        autoRun: true,
        autoClickNext: false,
      });

      log("前往購票頁面（測試模式）...");

      const regUrl = getRegistrationUrl(eventSlug);
      window.location.href = regUrl;
    };
  };

  // ==========================================
  // 購票頁面自動化
  // ==========================================
  const runOnRegistrationPage = () => {
    const state = getState();
    if (!state.autoRun) {
      log("準備就緒");
      return;
    }

    log("自動化執行中...");

    // 關閉彈出視窗
    setTimeout(() => {
      const closeDialog = document.querySelector(".modal .btn-default.pull-right");
      if (closeDialog && closeDialog.textContent.includes("暫時不要")) {
        closeDialog.click();
      }
    }, 300);

    // 等待票種載入
    const waitForTickets = () => {
      const tickets = getTicketInfo();
      if (tickets.length === 0) {
        setTimeout(waitForTickets, 300);
        return;
      }

      // 選擇票種
      const targetIndex = state.ticketIndex || 0;
      const targetQty = state.quantity || 2;
      const targetTicket = tickets[targetIndex];

      if (targetTicket) {
        log(`選擇「${targetTicket.name}」x ${targetQty} 張`);

        for (let i = 0; i < targetQty; i++) {
          setTimeout(() => targetTicket.plusBtn.click(), i * 60);
        }

        // 勾選同意
        setTimeout(() => {
          const agree = document.querySelector("#person_agree_terms");
          if (agree && !agree.checked) {
            agree.click();
            log("已勾選同意條款");
          }

          // 按下一步
          setTimeout(() => {
            if (state.autoClickNext) {
              const nextBtn = document.querySelector("button.btn-primary.btn-lg:not([disabled])");
              if (nextBtn) {
                log("點擊下一步！");
                nextBtn.click();
                clearState();
              } else {
                log("等待下一步按鈕啟用...");
                // 重試
                setTimeout(() => {
                  const btn = document.querySelector("button.btn-primary.btn-lg:not([disabled])");
                  if (btn) {
                    btn.click();
                    clearState();
                  }
                }, 500);
              }
            } else {
              log("測試完成！請手動點擊下一步");
              clearState();
            }
          }, 400);
        }, targetQty * 80 + 300);
      }
    };

    setTimeout(waitForTickets, 500);
  };

  // ==========================================
  // 初始化
  // ==========================================
  const init = () => {
    console.log("[KKTIX助手] 初始化...");
    createUI();

    const url = window.location.href;

    // 如果在購票頁面，執行自動化
    if (url.includes("/registrations/new")) {
      runOnRegistrationPage();
    }
  };

  // 等待頁面載入
  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init);
  }
})();
