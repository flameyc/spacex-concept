(() => {
  const scenes = [...document.querySelectorAll('[data-scene]')];
  const railLinks = [...document.querySelectorAll('[data-rail-link]')];
  const header = document.querySelector('[data-site-header]');
  const sceneNumber = document.querySelector('[data-scene-number]');
  const sceneName = document.querySelector('[data-scene-name]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sceneVideos = [...document.querySelectorAll('[data-scene-video]')];
  const sceneImages = [...document.querySelectorAll('[data-scene] .scene__media img[loading="lazy"]')];
  let ticking = false;
  let activeScene = scenes[0] || null;

  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const smoothstep = (edge0, edge1, value) => {
    const t = clamp01((value - edge0) / Math.max(.0001, edge1 - edge0));
    return t * t * (3 - 2 * t);
  };

  const setActiveScene = (scene) => {
    if (!scene || (scene === activeScene && scene.classList.contains('is-active'))) return;
    activeScene = scene;
    const index = scene.dataset.scene;
    const isLight = index === '8';
    scenes.forEach((item) => item.classList.toggle('is-active', item === scene));
    railLinks.forEach((link) => {
      if (link.dataset.railLink === index) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    document.body.dataset.activeScene = index;
    header?.classList.toggle('is-light', isLight);
    if (sceneNumber) sceneNumber.textContent = String(index).padStart(2, '0');
    if (sceneName) sceneName.textContent = scene.dataset.sceneName || '';
  };

  const update = () => {
    ticking = false;
    const viewportHeight = Math.max(1, window.innerHeight);
    let closest = activeScene;
    let closestDistance = Number.POSITIVE_INFINITY;
    const viewportCenter = viewportHeight * .5;
    scenes.forEach((scene) => {
      const rect = scene.getBoundingClientRect();
      const center = rect.top + rect.height * .5;
      const distance = Math.abs(center - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = scene;
      }
      if (!reducedMotion.matches) {
        // 每幕的完整穿越被划分为：进入 18% / 稳定 64% / 离开 18%。
        const sceneProgress = clamp01((viewportHeight - rect.top) / Math.max(1, viewportHeight + rect.height));
        const enter = smoothstep(0, .18, sceneProgress);
        const exit = smoothstep(.82, 1, sceneProgress);
        const copyOpacity = enter * (1 - .82 * exit);
        const copyY = 32 * (1 - enter) - 26 * exit;
        const copyScale = .985 + .015 * enter - .012 * exit;
        const mediaScale = 1.045 - .045 * enter - .018 * exit;
        const mediaBrightness = .72 + .28 * enter - .28 * exit;
        const enterCurtain = 1 - smoothstep(0, .1, sceneProgress);
        const exitCurtain = smoothstep(.9, 1, sceneProgress);
        scene.style.setProperty('--scene-copy-opacity', copyOpacity.toFixed(4));
        scene.style.setProperty('--scene-copy-y', `${copyY.toFixed(2)}px`);
        scene.style.setProperty('--scene-copy-scale', copyScale.toFixed(4));
        scene.style.setProperty('--scene-media-scale', mediaScale.toFixed(4));
        scene.style.setProperty('--scene-media-brightness', mediaBrightness.toFixed(4));
        scene.style.setProperty('--scene-curtain', Math.max(enterCurtain, exitCurtain).toFixed(4));
      }
      if (!reducedMotion.matches && window.innerWidth > 560 && rect.bottom > 0 && rect.top < viewportHeight) {
        const local = (viewportCenter - center) / Math.max(rect.height, 1);
        const shift = Math.max(-72, Math.min(72, local * 118));
        scene.style.setProperty('--scene-shift', `${shift}px`);
      }
    });
    setActiveScene(closest);
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  const getVideoButton = (video) => document.querySelector(`[data-video-toggle][aria-controls="${video.id}"]`);

  const updateVideoUi = (video) => {
    const button = getVideoButton(video);
    if (!button) return;
    const label = button.querySelector('[data-video-toggle-label]');
    const icon = button.querySelector('.scene-video-toggle__icon');
    const title = video.closest('[data-scene]')?.querySelector('h2')?.textContent?.trim() || '场景';
    const paused = video.paused;
    button.dataset.videoState = paused ? 'paused' : 'playing';
    button.setAttribute('aria-label', `${paused ? '播放' : '暂停'} ${title} 背景视频`);
    if (label) label.textContent = paused ? '播放视频' : '暂停视频';
    if (icon) icon.textContent = paused ? '▶' : 'Ⅱ';
  };

  const syncSceneVideo = (video) => {
    const shouldPlay = video.dataset.videoInView === 'true'
      && video.dataset.userPaused !== 'true'
      && !document.hidden
      && !reducedMotion.matches;
    const button = getVideoButton(video);
    if (button) {
      button.disabled = reducedMotion.matches;
      if (reducedMotion.matches) button.setAttribute('aria-label', '背景视频已因减弱动态设置而暂停');
    }
    if (!shouldPlay) {
      video.pause();
      updateVideoUi(video);
      return;
    }
    const playPromise = video.play();
    if (playPromise) {
      playPromise.then(() => updateVideoUi(video)).catch(() => {
        video.dataset.userPaused = 'true';
        updateVideoUi(video);
      });
    }
  };

  const syncAllSceneVideos = () => sceneVideos.forEach(syncSceneVideo);

  sceneVideos.forEach((video) => {
    video.dataset.videoInView = 'false';
    video.dataset.userPaused = 'false';
    video.addEventListener('play', () => updateVideoUi(video));
    video.addEventListener('pause', () => updateVideoUi(video));
    video.addEventListener('ended', () => updateVideoUi(video));
    getVideoButton(video)?.addEventListener('click', () => {
      if (video.paused) {
        video.dataset.userPaused = 'false';
        video.dataset.videoInView = 'true';
      } else {
        video.dataset.userPaused = 'true';
      }
      syncSceneVideo(video);
    });
    updateVideoUi(video);
  });

  if ('IntersectionObserver' in window) {
    // 提前约一幕请求下一张大图，避免桌面端快速滚动时出现短暂空档。
    const imagePrefetchObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const image = entry.target;
        image.loading = 'eager';
        image.decode?.().catch(() => {});
        observer.unobserve(image);
      });
    }, { rootMargin: '120% 0px', threshold: 0 });
    sceneImages.forEach((image) => imagePrefetchObserver.observe(image));

    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        video.dataset.videoInView = String(entry.isIntersecting && entry.intersectionRatio >= .18);
        syncSceneVideo(video);
      });
    }, { threshold: [0, .18, .5] });
    sceneVideos.forEach((video) => videoObserver.observe(video));
  } else {
    sceneImages.forEach((image) => { image.loading = 'eager'; });
    sceneVideos.forEach((video) => { video.dataset.videoInView = 'true'; });
    syncAllSceneVideos();
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
      requestUpdate();
    }, { threshold: [0, .2, .5, .8], rootMargin: '-12% 0px -12% 0px' });
    scenes.forEach((scene) => observer.observe(scene));
  } else {
    scenes.forEach((scene) => scene.classList.add('is-in-view'));
  }

  reducedMotion.addEventListener?.('change', () => {
    syncAllSceneVideos();
    requestUpdate();
  });
  document.addEventListener('visibilitychange', syncAllSceneVideos);
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  window.addEventListener('load', requestUpdate, { once: true });
  setActiveScene(scenes[0]);
  requestUpdate();

  // 原页详情窗口：内容在首页内切换，不改变滚动位置。
  const detailDialog = document.querySelector('[data-detail-dialog]');
  const detailClose = document.querySelector('[data-detail-close]');
  const detailIndex = document.querySelector('[data-detail-index]');
  const detailKicker = document.querySelector('[data-detail-kicker]');
  const detailTitle = document.querySelector('[data-detail-title]');
  const detailLead = document.querySelector('[data-detail-lead]');
  const detailFacts = document.querySelector('[data-detail-facts]');
  const detailNoteTitle = document.querySelector('[data-detail-note-title]');
  const detailNote = document.querySelector('[data-detail-note]');
  const detailOfficial = document.querySelector('[data-detail-official]');
  const detailBody = document.querySelector('[data-detail-body]');
  let detailTrigger = null;
  let detailScrollY = 0;
  let detailOverflowAnchor = '';

  const DETAILS = {
    vehicles: {
      index: 'System brief / 01', kicker: 'Transport', title: 'Vehicles',
      lead: 'SpaceX 的运载体系不是单一火箭，而是一组覆盖发射、入轨、返回、人员与货物运输的工程系统。',
      facts: [['Starship', '面向完全、快速重复使用而设计'], ['Falcon 9', '可重复使用的两级轨道级火箭'], ['Dragon', '最多可搭载 7 人往返地球轨道']],
      noteTitle: '为什么放在同一条路径里',
      note: 'Starship 代表下一代运输目标，Falcon 9 提供今天可验证的复用能力，Dragon 把运输能力落到人员和货物。三者共同构成从地面到轨道的连续路径。',
      official: 'https://www.spacex.com/vehicles/'
    },
    missions: {
      index: 'Mission brief / 02', kicker: 'Architecture', title: 'Missions',
      lead: '任务架构沿着 Transport、Connect、Compute 展开：先抵达轨道，再让连接和计算成为可持续使用的基础设施。',
      facts: [['Transport', '发射服务与载人航天'], ['Connect', 'Starlink 低地球轨道宽带连接'], ['Compute', 'STARMIND 轨道 AI 计算系统，研发中']],
      noteTitle: '浏览逻辑',
      note: '这些能力不是相互割裂的产品目录。运输负责抵达，连接负责覆盖，计算负责延伸轨道基础设施的用途。动态任务数据仍以官方实时页面为准。',
      official: 'https://www.spacex.com/launches/'
    },
    company: {
      index: 'Company brief / 03', kicker: 'Mission', title: 'Company',
      lead: '公司的长期使命是 Making life multiplanetary。实现方式不是口号，而是把复用、制造、发射和任务反馈压缩进同一个工程闭环。',
      facts: [['Mission', 'Making life multiplanetary'], ['Method', '快速迭代、垂直整合、真实任务验证'], ['Information', '新闻、招聘与投资者信息以官方入口为准']],
      noteTitle: '概念站的解读',
      note: '这里把 SpaceX 的公开使命与工程路径组织成可浏览的叙事，不代表 SpaceX 官方表述，也不构成招聘或投资建议。',
      official: 'https://www.spacex.com/'
    },
    careers: {
      index: 'Company brief / 04', kicker: 'Build', title: 'Careers',
      lead: '多行星愿景最终需要工程师、制造团队、任务运营与大量跨学科协作，把仍不确定的目标变成可以反复测试的系统。',
      facts: [['Work', '工程、制造、软件与任务运营'], ['Evidence', '以真实硬件与任务结果推进'], ['Source', '职位与地区信息实时变化']],
      noteTitle: '实时信息提醒',
      note: '本概念站不复制职位清单。岗位、地点、资格与申请状态请始终以 SpaceX 官方招聘页面为准。',
      official: 'https://www.spacex.com/careers/'
    },
    starship: {
      index: 'Vehicle brief / 01', kicker: 'Transport', title: 'Starship',
      lead: 'Starship 由 Starship 飞船与 Super Heavy 助推器组成，是为完全、快速重复使用而设计的运输系统。',
      facts: [['Architecture', 'Starship + Super Heavy'], ['Design intent', '完全、快速重复使用'], ['Status', '设计目标，不表述为已经完成']],
      noteTitle: '工程重点',
      note: '“可重复使用”不仅是返回，还包括发射基础设施、回收、检查与再次准备。概念站因此把它呈现为一条完整运输链。',
      official: 'https://www.spacex.com/vehicles/starship/'
    },
    falcon: {
      index: 'Vehicle brief / 02', kicker: 'Launch', title: 'Falcon 9',
      lead: 'Falcon 9 是可重复使用的两级轨道级火箭，是今天可被持续任务验证的发射能力。',
      facts: [['Class', '两级轨道级火箭'], ['Reuse', '一级回收与重复使用'], ['Live data', '任务、着陆与复飞次数不在本站固化']],
      noteTitle: '为什么不展示累计数字',
      note: '发射和回收数据持续变化。概念站保持稳定的能力说明，把最新任务状态交给官方发射页面。',
      official: 'https://www.spacex.com/vehicles/falcon-9/'
    },
    dragon: {
      index: 'Vehicle brief / 03', kicker: 'Human scale', title: 'Dragon',
      lead: 'Dragon 承担人员与货物运输，可搭载最多 7 人往返地球轨道。',
      facts: [['Role', '人员与货物运输'], ['Capacity', '最多 7 人'], ['ISS service', '2012 年起运货，2020 年起运送人员']],
      noteTitle: '人的尺度',
      note: '技术最终服务于人。Dragon 把抽象的轨道运输转化为生命保障、可靠运营和可返回地球的完整任务。',
      official: 'https://www.spacex.com/vehicles/dragon/'
    },
    starlink: {
      index: 'System brief / 04', kicker: 'Connect', title: 'Starlink',
      lead: 'Starlink 是位于低地球轨道、用于提供宽带互联网的卫星星座。',
      facts: [['Orbit', '低地球轨道'], ['Service', '宽带互联网连接'], ['Availability', '受地区条件与监管许可影响']],
      noteTitle: '从抵达到覆盖',
      note: '运载系统解决“如何抵达”，Starlink 进一步回答“抵达后如何形成持续服务”。覆盖范围与可用性以官方服务信息为准。',
      official: 'https://www.starlink.com/'
    },
    starmind: {
      index: 'System brief / 05', kicker: 'Compute · In development', title: 'STARMIND',
      lead: 'STARMIND 是 SpaceX 正在开发的轨道 AI 计算系统，当前必须明确理解为研发中的能力。',
      facts: [['Domain', '轨道 AI 计算'], ['Status', 'IN DEVELOPMENT · 研发中'], ['Boundary', '不表述为已经规模运营']],
      noteTitle: '从连接到计算',
      note: '概念站把它放在连接之后，表达基础设施从运输、通信继续延伸到计算，但不替开发中的系统预设能力、规模或时间表。',
      official: 'https://www.spacex.com/spacexai/starmind/'
    },
    mars: {
      index: 'Mission brief / 06', kicker: 'Long horizon', title: 'Mars',
      lead: '火星是长期愿景，不是已经确定的倒计时或抵达承诺。',
      facts: [['Horizon', '多行星长期目标'], ['Today', '测试、复用、连接与计算'], ['Boundary', '不设置未经确认的抵达日期']],
      noteTitle: '把愿景变成工程问题',
      note: '宏大目标只有被拆成可以测试、失败、修正和复用的系统，才会形成可信的前进路径。',
      official: 'https://www.spacex.com/humanspaceflight/mars/'
    }
  };

  const openDetail = (key, trigger) => {
    const data = DETAILS[key];
    if (!detailDialog || !data) return;
    detailTrigger = trigger || null;
    detailScrollY = window.scrollY;
    detailOverflowAnchor = document.documentElement.style.overflowAnchor;
    document.documentElement.style.overflowAnchor = 'none';
    if (detailIndex) detailIndex.textContent = data.index;
    if (detailKicker) detailKicker.textContent = data.kicker;
    if (detailTitle) detailTitle.textContent = data.title;
    if (detailLead) detailLead.textContent = data.lead;
    if (detailNoteTitle) detailNoteTitle.textContent = data.noteTitle;
    if (detailNote) detailNote.textContent = data.note;
    if (detailOfficial) detailOfficial.href = data.official;
    if (detailFacts) {
      detailFacts.replaceChildren(...data.facts.map(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'detail-dialog__fact';
        const name = document.createElement('span');
        const description = document.createElement('span');
        name.textContent = label;
        description.textContent = value;
        row.append(name, description);
        return row;
      }));
    }
    if (detailBody) detailBody.scrollTop = 0;
    if (!detailDialog.open) detailDialog.showModal();
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-detail]');
    if (!trigger) return;
    event.preventDefault();
    openDetail(trigger.dataset.detail, trigger);
  });
  detailClose?.addEventListener('click', () => detailDialog?.close());
  detailDialog?.addEventListener('click', (event) => {
    if (event.target === detailDialog) detailDialog.close();
  });
  detailDialog?.addEventListener('close', () => {
    detailTrigger?.focus({ preventScroll: true });
    const restore = () => {
      window.scrollTo({ top: detailScrollY, behavior: 'instant' });
    };
    restore();
    window.requestAnimationFrame(restore);
    window.setTimeout(restore, 80);
    window.setTimeout(() => {
      restore();
      document.documentElement.style.overflowAnchor = detailOverflowAnchor;
    }, 160);
  });

  // 默认 BGM 由项目所有者提供；保留原创 Web Audio 作为解码失败时的回退。
  const audioToggle = document.querySelector('[data-audio-toggle]');
  const audioLabel = document.querySelector('[data-audio-label]');
  const audioSettings = document.querySelector('[data-audio-settings]');
  const audioPanel = document.querySelector('[data-audio-panel]');
  const audioStatus = document.querySelector('[data-audio-status]');
  const volumeInput = document.querySelector('[data-audio-volume]');
  const volumeOutput = document.querySelector('[data-audio-volume-output]');
  const audioFileInput = document.querySelector('[data-audio-file]');
  const audioFileName = document.querySelector('[data-audio-file-name]');
  const embeddedAudio = document.querySelector('[data-bgm-source]');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const VOLUME_KEY = 'spacex-concept-bgm-volume';
  let audioContext = null;
  let masterGain = null;
  let chordTimer = 0;
  let chordIndex = 0;
  let isPlaying = false;
  let mode = embeddedAudio ? 'local' : 'synth';
  let localAudio = embeddedAudio;
  let localObjectUrl = '';

  const storedVolume = Number.parseInt(localStorage.getItem(VOLUME_KEY) || '', 10);
  let volume = Number.isFinite(storedVolume) ? Math.min(100, Math.max(0, storedVolume)) : 32;
  if (volumeInput) volumeInput.value = String(volume);
  if (volumeOutput) volumeOutput.textContent = `${volume}%`;
  if (localAudio) {
    localAudio.volume = volume / 100;
    localAudio.addEventListener('error', () => setAudioUi(false, '默认音频无法读取'));
  }

  const setAudioUi = (playing, message) => {
    isPlaying = playing;
    audioToggle?.setAttribute('aria-pressed', String(playing));
    if (audioLabel) audioLabel.textContent = playing ? 'BGM · 播放中' : 'BGM · 已暂停';
    if (audioStatus) audioStatus.textContent = message || (playing ? '正在播放' : '已暂停');
  };

  const midiToHz = (note) => 440 * Math.pow(2, (note - 69) / 12);
  const CHORDS = [[38, 45, 50, 54], [35, 42, 47, 50], [31, 38, 43, 47], [33, 40, 45, 49]];

  const ensureSynth = () => {
    if (!AudioContextClass) return false;
    if (audioContext) return true;
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = .08;
    compressor.release.value = .8;
    masterGain.gain.value = 0;
    masterGain.connect(compressor).connect(audioContext.destination);
    return true;
  };

  const scheduleChord = () => {
    if (!isPlaying || mode !== 'synth' || !audioContext || !masterGain) return;
    const notes = CHORDS[chordIndex % CHORDS.length];
    chordIndex += 1;
    const now = audioContext.currentTime;
    const duration = 10.5;
    notes.forEach((note, voiceIndex) => {
      const voiceGain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      const fundamental = audioContext.createOscillator();
      const air = audioContext.createOscillator();
      fundamental.type = voiceIndex < 2 ? 'sine' : 'triangle';
      air.type = 'sine';
      fundamental.frequency.value = midiToHz(note);
      air.frequency.value = midiToHz(note + 12);
      air.detune.value = voiceIndex % 2 ? 4 : -4;
      filter.type = 'lowpass';
      filter.frequency.value = 720 + voiceIndex * 150;
      filter.Q.value = .55;
      const level = voiceIndex === 0 ? .17 : .085;
      voiceGain.gain.setValueAtTime(.0001, now);
      voiceGain.gain.exponentialRampToValueAtTime(level, now + 2.2 + voiceIndex * .18);
      voiceGain.gain.setValueAtTime(level, now + 6.7);
      voiceGain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      fundamental.connect(filter);
      air.connect(filter);
      filter.connect(voiceGain).connect(masterGain);
      fundamental.start(now);
      air.start(now);
      fundamental.stop(now + duration + .1);
      air.stop(now + duration + .1);
    });
    chordTimer = window.setTimeout(scheduleChord, 7600);
  };

  const playSynth = async () => {
    if (!ensureSynth()) {
      setAudioUi(false, '当前浏览器不支持 Web Audio');
      return;
    }
    mode = 'synth';
    if (localAudio) localAudio.pause();
    await audioContext.resume();
    isPlaying = true;
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime((volume / 100) * .34, audioContext.currentTime, .5);
    window.clearTimeout(chordTimer);
    scheduleChord();
    setAudioUi(true, '原创氛围声景');
  };

  const pauseAudio = () => {
    window.clearTimeout(chordTimer);
    if (mode === 'local' && localAudio) localAudio.pause();
    if (mode === 'synth' && audioContext && masterGain) {
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setTargetAtTime(0, audioContext.currentTime, .08);
    }
    setAudioUi(false, '已暂停');
  };

  const playCurrent = async () => {
    if (mode === 'local' && localAudio) {
      localAudio.volume = volume / 100;
      try {
        await localAudio.play();
        setAudioUi(true, localObjectUrl ? '本地授权音频' : 'Cornfield Chase');
      } catch {
        if (!localObjectUrl && localAudio === embeddedAudio) {
          mode = 'synth';
          await playSynth();
        } else {
          setAudioUi(false, '请再次点击播放');
        }
      }
      return;
    }
    await playSynth();
  };

  audioToggle?.addEventListener('click', () => {
    if (isPlaying) pauseAudio();
    else void playCurrent();
  });
  audioSettings?.addEventListener('click', () => {
    const opening = audioPanel?.hidden ?? false;
    if (audioPanel) audioPanel.hidden = !opening;
    audioSettings.setAttribute('aria-expanded', String(opening));
  });
  volumeInput?.addEventListener('input', () => {
    volume = Number(volumeInput.value);
    localStorage.setItem(VOLUME_KEY, String(volume));
    if (volumeOutput) volumeOutput.textContent = `${volume}%`;
    if (localAudio) localAudio.volume = volume / 100;
    if (audioContext && masterGain && mode === 'synth' && isPlaying) {
      masterGain.gain.setTargetAtTime((volume / 100) * .34, audioContext.currentTime, .08);
    }
  });
  audioFileInput?.addEventListener('change', async () => {
    const file = audioFileInput.files?.[0];
    if (!file) return;
    pauseAudio();
    if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
    localObjectUrl = URL.createObjectURL(file);
    localAudio = new Audio(localObjectUrl);
    localAudio.loop = true;
    localAudio.preload = 'auto';
    localAudio.volume = volume / 100;
    localAudio.addEventListener('error', () => setAudioUi(false, '音频文件无法读取'));
    mode = 'local';
    if (audioFileName) audioFileName.textContent = `${file.name} · 仅当前会话`;
    await playCurrent();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && audioPanel && !audioPanel.hidden && !detailDialog?.open) {
      audioPanel.hidden = true;
      audioSettings?.setAttribute('aria-expanded', 'false');
      audioSettings?.focus();
    }
  });
  window.addEventListener('pagehide', () => {
    window.clearTimeout(chordTimer);
    if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
  });
})();
