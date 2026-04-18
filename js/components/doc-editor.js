/**
 * DocEditor — Toast UI Editor 기반 문서 에디터
 *
 * 기능:
 *   - WYSIWYG / Markdown 토글
 *   - 클립보드/드래그&드롭 이미지 → docs/assets/YYYY-MM/<timestamp>-<name>.ext 자동 업로드
 *   - 업로드 후 ![](raw URL) 자동 삽입
 *   - 링크 삽입 등 기본 툴바
 *
 * 사용:
 *   const editor = DocEditor.create({
 *     containerEl,       // 마운트 될 DOM
 *     initialValue,      // 기존 markdown
 *     getToken,          // () => string  (GitHub PAT)
 *     gh: { owner, repo, branch },  // 기본: bogeun35/VONE2/main
 *   });
 *   editor.getMarkdown();   // 저장 시 사용
 *   editor.destroy();       // 해제
 */
(function () {
  const DEFAULT_GH = { owner: 'bogeun35', repo: 'VONE2', branch: 'main' };

  function b64EncodeBytes(uint8) {
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(uint8[i]);
    return btoa(binary);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const ab = fr.result;
        resolve(b64EncodeBytes(new Uint8Array(ab)));
      };
      fr.onerror = reject;
      fr.readAsArrayBuffer(blob);
    });
  }

  function sanitizeName(name) {
    // 한글 제거 + 공백을 하이픈으로 + 특수문자 제거
    const base = (name || 'image')
      .replace(/\.[^.]+$/, '') // 확장자 분리
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 40) || 'image';
    return base;
  }

  function extFromBlob(blob, fallbackName = '') {
    const fromType = (blob.type || '').split('/')[1];
    if (fromType) return fromType.replace('jpeg', 'jpg');
    const m = /\.([a-zA-Z0-9]+)$/.exec(fallbackName);
    return m ? m[1].toLowerCase() : 'png';
  }

  async function uploadImageToGithub({ blob, fileName, getToken, gh }) {
    const token = getToken();
    if (!token) throw new Error('GitHub 토큰이 설정되지 않았습니다 (⚙ 에서 등록)');

    const now = new Date();
    const yyyyMm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const ts = now.getTime();
    const ext = extFromBlob(blob, fileName);
    const safe = sanitizeName(fileName);
    const path = `docs/assets/${yyyyMm}/${ts}-${safe}.${ext}`;

    const b64 = await blobToBase64(blob);
    const putUrl = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}`;
    const res = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `docs(assets): add ${path.split('/').pop()}`,
        content: b64,
        branch: gh.branch,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `이미지 업로드 실패 (${res.status})`);
    }
    // GitHub 이 제공하는 raw URL 을 즉시 사용하면 CDN 지연이 있을 수 있음
    // → 가장 안정적인 raw.githubusercontent.com URL 을 사용
    const rawUrl = `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${gh.branch}/${path}`;
    return { rawUrl, path };
  }

  function create(opts) {
    const {
      containerEl,
      initialValue = '',
      getToken,
      gh = DEFAULT_GH,
      height = '560px',
      onImageUploadStart,
      onImageUploadEnd,
      onImageUploadError,
    } = opts || {};

    if (!window.toastui || !window.toastui.Editor) {
      throw new Error('Toast UI Editor 가 로드되지 않았습니다');
    }
    if (!containerEl) throw new Error('containerEl 이 필요합니다');

    const Editor = window.toastui.Editor;
    const editor = new Editor({
      el: containerEl,
      height,
      initialEditType: 'markdown',      // 기본은 MD 모드 (원시 편집)
      previewStyle: 'vertical',         // MD 모드에서 우측 프리뷰
      usageStatistics: false,
      initialValue,
      toolbarItems: [
        ['heading', 'bold', 'italic', 'strike'],
        ['hr', 'quote'],
        ['ul', 'ol', 'task'],
        ['table', 'link', 'image'],
        ['code', 'codeblock'],
        ['scrollSync'],
      ],
      hooks: {
        // 클립보드/드래그&드롭/툴바 이미지 버튼 모두 이 후크를 통해 들어옴
        addImageBlobHook: async (blob, callback) => {
          try {
            if (onImageUploadStart) onImageUploadStart();
            const fileName = blob.name || `pasted-${Date.now()}.png`;
            const { rawUrl } = await uploadImageToGithub({ blob, fileName, getToken, gh });
            // Toast UI 는 callback(url, altText) 로 이미지 삽입
            callback(rawUrl, fileName.replace(/\.[^.]+$/, ''));
            if (onImageUploadEnd) onImageUploadEnd({ url: rawUrl });
          } catch (e) {
            if (onImageUploadError) onImageUploadError(e);
            // 실패 시 사용자에게 안내 (에디터 상단 토스트)
            console.error('[DocEditor] image upload failed:', e);
            alert(`이미지 업로드 실패: ${e.message}`);
          }
        },
      },
    });

    return {
      editor,
      getMarkdown: () => editor.getMarkdown(),
      setMarkdown: (md) => editor.setMarkdown(md),
      focus: () => editor.focus(),
      destroy: () => editor.destroy(),
    };
  }

  window.DocEditor = { create, uploadImageToGithub };
})();
