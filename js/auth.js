/**
 * Firebase Auth — planvendys 와 동일 프로젝트(vendys-b1fea) 공유
 * - Google 로그인만 허용
 * - @vendys.co.kr 도메인 제한 + 화이트리스트 이메일 예외
 * - 인증된 사용자의 displayName을 기획문서 기본 작성자로 사용
 */
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyAQE9oQRDUmeX6ZPO2KOcfd1ctBqt6v34w",
    authDomain: "vendys-b1fea.firebaseapp.com",
    projectId: "vendys-b1fea",
  };
  const ALLOWED_DOMAIN = "vendys.co.kr";
  const ALLOWED_EMAILS = ["pomez971@gmail.com"];

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();

  // 전역 현재 사용자 (app.js 등 다른 모듈에서 참조)
  window.vendysUser = null;

  function signIn() {
    const p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ hd: ALLOWED_DOMAIN });
    auth.signInWithPopup(p).catch((e) => {
      const el = document.getElementById("loginError");
      if (el) {
        el.textContent = "로그인 실패: " + e.message;
        el.style.display = "block";
      }
    });
  }

  function signOut() {
    auth.signOut();
  }

  function showLogin() {
    document.getElementById("authLoading").style.display = "none";
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("appHeader").style.display = "none";
    document.getElementById("appLayout").style.display = "none";
  }

  function showApp(user) {
    document.getElementById("authLoading").style.display = "none";
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appHeader").style.display = "";
    document.getElementById("appLayout").style.display = "";

    const nameEl = document.getElementById("headerUserName");
    const emailEl = document.getElementById("headerUserEmail");
    const avatarEl = document.getElementById("headerUserAvatar");

    nameEl.textContent = user.displayName || user.email.split("@")[0];
    emailEl.textContent = user.email;
    if (user.photoURL) {
      avatarEl.innerHTML = `<img src="${user.photoURL}" alt="">`;
    } else {
      const initial = (user.displayName || user.email)[0].toUpperCase();
      avatarEl.innerHTML = `<span class="header-user-initial">${initial}</span>`;
    }

    // app.js가 이 이벤트를 듣고 초기화해도 되도록 알림
    window.dispatchEvent(new CustomEvent("vendys-authed", { detail: { user } }));
  }

  // 사용자 메뉴 드롭다운
  document.addEventListener("click", (e) => {
    const wrap = document.getElementById("headerUserWrap");
    const menu = document.getElementById("headerUserMenu");
    if (!wrap || !menu) return;
    if (wrap.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.toggle("open");
    } else if (!wrap.contains(e.target)) {
      menu.classList.remove("open");
    }
  });

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.vendysUser = null;
      showLogin();
      return;
    }
    const domain = (user.email || "").split("@")[1];
    if (domain !== ALLOWED_DOMAIN && ALLOWED_EMAILS.indexOf(user.email) === -1) {
      auth.signOut();
      showLogin();
      const el = document.getElementById("loginError");
      if (el) {
        el.textContent = "@vendys.co.kr 계정만 접근 가능합니다.";
        el.style.display = "block";
      }
      return;
    }
    window.vendysUser = user;
    showApp(user);
  });

  // 외부 노출
  window.vendysAuth = { signIn, signOut };
})();
