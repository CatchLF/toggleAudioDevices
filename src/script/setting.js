// setting.js

const input = document.querySelector("#shortcutInput");
const saveBtn = document.querySelector("#saveBtn");
const closeBtn = document.querySelector("#closeBtn");
const playbackListContent = document.querySelector("#deviceList");

// 保存设置
const handleSave = () => {
  const shortcutValue = input.value.trim();
  if (shortcutValue.length === 0) {
    alert("快捷键不能为空");
    return;
  }

  const DisabledPlaybackList = Array.from(
    document.querySelectorAll(".device-toggle:not(:checked)")
  ).map((checkbox) => checkbox.getAttribute("data-id"));

  const PlaybackVolumeList = Array.from(
    document.querySelectorAll(".device-volume")
  ).map((el) => ({ ID: el.getAttribute("data-id"), volume: el.value }));
  console.log({
    DisabledPlaybackList,
    PlaybackVolumeList,
    shortcut: { Playback: shortcutValue },
  });
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
  const playId = el.getAttribute("data-id");
  // 更新显示的音量值
  const volumeDisplay = el.parentElement.querySelector('.volume-display');
  if (volumeDisplay) {
    volumeDisplay.textContent = `${value}`;
  }
  window.electronAPI.changeVolume({ ID: playId, volume: value });
};

// 初始化设置界面
const initializeSettings = async () => {
  try {
    const config = await fetch("../config.json").then((res) => res.json());
    const {
      shortcut = { Playback: "numsub" },
      DisabledPlaybackList = [],
      PlaybackList = [],
      PlaybackVolumeList = [],
      defaultVolume = "100%",
    } = config;

    input.value = shortcut.Playback;

    PlaybackList.forEach((playback) => {
      const { ID, Name } = playback;
      const displayName = Name.match(/\((.*?)\)/)?.[1] || Name;
      const volume =
        PlaybackVolumeList.find((v) => v.ID === ID)?.volume || defaultVolume;

      const deviceElement = createDeviceElement(
        ID,
        displayName,
        volume,
        DisabledPlaybackList.includes(ID)
      );
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
  div.className = "bg-white p-4 rounded-lg shadow mb-4";
  div.innerHTML = `
    <div class="font-semibold mb-2">${name}</div>
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2 w-2/3">
        <input type="range" max="100" min="0" class="device-volume w-full" data-id="${id}" value="${volume.replace(
    "%",
    ""
  )}" onchange="handleChangeVolume(this)">
  <span class="volume-display">${volume}</span>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" class="sr-only peer device-toggle" data-id="${id}" ${
    !isDisabled ? "checked" : ""
  }>
        <svg class="h-8 w-8 text-red-400 peer-checked:text-blue-600 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      </label>
    </div>
  `;
  return div;
};

// 事件监听
input.addEventListener("keydown", handleKeyDown);
saveBtn.addEventListener("click", handleSave);
closeBtn.addEventListener("click", () => window.electronAPI.hideWindow());

// 初始化
initializeSettings();
