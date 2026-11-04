/* =========================================================
 * 全局配置 —— 只需修改这个文件
 * 两个开关都留空也能玩：排行榜走本机 records，统计不发送
 * =======================================================*/
window.GF_CONFIG = {
  /* ---------- 1) 排行榜：Supabase（免费） ---------- */
  SUPABASE_URL: 'https://ceuwpwhmnnrlthiuyoih.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldXdwd2htbm5ybHRoaXV5b2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3ODU0NjIsImV4cCI6MjEwOTM2MTQ2Mn0.Ea-wYeHTHw8d6c2djrNh5cDTOZUBB7D-9NXqVwhHULc',
  TABLE: 'gf_scores',

  /* ---------- 2) 匿名访问统计（任选，可都填） ---------- */
  BAIDU_ID: '',            // 百度统计站点 ID（hm.js? 后面那串）
  UMAMI_ID: '',            // Umami website-id
  UMAMI_SRC: 'https://cloud.umami.is/script.js',
};

(function () {
  const C = window.GF_CONFIG;
  const K = { nick: 'gf_nick', board: 'gf_board_local', aid: 'gf_anon' };

  /* ---------------- 匿名 ID（仅用于去重，不含身份信息） ---------------- */
  function anonId() {
    let id = localStorage.getItem(K.aid);
    if (!id) {
      id = 'a_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(K.aid, id);
    }
    return id;
  }

  /* ---------------- 匿名统计 ---------------- */
  window._hmt = window._hmt || [];

  function track(action, label) {
    const l = String(label == null ? '' : label);
    if (C.BAIDU_ID) window._hmt.push(['_trackEvent', 'grain-game', action, l]);
    if (window.umami && typeof window.umami.track === 'function') {
      window.umami.track(action, { label: l });
    }
  }

  function initStats() {
    if (C.BAIDU_ID && !document.getElementById('baidu-stat')) {
      const s = document.createElement('script');
      s.id = 'baidu-stat';
      s.src = 'https://hm.baidu.com/hm.js?' + C.BAIDU_ID;
      document.head.appendChild(s);
    }
    if (C.UMAMI_ID && !document.getElementById('umami-stat')) {
      const s = document.createElement('script');
      s.id = 'umami-stat';
      s.defer = true;
      s.src = C.UMAMI_SRC;
      s.setAttribute('data-website-id', C.UMAMI_ID);
      document.head.appendChild(s);
    }
  }

  /* ---------------- 排行榜读写 ---------------- */
  const hasBoard = () => !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
  const base = () => C.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + (C.TABLE || 'gf_scores');
  const headers = () => ({
    apikey: C.SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + C.SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  });

  function saveLocal(rec) {
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(K.board) || '[]'); } catch (e) { arr = []; }
    arr.push(rec);
    localStorage.setItem(K.board, JSON.stringify(arr.slice(-200)));
  }

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(K.board) || '[]'); } catch (e) { return []; }
  }

  async function submitScore(rec) {
    const row = Object.assign({ anon_id: anonId() }, rec);
    row.nickname = (row.nickname || '匿名农场主').slice(0, 12);
    saveLocal(Object.assign({ created_at: new Date().toISOString() }, row));

    if (!hasBoard()) return { ok: false, local: true };

    try {
      const res = await fetch(base(), {
        method: 'POST',
        headers: Object.assign(headers(), { Prefer: 'return=minimal' }),
        body: JSON.stringify(row),
      });
      if (!res.ok) return { ok: false, error: (await res.text()).slice(0, 120) };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function fetchScores(limit) {
    limit = limit || 100;
    if (hasBoard()) {
      const url = base() + '?select=*&order=final_equity.desc&limit=' + limit;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) throw new Error((await res.text()).slice(0, 160));
      return await res.json();
    }
    return readLocal().sort((a, b) => b.final_equity - a.final_equity);
  }

  function getNick() { return localStorage.getItem(K.nick) || ''; }
  function setNick(v) { localStorage.setItem(K.nick, v); }

  window.GF = { track, initStats, hasBoard, submitScore, fetchScores, getNick, setNick, anonId };
})();
