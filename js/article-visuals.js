(() => {
  'use strict';

  const clampPercent = value => `${Math.max(0, Math.min(100, value))}%`;

  function initializeBinarySearchLab(root) {
    const maximum = Number(root.dataset.maximum || 17);
    const answer = Number(root.dataset.answer || 11);
    const lowZone = root.querySelector('[data-binary-low-zone]');
    const highZone = root.querySelector('[data-binary-high-zone]');
    const lowMarker = root.querySelector('[data-binary-low-marker]');
    const middleMarker = root.querySelector('[data-binary-middle-marker]');
    const highMarker = root.querySelector('[data-binary-high-marker]');
    const lowValue = root.querySelector('[data-binary-low-value]');
    const middleValue = root.querySelector('[data-binary-middle-value]');
    const highValue = root.querySelector('[data-binary-high-value]');
    const message = root.querySelector('[data-binary-message]');
    const stepButton = root.querySelector('[data-binary-step]');
    const resetButton = root.querySelector('[data-binary-reset]');
    let low = 0;
    let high = maximum;
    let lastResult = '';

    const position = value => clampPercent((value / maximum) * 100);

    function render() {
      const middle = Math.floor((low + high) / 2);
      const complete = low + 1 >= high;

      lowZone.style.width = position(low);
      highZone.style.left = position(high);
      highZone.style.width = clampPercent(((maximum - high) / maximum) * 100);
      lowMarker.style.left = position(low);
      middleMarker.style.left = position(middle);
      highMarker.style.left = position(high);
      lowValue.textContent = String(low);
      middleValue.textContent = complete ? '—' : String(middle);
      highValue.textContent = String(high);
      middleMarker.hidden = complete;
      stepButton.disabled = complete;
      stepButton.textContent = complete ? '已找到最大可行值' : '执行下一步';

      if (complete) {
        message.textContent = `搜索结束：${low} 可行，${high} 不可行，所以答案是 ${low}。`;
      } else if (lastResult) {
        message.textContent = lastResult;
      } else {
        message.textContent = `当前未知区间为 (${low}, ${high})，下一次检查 ${middle}。`;
      }
    }

    stepButton.addEventListener('click', () => {
      if (low + 1 >= high) return;
      const middle = Math.floor((low + high) / 2);
      if (middle <= answer) {
        low = middle;
        lastResult = `can(${middle}) 为真：保留 ${middle} 作为新的可行下界。`;
      } else {
        high = middle;
        lastResult = `can(${middle}) 为假：保留 ${middle} 作为新的不可行上界。`;
      }
      render();
    });

    resetButton.addEventListener('click', () => {
      low = 0;
      high = maximum;
      lastResult = '';
      render();
    });

    render();
  }

  function initializeEpsilonLab(root) {
    const input = root.querySelector('[data-epsilon-input]');
    const output = root.querySelector('[data-epsilon-output]');
    const bars = Array.from(root.querySelectorAll('[data-action-probability]'));

    function render() {
      const epsilon = Number(input.value);
      const randomShare = epsilon / bars.length;
      output.textContent = epsilon.toFixed(2);
      input.setAttribute('aria-valuetext', `ε 等于 ${epsilon.toFixed(2)}`);

      bars.forEach((bar, index) => {
        const probability = index === 0 ? 1 - epsilon + randomShare : randomShare;
        const percentage = probability * 100;
        bar.querySelector('[data-probability-fill]').style.width = clampPercent(percentage);
        bar.querySelector('[data-probability-value]').textContent = `${percentage.toFixed(1)}%`;
      });
    }

    input.addEventListener('input', render);
    render();
  }

  function initializeMeterLab(root) {
    const modeButtons = Array.from(root.querySelectorAll('[data-meter-mode]'));
    const pulses = Array.from(root.querySelectorAll('[data-meter-pulse]'));
    const notation = root.querySelector('[data-meter-notation]');
    const explanation = root.querySelector('[data-meter-explanation]');
    const playButton = root.querySelector('[data-meter-play]');
    const status = root.querySelector('[data-meter-status]');
    let mode = '3/4';
    let currentStep = -1;
    let timer = null;
    let audioContext = null;

    const patterns = {
      '3/4': {
        accents: [2, 0, 1, 0, 1, 0],
        labels: ['1', 'and', '2', 'and', '3', 'and'],
        notation: '三组二分：1-and｜2-and｜3-and',
        explanation: '每个四分音符拍分成两个八分音符，第一拍最强。'
      },
      '6/8': {
        accents: [2, 0, 0, 1, 0, 0],
        labels: ['1', 'la', 'li', '2', 'la', 'li'],
        notation: '两组三分：1-la-li｜2-la-li',
        explanation: '六个八分音符组织成两大拍，每一大拍包含三个细分。'
      }
    };

    function playClick(accent) {
      if (!audioContext) return;
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(accent === 2 ? 880 : accent === 1 ? 660 : 440, now);
      gain.gain.setValueAtTime(accent === 2 ? 0.12 : accent === 1 ? 0.075 : 0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.08);
    }

    function render() {
      const pattern = patterns[mode];
      modeButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.meterMode === mode));
      });
      pulses.forEach((pulse, index) => {
        pulse.classList.toggle('is-primary', pattern.accents[index] === 2);
        pulse.classList.toggle('is-secondary', pattern.accents[index] === 1);
        pulse.classList.toggle('is-active', index === currentStep);
        pulse.querySelector('span').textContent = pattern.labels[index];
      });
      root.dataset.meter = mode.replace('/', '-');
      notation.textContent = pattern.notation;
      explanation.textContent = pattern.explanation;
    }

    function advance() {
      currentStep = (currentStep + 1) % pulses.length;
      playClick(patterns[mode].accents[currentStep]);
      render();
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
      currentStep = -1;
      playButton.setAttribute('aria-pressed', 'false');
      playButton.textContent = '播放节拍';
      status.textContent = '已停止，可切换拍号继续比较。';
      if (audioContext) audioContext.close().catch(() => {});
      audioContext = null;
      render();
    }

    async function start() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        status.textContent = '当前浏览器不支持 Web Audio API。';
        return;
      }
      audioContext = new AudioContextClass();
      await audioContext.resume();
      playButton.setAttribute('aria-pressed', 'true');
      playButton.textContent = '停止播放';
      status.textContent = `${mode} 正在播放：高音表示分组起点。`;
      advance();
      timer = window.setInterval(advance, 360);
    }

    modeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const wasPlaying = Boolean(timer);
        if (wasPlaying) stop();
        mode = button.dataset.meterMode;
        currentStep = -1;
        status.textContent = `${mode} 已选中。`;
        render();
        if (wasPlaying) start();
      });
    });

    playButton.addEventListener('click', () => {
      if (timer) stop();
      else start();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && timer) stop();
    });

    render();
  }

  function initializeRagDiagnostic(root) {
    const options = Array.from(root.querySelectorAll('[data-rag-option]'));
    const stages = Array.from(root.querySelectorAll('[data-rag-stage]'));
    const result = root.querySelector('[data-rag-result]');
    const diagnoses = {
      missing: { stage: 'retrieve', text: '先检查解析结果、元数据过滤和查询表达，再考虑增加召回数量。' },
      ranking: { stage: 'rerank', text: '证据已出现但位置靠后，优先检查重排权重、重复片段与字段加权。' },
      context: { stage: 'chunk', text: '片段缺少条件或标题上下文，应检查分块边界、层级信息与重叠长度。' },
      expansion: { stage: 'generate', text: '引用正确但结论扩大，应拆分事实声明并要求每项结论绑定证据。' },
      refusal: { stage: 'refuse', text: '无证据仍回答，需要加入边界问题、置信阈值和明确拒答规则。' },
      version: { stage: 'retrieve', text: '新旧制度混用时，应补充版本、生效日期和状态元数据过滤。' }
    };

    function select(key) {
      const diagnosis = diagnoses[key];
      if (!diagnosis) return;
      options.forEach(option => {
        option.setAttribute('aria-pressed', String(option.dataset.ragOption === key));
      });
      stages.forEach(stage => {
        stage.classList.toggle('is-active', stage.dataset.ragStage === diagnosis.stage);
      });
      result.textContent = diagnosis.text;
    }

    options.forEach(option => option.addEventListener('click', () => select(option.dataset.ragOption)));
    select('missing');
  }

  function initializeArticleVisuals() {
    document.querySelectorAll('[data-binary-lab]').forEach(initializeBinarySearchLab);
    document.querySelectorAll('[data-epsilon-lab]').forEach(initializeEpsilonLab);
    document.querySelectorAll('[data-meter-lab]').forEach(initializeMeterLab);
    document.querySelectorAll('[data-rag-diagnostic]').forEach(initializeRagDiagnostic);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeArticleVisuals);
  } else {
    initializeArticleVisuals();
  }
})();
