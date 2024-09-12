const input = document.querySelector(".input");
const saveBtn = document.querySelector(".saveBtn");
const closeBtn = document.querySelector(".closeBtn");
const playbackListContent = document.querySelector(".playbackListContent");

// 保存设置
const handleSave = () => {
  const shortcutValue = input.value.trim();
  if (shortcutValue.length === 0) {
    alert("快捷键不能为空");
    return;
  }

  const DisabledPlaybackList = Array.from(document.querySelectorAll(".playback:checked"))
    .map(checkbox => checkbox.value);

  const PlaybackVolumeList = Array.from(document.querySelectorAll(".playId"))
    .map(el => ({ ID: el.getAttribute("playId"), volume: el.value }));

  window.electronAPI.save({
    DisabledPlaybackList,
    PlaybackVolumeList,
    shortcut: { Playback: shortcutValue },
  });
};

// 处理键盘事件
const handleKeyDown = (event) => {
  if (event.key.toLowerCase() === "enter") {
    handleSave();
  }
};

// 处理音量变化
const handleChangeVolume = (el) => {
  const { value } = el;
  const playId = el.getAttribute("playId");
  window.electronAPI.changeVolume({ ID: playId, volume: value });
};

// 初始化设置界面
const initializeSettings = async () => {
  try {
    const config = await fetch("../config.json").then(res => res.json());
    const {
      shortcut = { Playback: "numsub" },
      DisabledPlaybackList = [],
      PlaybackList = [],
      PlaybackVolumeList = [],
      defaultVolume = "100%",
    } = config;

    input.value = shortcut.Playback;

    PlaybackList.forEach(playback => {
      const { ID, Name } = playback;
      const displayName = Name.match(/\((.*?)\)/)?.[1] || Name;
      const volume = PlaybackVolumeList.find(v => v.ID === ID)?.volume || defaultVolume;

      const deviceElement = createDeviceElement(ID, displayName, volume, DisabledPlaybackList.includes(ID));
      playbackListContent.appendChild(deviceElement);
    });
  } catch (error) {
    console.error("加载设置失败:", error);
    alert("加载设置失败，请检查控制台日志");
  }
};

// 创建设备元素
const createDeviceElement = (id, name, volume, isDisabled) => {
  const div = document.createElement("div");
  div.style = "font-size:22px;padding-bottom:5px";
  div.innerHTML = `
    <label for="${id}">${name}</label>
    <input type="checkbox" class="playback" value="${id}" ${isDisabled ? 'checked' : ''} style="margin-left:5px;">
    <br/>播放音量：<input type="range" max="100" min="0" class="playId" playId="${id}" value="${volume.replace('%', '')}" onchange="handleChangeVolume(this)">
  `;
  return div;
};

// 事件监听
input.addEventListener("keydown", handleKeyDown);
saveBtn.addEventListener("click", handleSave);
closeBtn.addEventListener("click", () => window.electronAPI.hideWindow());

// 初始化
initializeSettings();
