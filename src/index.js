const {
  app,
  Notification,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  BrowserWindow,
  ipcMain,
} = require("electron");
const { exec } = require("child_process");
const path = require("path");
const config = require("../config.json");
const fs = require("fs");
//获取播放设备列表
const getAudioDeviceList = (
  callBack = (PlaybackList = [], RecordingList = []) => {}
) => {
  exec("powershell -Command Get-AudioDevice -list", (error, stdout, stderr) => {
    if (error) {
      console.error(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    let index = 0;
    let obj = {};
    stdout.split("\n").forEach((line) => {
      if (line.includes(":")) {
        const [key, value] = line.replace(/\r|\n/g, "").split(":");
        const k = key.replace(/\s+/g, "");
        const v = value.replace(/\s+/g, "");
        if (k == "Index") {
          index = v;
          obj[`audio_${index}`] = {};
        }
        obj[`audio_${index}`][k] = v;
      }
    });
    const list = Object.keys(obj).map((k) => obj[k]);
    const playbackList = list.filter((f) => f.Type == "Playback") ?? [];
    const recordingList = list.filter((f) => f.Type == "Recording") ?? [];

    callBack(playbackList, recordingList);
  });
};
//切换播放设备
const toggleAudioDevices = () => {
  getAudioDeviceList((PlaybackList) => {
    const list = PlaybackList.filter(
      //找到没被禁用的设备
      (f) => !config.DisabledPlaybackList.some((s) => s === f.ID)
    );
    if (list.length == 0) {
      new Notification({
        title: "输出设备切换",
        body: "没有输出设备",
      }).show();
      return;
    }
    const playIndex = list.findIndex((f) => f.Default == "True");
    const playback = list.at(playIndex + 1) ?? PlaybackList.at(0);
    exec(
      `powershell -Command Set-AudioDevice ${playback?.Index}`,
      (error, stdout, stderr) => {
        let body = "";
        if (error) {
          body = `${error.message}`;
        } else if (stderr) {
          body = stderr;
        } else {
          body = `切换成功，当前播放设备${playback?.Name}`;
        }
        const find = config.PlaybackVolumeList.find((f) => f.ID == playback.ID);
        const { volume } = find;
        setPlaybackVolume(`${volume ?? config.defaultVolume}`.replace("%", ""));
        const msg = new Notification({
          title: "输出设备切换",
          body,
        });
        msg.show();
        setTimeout(() => {
          msg.close();
        }, 3_000);
      }
    );
  });
};
//获取当前播放音量
const getPlaybackVolume = (callback) => {
  exec(
    `powershell -Command Get-AudioDevice -PlaybackVolume`,
    (error, stdout, stderr) => {
      if (error) {
        new Notification({
          body: `${error.message}`,
        }).show();
      } else if (stderr) {
        new Notification({
          body: stderr,
        }).show();
      } else {
        callback(stdout.replace(/\r|\n/g, "").replace("%", ""));
      }
    }
  );
};
//设置当前播放音量
const setPlaybackVolume = (volume = "100") => {
  exec(
    `powershell -Command Set-AudioDevice -PlaybackVolume ${volume}`,
    (error, stdout, stderr) => {
      if (error) {
        new Notification({
          body: `${error.message}`,
        }).show();
      } else if (stderr) {
        new Notification({
          body: stderr,
        }).show();
      } else {
        new Notification({
          body: `当前音量${volume}`,
        }).show();
      }
    }
  );
};
const toggleRecord = () => {
  exec(
    "powershell -Command Set-AudioDevice -RecordingMuteToggle",
    (error, stdout, stderr) => {
      if (error) {
        new Notification({
          body: `${error.message}`,
        }).show();
      } else if (stderr) {
        new Notification({
          body: stderr,
        }).show();
      } else {
        exec(
          "powershell -Command Get-AudioDevice -RecordingMute",
          (er, out, derr) => {
            const allWindow = BrowserWindow.getAllWindows();
            const window = allWindow?.find((f) => f.title == "record");
            if (out.includes("True")) {
              if (window) {
                window.show();
                return;
              }
              const win = new BrowserWindow({
                width: 800,
                height: 600,
                frame: false,
                backgroundColor: "rgba(255,21,21,0.8)",
                title: "record",
                alwaysOnTop: true,
              });
              win.setIgnoreMouseEvents(true);
            } else {
              window?.hide();
            }
          }
        );
      }
    }
  );
};
const registerGlobalShortcut = (key = "numsub") => {
  //去除所有快捷键
  globalShortcut.unregisterAll();
  globalShortcut.register(key, () => {
    toggleAudioDevices();
  });
  globalShortcut.register("nummult", () => {
    toggleRecord();
  });
};
//创建设置快捷键窗口
const createSettingWindow = () => {
  //获取当前播放音量
  getPlaybackVolume((volume) => {
    //进来的时候，更新播放设备列表
    getAudioDeviceList((PlaybackList) => {
      Object.assign(config, { PlaybackList, defaultVolume: volume });
      fs.writeFile("./config.json", JSON.stringify(config), (err) => {
        if (err) {
          const msg = new Notification({
            title: "设置",
            body: `获取设备信息失败${JSON.stringify(err)}`,
          });
          msg.show();
        }
      });
    });
  });

  //清空所有窗口
  const allWindow = BrowserWindow.getAllWindows();
  //如果一件创建了
  const createdWindow = allWindow.find((f) => f.title == "快捷键设置");
  if (createdWindow) {
    createdWindow.reload();
    createdWindow.show();
    createdWindow.focus();
    return;
  }

  //创建新的窗口
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: "设置",
    frame: false,
    skipTaskbar: true, //不在任务栏展示
    webPreferences: {
      preload: path.join(__dirname, "./script/preload.js"),
    },
  });
  win.loadFile(path.join(__dirname, "./Setting.html"));
  ipcMain.on("save", (event, message) => {
    //写入json文件
    Object.assign(config, message);
    fs.writeFile("./config.json", JSON.stringify(config), (err) => {
      if (err) {
        const msg = new Notification({
          title: "设置",
          body: `设置失败${JSON.stringify(err)}`,
        });
        msg.show();
      } else {
        //设置快捷键
        registerGlobalShortcut(config?.shortcut?.Playback ?? "numsub");
        win.hide();
      }
    });
  });
  ipcMain.on("change-volume", (event, message) => {
    const { volume } = message;
    //设置当前播放音量
    setPlaybackVolume(`${volume}`.replace("%", ""));
  });
  ipcMain.on("hide-window", () => {
    win.hide();
  });
};

app.on("ready", () => {
  const { openAtLogin } = app.getLoginItemSettings();
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "设置",
      checked: openAtLogin,
      click: () => {
        createSettingWindow();
      },
    },
    {
      label: "开机自启动",
      checked: openAtLogin,
      click: (event) => {
        const { checked } = event;
        //如果设置开机自动启动
        if (checked) {
          app.setLoginItemSettings({ openAtLogin: true });
        } else {
          app.setLoginItemSettings({ openAtLogin: false });
        }
      },
      type: "checkbox",
    },
    {
      label: "Exit",
      click: () => {
        app.exit();
      },
    },
  ]);
  const icon = nativeImage.createFromPath(path.join(__dirname, "./audio.png"));
  const tray = new Tray(icon);
  tray.setTitle("toggle");
  tray.setContextMenu(contextMenu);
  //设置快捷键
  const { shortcut = { Playback: "numsub" } } = config;
  const { Playback = "numsub" } = shortcut;
  registerGlobalShortcut(Playback);
});
