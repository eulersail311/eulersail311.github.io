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

  function initializeTcpLab(root) {
    const packets = Array.from(root.querySelectorAll('[data-tcp-step]'));
    const status = root.querySelector('[data-tcp-status]');
    const nextButton = root.querySelector('[data-tcp-next]');
    const resetButton = root.querySelector('[data-tcp-reset]');
    const states = [
      '起点：客户端与服务器都还没有建立这条连接。',
      '第 1 步：客户端进入 SYN_SENT，服务器收到客户端的初始序列号 x。',
      '第 2 步：服务器进入 SYN_RCVD；客户端确认服务器可达，并收到序列号 y。',
      '第 3 步：最后一个 ACK 到达，双方进入 ESTABLISHED，可以传输应用数据。'
    ];
    let step = 0;

    function render() {
      packets.forEach((packet, index) => {
        packet.classList.toggle('is-complete', index < step);
        packet.classList.toggle('is-current', index === step - 1);
      });
      status.textContent = states[step];
      nextButton.disabled = step === packets.length;
      nextButton.textContent = step === packets.length ? '连接已建立' : '发送下一报文';
    }

    nextButton.addEventListener('click', () => {
      if (step < packets.length) step += 1;
      render();
    });
    resetButton.addEventListener('click', () => {
      step = 0;
      render();
    });
    render();
  }

  function initializeBroadcastLab(root) {
    const firstSelect = root.querySelector('[data-broadcast-a]');
    const secondSelect = root.querySelector('[data-broadcast-b]');
    const firstDimensions = root.querySelector('[data-broadcast-a-dimensions]');
    const secondDimensions = root.querySelector('[data-broadcast-b-dimensions]');
    const result = root.querySelector('[data-broadcast-result]');

    const parseShape = value => value.split(',').map(Number);

    function createDimension(value, state, missing) {
      const dimension = document.createElement('span');
      dimension.className = `broadcast-dimension is-${state}`;
      dimension.textContent = missing ? `1（补齐）` : String(value);
      return dimension;
    }

    function render() {
      const first = parseShape(firstSelect.value);
      const second = parseShape(secondSelect.value);
      const size = Math.max(first.length, second.length);
      const paddedFirst = Array(size - first.length).fill(1).concat(first);
      const paddedSecond = Array(size - second.length).fill(1).concat(second);
      const output = [];
      let compatible = true;

      firstDimensions.replaceChildren();
      secondDimensions.replaceChildren();

      for (let index = 0; index < size; index += 1) {
        const a = paddedFirst[index];
        const b = paddedSecond[index];
        const valid = a === b || a === 1 || b === 1;
        const expanded = valid && a !== b;
        const state = valid ? (expanded ? 'expanded' : 'matched') : 'conflict';
        compatible = compatible && valid;
        output.push(Math.max(a, b));
        firstDimensions.appendChild(createDimension(a, state, index < size - first.length));
        secondDimensions.appendChild(createDimension(b, state, index < size - second.length));
      }

      result.classList.toggle('is-error', !compatible);
      result.textContent = compatible
        ? `可以广播，输出形状为 (${output.join(', ')})。绿色维度相等，蓝色维度会从 1 扩展。`
        : '不能广播：红色位置既不相等，也没有任何一方为 1。请从最右侧逐维检查。';
    }

    firstSelect.addEventListener('change', render);
    secondSelect.addEventListener('change', render);
    render();
  }

  function initializeChartChoiceLab(root) {
    const options = Array.from(root.querySelectorAll('[data-chart-choice]'));
    const shapes = Array.from(root.querySelectorAll('[data-chart-shape]'));
    const preview = root.querySelector('[data-chart-preview]');
    const result = root.querySelector('[data-chart-result]');
    const recommendations = {
      line: ['折线图', '时间或顺序是结构的一部分，用连线强调连续变化；不要连接没有自然顺序的类别。'],
      bar: ['柱状图', '共享零基线便于比较类别大小；类别名称较长时可以改用横向条形图。'],
      scatter: ['散点图', '每个点代表一组 x、y 观测，适合观察相关、分群和异常点。'],
      histogram: ['直方图', '把连续数值放入区间，观察分布形状；应尝试多个分箱宽度。'],
      box: ['箱线图', '用中位数、四分位距和离群点压缩比较多组分布，但不能替代原始数据。']
    };

    function select(kind) {
      const recommendation = recommendations[kind];
      if (!recommendation) return;
      options.forEach(option => option.setAttribute('aria-pressed', String(option.dataset.chartChoice === kind)));
      shapes.forEach(shape => shape.classList.toggle('is-active', shape.dataset.chartShape === kind));
      preview.setAttribute('aria-label', `${recommendation[0]}示意图`);
      result.innerHTML = `<strong>${recommendation[0]}</strong><span>${recommendation[1]}</span>`;
    }

    options.forEach(option => option.addEventListener('click', () => select(option.dataset.chartChoice)));
    select('line');
  }

  function initializeMotifLab(root) {
    if (root.dataset.motifInitialized === 'true') return;
    root.dataset.motifInitialized = 'true';
    const options = Array.from(root.querySelectorAll('[data-motif-option]'));
    const notes = Array.from(root.querySelectorAll('[data-motif-note]'));
    const explanation = root.querySelector('[data-motif-explanation]');
    const playButton = root.querySelector('[data-motif-play]');
    const status = root.querySelector('[data-motif-status]');
    const transformations = {
      original: { pitches: [60, 63, 62, 67], duration: 0.28, text: '原形：保留四个音的音高、方向与均匀时值。' },
      inversion: { pitches: [60, 57, 58, 53], duration: 0.28, text: '倒影：以第一个音为轴，上行三度变成下行三度，方向翻转。' },
      retrograde: { pitches: [67, 62, 63, 60], duration: 0.28, text: '逆行：音高材料不变，但出现顺序完全反转。' },
      augmentation: { pitches: [60, 63, 62, 67], duration: 0.52, text: '增值：音高不变，每个音的时值加长，步伐更宽缓。' }
    };
    const noteNames = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
    let selected = 'original';
    let audioContext = null;
    let activeSources = [];
    let visualTimers = [];
    let completionTimer = null;
    let playbackToken = 0;
    let isPlaying = false;

    function labelForPitch(pitch) {
      return `${noteNames[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
    }

    function render() {
      const transformation = transformations[selected];
      const minimum = 52;
      options.forEach(option => option.setAttribute('aria-pressed', String(option.dataset.motifOption === selected)));
      notes.forEach((note, index) => {
        const pitch = transformation.pitches[index];
        note.style.setProperty('--note-level', String(pitch - minimum));
        note.querySelector('span').textContent = labelForPitch(pitch);
      });
      explanation.textContent = transformation.text;
    }

    function clearPlaybackResources() {
      visualTimers.forEach(timer => window.clearTimeout(timer));
      visualTimers = [];
      if (completionTimer) window.clearTimeout(completionTimer);
      completionTimer = null;
      activeSources.forEach(source => {
        try {
          source.stop();
          source.disconnect();
        } catch (_) {
          // The source may already have ended; either state is safe to discard.
        }
      });
      activeSources = [];
      notes.forEach(note => note.classList.remove('is-playing'));
    }

    function finishPlayback(message) {
      playbackToken += 1;
      clearPlaybackResources();
      isPlaying = false;
      playButton.disabled = false;
      playButton.setAttribute('aria-pressed', 'false');
      playButton.textContent = '播放当前动机';
      status.textContent = message;
    }

    async function ensureAudioContext() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('unsupported');
      }

      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContextClass();
      }
      if (audioContext.state === 'suspended' || audioContext.state === 'interrupted') {
        await audioContext.resume();
      }
      if (audioContext.state !== 'running') {
        throw new Error('not-running');
      }
      return audioContext;
    }

    async function play() {
      if (isPlaying) {
        finishPlayback('已停止，可切换变形继续比较。');
        return;
      }

      const token = playbackToken + 1;
      playbackToken = token;
      isPlaying = true;
      playButton.disabled = false;
      playButton.setAttribute('aria-pressed', 'true');
      playButton.textContent = '停止播放';
      status.textContent = '正在准备音频…';

      let context;
      try {
        context = await ensureAudioContext();
      } catch (_) {
        finishPlayback('播放未启动：请确认浏览器允许本站播放声音，然后再次点击。');
        return;
      }
      if (!isPlaying || token !== playbackToken) return;

      const transformation = transformations[selected];
      const start = context.currentTime + 0.03;
      status.textContent = `正在播放${playButton.dataset[selected]}。`;

      try {
        transformation.pitches.forEach((pitch, index) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const noteStart = start + index * transformation.duration;
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440 * (2 ** ((pitch - 69) / 12)), noteStart);
          gain.gain.setValueAtTime(0.0001, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.1, noteStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + transformation.duration * 0.82);
          oscillator.connect(gain);
          gain.connect(context.destination);
          activeSources.push(oscillator);
          oscillator.start(noteStart);
          oscillator.stop(noteStart + transformation.duration);

          visualTimers.push(window.setTimeout(() => {
            if (token !== playbackToken) return;
            notes.forEach(note => note.classList.remove('is-playing'));
            notes[index].classList.add('is-playing');
          }, index * transformation.duration * 1000));
        });
      } catch (_) {
        finishPlayback('播放遇到异常，控件已自动复位，可以再次尝试。');
        return;
      }

      const totalMilliseconds = transformation.pitches.length * transformation.duration * 1000 + 160;
      completionTimer = window.setTimeout(() => {
        if (token === playbackToken) finishPlayback('播放完成，可切换变形继续比较。');
      }, totalMilliseconds);
    }

    options.forEach(option => option.addEventListener('click', () => {
      if (isPlaying) finishPlayback('已停止上一段播放。');
      selected = option.dataset.motifOption;
      status.textContent = `${option.textContent.trim()}已选中。`;
      render();
    }));
    playButton.addEventListener('click', play);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && isPlaying) finishPlayback('页面切换，播放已停止。');
    });
    window.addEventListener('pagehide', () => {
      clearPlaybackResources();
      if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(() => {});
      audioContext = null;
    });
    render();
  }

  function initializeArticleVisuals() {
    document.querySelectorAll('[data-binary-lab]').forEach(initializeBinarySearchLab);
    document.querySelectorAll('[data-epsilon-lab]').forEach(initializeEpsilonLab);
    document.querySelectorAll('[data-meter-lab]').forEach(initializeMeterLab);
    document.querySelectorAll('[data-rag-diagnostic]').forEach(initializeRagDiagnostic);
    document.querySelectorAll('[data-tcp-lab]').forEach(initializeTcpLab);
    document.querySelectorAll('[data-broadcast-lab]').forEach(initializeBroadcastLab);
    document.querySelectorAll('[data-chart-choice-lab]').forEach(initializeChartChoiceLab);
    document.querySelectorAll('[data-motif-lab]').forEach(initializeMotifLab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeArticleVisuals);
  } else {
    initializeArticleVisuals();
  }
})();
