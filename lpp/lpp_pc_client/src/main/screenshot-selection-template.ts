export function screenshotSelectorHtml(channel: string, readyChannel: string) {
  void channel;
  void readyChannel;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    :root {
      color-scheme: light;
      --wechat-green: #07c160;
      --panel: rgba(28, 33, 43, .95);
      --panel-border: rgba(255, 255, 255, .12);
    }
    html,
    body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      cursor: crosshair;
      user-select: none;
    }
    body {
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
    }
    #shot,
    #draw {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
    }
    #shot {
      z-index: 0;
      object-fit: fill;
    }
    #draw {
      z-index: 1;
      pointer-events: none;
    }
    #box {
      position: fixed;
      z-index: 2;
      display: none;
      box-sizing: border-box;
      border: 1px solid var(--wechat-green);
      outline: 1px solid rgba(255, 255, 255, .94);
      background: transparent;
      cursor: move;
      box-shadow: 0 0 0 1px rgba(7, 193, 96, .2), 0 8px 24px rgba(0, 0, 0, .18);
    }
    #sizeBadge {
      position: fixed;
      z-index: 3;
      display: none;
      padding: 3px 7px;
      border-radius: 4px;
      background: rgba(16, 24, 39, .88);
      color: #fff;
      font-size: 12px;
      line-height: 16px;
      font-variant-numeric: tabular-nums;
      pointer-events: none;
    }
    #toolbar {
      position: fixed;
      z-index: 4;
      display: none;
      align-items: center;
      gap: 2px;
      padding: 5px;
      border: 1px solid var(--panel-border);
      border-radius: 6px;
      background: var(--panel);
      box-shadow: 0 10px 28px rgba(0, 0, 0, .28);
    }
    #hint {
      position: fixed;
      left: 50%;
      bottom: 18px;
      z-index: 3;
      transform: translateX(-50%);
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(16, 24, 39, .56);
      color: rgba(255, 255, 255, .9);
      font-size: 12px;
      line-height: 16px;
      pointer-events: none;
    }
    #textEditor {
      position: fixed;
      z-index: 5;
      min-width: 120px;
      max-width: 360px;
      height: 30px;
      padding: 0 8px;
      border: 1px solid var(--wechat-green);
      border-radius: 4px;
      outline: none;
      background: #fff;
      color: #111827;
      font: 14px/30px -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
      box-shadow: 0 8px 24px rgba(15, 23, 42, .22);
    }
    .handle {
      position: absolute;
      width: 7px;
      height: 7px;
      border: 1px solid rgba(255, 255, 255, .96);
      border-radius: 999px;
      background: var(--wechat-green);
      transform: translate(-50%, -50%);
      box-shadow: 0 1px 4px rgba(0, 0, 0, .18);
    }
    .nw { left: 0; top: 0; cursor: nwse-resize; }
    .n { left: 50%; top: 0; cursor: ns-resize; }
    .ne { left: 100%; top: 0; cursor: nesw-resize; }
    .e { left: 100%; top: 50%; cursor: ew-resize; }
    .se { left: 100%; top: 100%; cursor: nwse-resize; }
    .s { left: 50%; top: 100%; cursor: ns-resize; }
    .sw { left: 0; top: 100%; cursor: nesw-resize; }
    .w { left: 0; top: 50%; cursor: ew-resize; }
    button {
      display: grid;
      width: 32px;
      height: 30px;
      place-items: center;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: #f8fafc;
      cursor: pointer;
      font-size: 15px;
      font-weight: 700;
      line-height: 1;
    }
    button:hover { background: rgba(255, 255, 255, .13); }
    button.active { background: rgba(7, 193, 96, .24); color: #87ffc0; }
    button.primary { background: var(--wechat-green); color: #fff; }
    button.primary:hover { background: #06ad56; }
    .divider {
      width: 1px;
      height: 22px;
      margin: 0 3px;
      background: rgba(255, 255, 255, .18);
    }
  </style>
</head>
<body>
  <img id="shot" alt="" />
  <canvas id="draw"></canvas>
  <div id="box">
    <i class="handle nw" data-handle="nw"></i><i class="handle n" data-handle="n"></i><i class="handle ne" data-handle="ne"></i>
    <i class="handle e" data-handle="e"></i><i class="handle se" data-handle="se"></i><i class="handle s" data-handle="s"></i>
    <i class="handle sw" data-handle="sw"></i><i class="handle w" data-handle="w"></i>
  </div>
  <div id="sizeBadge"></div>
  <div id="toolbar" aria-label="截图工具">
    <button data-tool="select" title="移动 / 调整">&#8596;</button>
    <button data-tool="rect" title="矩形">&#9633;</button>
    <button data-tool="ellipse" title="圆形">&#9711;</button>
    <button data-tool="arrow" title="箭头">&#8599;</button>
    <button data-tool="pen" title="画笔">&#9998;</button>
    <button data-tool="text" title="文字">T</button>
    <button data-tool="mosaic" title="马赛克">&#9638;</button>
    <span class="divider"></span>
    <button data-action="undo" title="撤销">&#8630;</button>
    <button data-action="cancel" title="取消">&#215;</button>
    <button data-action="ok" class="primary" title="完成">&#10003;</button>
  </div>
  <div id="hint">拖拽框选区域，Enter 完成，Esc 取消</div>
  <script>
    const shot = document.getElementById('shot');
    const draw = document.getElementById('draw');
    const ctx = draw.getContext('2d');
    const box = document.getElementById('box');
    const toolbar = document.getElementById('toolbar');
    const hint = document.getElementById('hint');
    const sizeBadge = document.getElementById('sizeBadge');
    const color = '#07c160';
    let action = null;
    let tool = 'select';
    let start = null;
    let base = null;
    let selection = null;
    let draft = null;
    let annotations = [];
    let textEditor = null;

    window.screenshotSelector.onSource((dataUrl) => {
      shot.onload = () => {
        resizeCanvas();
        window.screenshotSelector.sendReady();
      };
      shot.src = dataUrl;
    });

    function send(value) {
      window.screenshotSelector.sendResult(value);
    }

    function point(event) {
      return { x: event.clientX, y: event.clientY };
    }

    function imageMetrics() {
      const bounds = shot.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      return {
        x: bounds.left,
        y: bounds.top,
        width,
        height,
        scaleX: shot.naturalWidth / width,
        scaleY: shot.naturalHeight / height,
      };
    }

    function imageCropRect(rect) {
      const metrics = imageMetrics();
      const x = Math.max(metrics.x, Math.min(metrics.x + metrics.width, rect.x));
      const y = Math.max(metrics.y, Math.min(metrics.y + metrics.height, rect.y));
      const right = Math.max(metrics.x, Math.min(metrics.x + metrics.width, rect.x + rect.width));
      const bottom = Math.max(metrics.y, Math.min(metrics.y + metrics.height, rect.y + rect.height));
      return {
        sx: Math.round((x - metrics.x) * metrics.scaleX),
        sy: Math.round((y - metrics.y) * metrics.scaleY),
        sw: Math.max(1, Math.round((right - x) * metrics.scaleX)),
        sh: Math.max(1, Math.round((bottom - y) * metrics.scaleY)),
        scaleX: metrics.scaleX,
        scaleY: metrics.scaleY,
      };
    }

    function normalized(a, b) {
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
    }

    function clampSelection(next) {
      const x = Math.max(0, Math.min(window.innerWidth - 1, next.x));
      const y = Math.max(0, Math.min(window.innerHeight - 1, next.y));
      const width = Math.max(1, Math.min(window.innerWidth - x, next.width));
      const height = Math.max(1, Math.min(window.innerHeight - y, next.height));
      return { x, y, width, height };
    }

    function resizeRect(handle, origin, delta) {
      let left = origin.x;
      let top = origin.y;
      let right = origin.x + origin.width;
      let bottom = origin.y + origin.height;
      if (handle.indexOf('w') >= 0) left += delta.x;
      if (handle.indexOf('e') >= 0) right += delta.x;
      if (handle.indexOf('n') >= 0) top += delta.y;
      if (handle.indexOf('s') >= 0) bottom += delta.y;
      return normalized({ x: left, y: top }, { x: right, y: bottom });
    }

    function insideSelection(p) {
      return selection &&
        p.x >= selection.x &&
        p.x <= selection.x + selection.width &&
        p.y >= selection.y &&
        p.y <= selection.y + selection.height;
    }

    function setSelection(next) {
      selection = clampSelection(next);
      render();
    }

    function resizeCanvas() {
      const ratio = window.devicePixelRatio || 1;
      draw.width = Math.round(window.innerWidth * ratio);
      draw.height = Math.round(window.innerHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      render();
    }

    function render() {
      const hasSelection = selection && selection.width > 3 && selection.height > 3;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, .42)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      if (hasSelection) {
        ctx.clearRect(selection.x, selection.y, selection.width, selection.height);
      }
      ctx.restore();

      for (const item of annotations) drawAnnotation(ctx, item);
      if (draft) drawAnnotation(ctx, draft);

      box.style.display = hasSelection ? 'block' : 'none';
      toolbar.style.display = hasSelection ? 'flex' : 'none';
      sizeBadge.style.display = hasSelection ? 'block' : 'none';
      hint.style.display = hasSelection ? 'none' : 'block';
      if (!hasSelection) return;

      box.style.left = selection.x + 'px';
      box.style.top = selection.y + 'px';
      box.style.width = selection.width + 'px';
      box.style.height = selection.height + 'px';

      const crop = shot.naturalWidth ? imageCropRect(selection) : null;
      sizeBadge.textContent = crop ? crop.sw + ' x ' + crop.sh : Math.round(selection.width) + ' x ' + Math.round(selection.height);
      const badgeTop = selection.y > 24 ? selection.y - 24 : selection.y + 6;
      sizeBadge.style.left = Math.max(8, selection.x) + 'px';
      sizeBadge.style.top = Math.min(window.innerHeight - 24, Math.max(8, badgeTop)) + 'px';

      const toolbarWidth = Math.ceil(toolbar.getBoundingClientRect().width || 372);
      const topBelow = selection.y + selection.height + 9;
      const top = topBelow + 42 > window.innerHeight ? Math.max(8, selection.y - 42) : topBelow;
      toolbar.style.left = Math.min(window.innerWidth - toolbarWidth - 8, Math.max(8, selection.x + selection.width - toolbarWidth)) + 'px';
      toolbar.style.top = top + 'px';
      updateToolbar();
    }

    function updateToolbar() {
      for (const button of toolbar.querySelectorAll('button[data-tool]')) {
        button.classList.toggle('active', button.dataset.tool === tool);
      }
      document.body.style.cursor = tool === 'select' ? 'crosshair' : 'copy';
      box.style.cursor = tool === 'select' ? 'move' : 'copy';
    }

    function drawAnnotation(context, item) {
      context.save();
      context.strokeStyle = item.color || color;
      context.fillStyle = item.color || color;
      context.lineWidth = item.lineWidth || 3;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      if (item.type === 'rect') {
        context.strokeRect(item.x, item.y, item.width, item.height);
      } else if (item.type === 'ellipse') {
        context.beginPath();
        context.ellipse(item.x + item.width / 2, item.y + item.height / 2, Math.abs(item.width / 2), Math.abs(item.height / 2), 0, 0, Math.PI * 2);
        context.stroke();
      } else if (item.type === 'arrow') {
        drawArrow(context, item.x, item.y, item.x2, item.y2);
      } else if (item.type === 'pen') {
        context.beginPath();
        item.points.forEach((p, index) => {
          if (index === 0) context.moveTo(p.x, p.y);
          else context.lineTo(p.x, p.y);
        });
        context.stroke();
      } else if (item.type === 'text') {
        context.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif';
        context.textBaseline = 'top';
        context.fillText(item.text, item.x, item.y);
      } else if (item.type === 'mosaic') {
        drawMosaicPreview(context, item);
      }
      context.restore();
    }

    function drawArrow(context, x1, y1, x2, y2) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = 13;
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      context.beginPath();
      context.moveTo(x2, y2);
      context.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
      context.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
      context.closePath();
      context.fill();
    }

    function drawMosaicPreview(context, item) {
      if (shot.naturalWidth) {
        const crop = imageCropRect(item);
        const tile = 10;
        const scratch = document.createElement('canvas');
        scratch.width = Math.max(1, Math.round(item.width / tile));
        scratch.height = Math.max(1, Math.round(item.height / tile));
        const scratchContext = scratch.getContext('2d');
        scratchContext.drawImage(shot, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, scratch.width, scratch.height);
        const previousSmoothing = context.imageSmoothingEnabled;
        context.imageSmoothingEnabled = false;
        context.drawImage(scratch, item.x, item.y, item.width, item.height);
        context.imageSmoothingEnabled = previousSmoothing;
        context.strokeStyle = 'rgba(7, 193, 96, .7)';
        context.strokeRect(item.x, item.y, item.width, item.height);
        return;
      }
      context.save();
      context.fillStyle = 'rgba(7, 193, 96, .18)';
      context.fillRect(item.x, item.y, item.width, item.height);
      context.restore();
    }

    function makeDraft(startPoint, currentPoint) {
      const shape = normalized(startPoint, currentPoint);
      if (tool === 'rect' || tool === 'ellipse' || tool === 'mosaic') {
        return { type: tool, x: shape.x, y: shape.y, width: shape.width, height: shape.height, color, lineWidth: 3 };
      }
      if (tool === 'arrow') {
        return { type: 'arrow', x: startPoint.x, y: startPoint.y, x2: currentPoint.x, y2: currentPoint.y, color, lineWidth: 3 };
      }
      return null;
    }

    function startTextEdit(p) {
      commitTextEdit(false);
      const input = document.createElement('input');
      input.id = 'textEditor';
      input.type = 'text';
      input.placeholder = '输入文字';
      input.style.left = Math.min(window.innerWidth - 140, Math.max(8, p.x)) + 'px';
      input.style.top = Math.min(window.innerHeight - 38, Math.max(8, p.y)) + 'px';
      textEditor = { node: input, x: p.x, y: p.y };
      document.body.appendChild(input);
      input.focus();
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitTextEdit(true);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          commitTextEdit(false);
        }
      });
      input.addEventListener('blur', () => commitTextEdit(true));
    }

    function commitTextEdit(keep) {
      if (!textEditor) return;
      const text = textEditor.node.value.trim();
      const x = textEditor.x;
      const y = textEditor.y;
      textEditor.node.remove();
      textEditor = null;
      if (keep && text) {
        annotations.push({ type: 'text', text, x, y, color });
        render();
      }
    }

    window.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      const target = event.target;
      if ((target && target.closest && target.closest('#toolbar')) || (target && target.id === 'textEditor')) return;
      commitTextEdit(true);
      const p = point(event);
      start = p;
      base = selection ? { ...selection } : null;
      const handle = target && target.dataset && target.dataset.handle;
      if (handle && selection) {
        action = 'resize:' + handle;
        return;
      }
      if (selection && tool === 'select' && insideSelection(p)) {
        action = 'move';
        return;
      }
      if (selection && tool === 'text' && insideSelection(p)) {
        startTextEdit(p);
        return;
      }
      if (selection && tool === 'pen' && insideSelection(p)) {
        action = 'pen';
        draft = { type: 'pen', points: [p], color, lineWidth: 3 };
        render();
        return;
      }
      if (selection && tool !== 'select' && insideSelection(p)) {
        action = 'annotate';
        draft = makeDraft(start, p);
        render();
        return;
      }
      action = 'select';
      annotations = [];
      draft = null;
      setSelection({ x: p.x, y: p.y, width: 1, height: 1 });
    });

    window.addEventListener('mousemove', (event) => {
      if (!action || !start) return;
      const current = point(event);
      const delta = { x: current.x - start.x, y: current.y - start.y };
      if (action === 'select') {
        setSelection(normalized(start, current));
      } else if (action === 'move' && base) {
        setSelection({ ...base, x: base.x + delta.x, y: base.y + delta.y });
      } else if (action.indexOf('resize:') === 0 && base) {
        setSelection(resizeRect(action.slice(7), base, delta));
      } else if (action === 'annotate') {
        draft = makeDraft(start, current);
        render();
      } else if (action === 'pen' && draft) {
        draft.points.push(current);
        render();
      }
    });

    window.addEventListener('mouseup', () => {
      if ((action === 'annotate' || action === 'pen') && draft) {
        const enough =
          draft.type === 'pen' ||
          draft.type === 'arrow' ||
          Math.max(Math.abs(draft.width || 0), Math.abs(draft.height || 0)) > 4;
        if (enough) annotations.push(draft);
        draft = null;
        render();
      }
      action = null;
    });

    window.addEventListener('dblclick', (event) => {
      if (selection && insideSelection(point(event))) finish();
    });

    toolbar.addEventListener('click', (event) => {
      const target = event.target;
      const button = target && target.closest ? target.closest('button') : null;
      if (!button) return;
      const nextTool = button.dataset.tool;
      const nextAction = button.dataset.action;
      if (nextTool) {
        tool = nextTool;
        updateToolbar();
        return;
      }
      if (nextAction === 'undo') {
        commitTextEdit(false);
        annotations.pop();
        render();
      } else if (nextAction === 'cancel') {
        send({ canceled: true });
      } else if (nextAction === 'ok') {
        finish();
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.target && event.target.id === 'textEditor') return;
      if (event.key === 'Escape') send({ canceled: true });
      if (event.key === 'Enter') finish();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        annotations.pop();
        render();
      }
    });

    window.addEventListener('resize', resizeCanvas);

    function finish() {
      commitTextEdit(true);
      if (!selection || selection.width < 3 || selection.height < 3 || !shot.naturalWidth) return;
      const crop = imageCropRect(selection);
      const canvas = document.createElement('canvas');
      canvas.width = crop.sw;
      canvas.height = crop.sh;
      const context = canvas.getContext('2d');
      context.drawImage(shot, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
      context.save();
      context.scale(crop.scaleX, crop.scaleY);
      context.translate(-selection.x, -selection.y);
      for (const item of annotations) drawAnnotation(context, item);
      context.restore();
      send({ dataUrl: canvas.toDataURL('image/png') });
    }
  </script>
</body>
</html>`;
}
