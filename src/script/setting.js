const input = document.querySelector(".input");
const handleSave = () => {
  const { value } = input;
  if (`${value}`.length == 0) {
    alert("快捷键为空");
  } else {
    const checkboxList = document.querySelectorAll(".playback");
    const DisabledPlaybackList = [];
    checkboxList?.forEach((ck) => {
      const { checked, value } = ck;
      if (checked) {
        DisabledPlaybackList.push(value);
      }
    });
    const volumeList = document.querySelectorAll(".playId");
    const PlaybackVolumeList = [];
    volumeList.forEach((el) => {
      const { value } = el;
      const playId = el.getAttribute("playId");
      const val = { ID: playId, volume: value };
      PlaybackVolumeList.push(val);
    });
    window.electronAPI.save({
      DisabledPlaybackList,
      PlaybackVolumeList,
      shortcut: {
        Playback: value,
      },
    });
  }
};
const handleKeyDown = (event) => {
  const { key, target } = event;
  //如果按下回车键，自动保存
  if (key?.toLowerCase() == "enter") {
    handleSave();
    return;
  }
};

input.addEventListener("keydown", handleKeyDown);

const saveBtn = document.querySelector(".saveBtn");
saveBtn.addEventListener("click", handleSave);
const closeBtn = document.querySelector(".closeBtn");
closeBtn.addEventListener("click", () => {
  window.electronAPI.hideWindow();
});
const handleChangeVolume = (el) => {
  const { value } = el;
  const playId = el.getAttribute("playId");
  const val = { ID: playId, volume: value };
  //切换音量
  window.electronAPI.changeVolume(val);
};
fetch("../config.json").then((res) => {
  res.json().then((params) => {
    const {
      shortcut = {
        Playback: "numsub",
      },
      //播放设备禁用状态缓存
      DisabledPlaybackList = [],
      //当前播放设备
      PlaybackList = [],
      //播放设备音量缓存
      PlaybackVolumeList = [],
      //当前设备播放音量
      defaultVolume = "100%",
    } = params;
    const { Playback } = shortcut;
    input.value = Playback;
    const playbackListContent = document.querySelector(".playbackListContent");
    //获取音量
    const getVolume = (ID) => {
      return `${
        PlaybackVolumeList.find((f) => f.ID == ID)?.volume ?? defaultVolume
      }`.replace("%", "");
    };
    PlaybackList.forEach((playback) => {
      let { ID, Name } = playback;
      const regex = /\((.*?)\)/;
      const result = Name.match(regex);

      if (result && result.length > 1) {
        Name = result[1];
      }
      const input = `<label for="${ID}">${Name}</label> <input type="checkbox" class="playback" value="${ID}" style="margin-left:5px;"></input><br/>播放音量：<input onChange="handleChangeVolume(this)" type="range" max="100" min="0" class="playId" playId=${ID} value="${getVolume(
        ID
      )}"/>`;
      const div = document.createElement("div");
      div.innerHTML = input;
      div.style = "font-size:22px;padding-bottom:5px";
      div.querySelector(".playback").checked = DisabledPlaybackList.some(
        (s) => s === ID
      );
      playbackListContent.appendChild(div);
    });
  });
});
