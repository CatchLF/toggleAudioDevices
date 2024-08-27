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
function toggleAudioDevices() {
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

    //获取播放列表
    const PlaybackList = list.filter((f) => f.Type == "Playback");
    //获取麦克风列表
    const RecordingList = list.filter((f) => f.Type == "Recording");

    const playIndex = PlaybackList.findIndex((f) => f.Default == "True");
    const playback = PlaybackList.at(playIndex + 1) ?? PlaybackList.at(0);

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
}
const registerGlobalShortcut = (key = "numsub") => {
  //去除所有快捷键
  globalShortcut.unregisterAll();
  globalShortcut.register(key, () => {
    toggleAudioDevices();
  });
};
//创建设置快捷键窗口
const createShortcutKeysWindow = () => {
  //清空所有窗口
  const allWindow = BrowserWindow.getAllWindows();
  //如果一件创建了
  const createdWindow = allWindow.find((f) => f.title == "快捷键设置");
  if (createdWindow) {
    createdWindow.show();
    createdWindow.focus();
    return;
  }
  //创建新的窗口
  const win = new BrowserWindow({
    width: 600,
    height: 200,
    title: "快捷键设置",
    frame: false,
    skipTaskbar: true, //不在任务栏展示
    webPreferences: {
      preload: path.join(__dirname, "./script/preload.js"),
    },
  });
  win.loadFile(path.join(__dirname, "./createShortcutKeysWindow.html"));
  //关闭当前窗口
  ipcMain.on("register-global-shortcut", (event, message) => {
    config.shortcut.Playback = message;
    fs.writeFile("./config.json", JSON.stringify(config), (err) => {
      if (err) {
        const msg = new Notification({
          title: "快捷键设置",
          body: `设置失败${JSON.stringify(err)}`,
        });
        msg.show();
      } else {
        registerGlobalShortcut(message);
        win.hide();
      }
    });
  });
  ipcMain.on("hide-window", () => {
    win.hide();
  });
};

app.on("ready", () => {
  const { openAtLogin } = app.getLoginItemSettings();
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "设置快捷键",
      checked: openAtLogin,
      click: () => {
        createShortcutKeysWindow();
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
          app.setLoginItemSettings();
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
