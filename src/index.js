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
const { promisify } = require("util");
const execAsync = promisify(require("child_process").exec);
const path = require("path");
const fs = require("fs").promises;
const config = require("../config.json");

// Helper functions
const showNotification = (title, body, timeout = 3000) => {
  new Notification({ title, body }).show();
};

const getAudioDeviceList = async () => {
  try {
    const { stdout } = await execAsync(
      "powershell -Command Get-AudioDevice -list",
      {
        encoding: "utf8",
      }
    );
    const devices = stdout.split("\n").reduce((acc, line) => {
      if (line.includes(":")) {
        const [key, value] = line.trim().split(":");
        const k = key.trim();
        const v = value.trim();
        if (k === "Index") {
          acc.push({});
        }
        acc[acc.length - 1][k] = v;
      }
      return acc;
    }, []);

    const playbackList = devices.filter((d) => d.Type === "Playback");
    const recordingList = devices.filter((d) => d.Type === "Recording");
    return { playbackList, recordingList };
  } catch (error) {
    throw new Error(`获取音频设备列表失败: ${error.message}`);
  }
};

const toggleAudioDevices = async () => {
  try {
    const { playbackList } = await getAudioDeviceList();
    const availableDevices = playbackList.filter(
      (d) => !config.DisabledPlaybackList.some((s) => s === d.ID)
    );

    if (availableDevices.length === 0) {
      throw new Error("没有可用的输出设备");
    }

    const currentIndex = availableDevices.findIndex(
      (d) => d.Default === "True"
    );
    const nextDevice =
      availableDevices[(currentIndex + 1) % availableDevices.length];

    await execAsync(`powershell -Command Set-AudioDevice ${nextDevice.Index}`);
    showNotification(
      "输出设备切换",
      `切换成功，当前播放设备${nextDevice.Name}`
    );
    const volumeConfig = config.PlaybackVolumeList.find(
      (v) => v.ID === nextDevice.ID
    );
    const volume = volumeConfig ? volumeConfig.volume : config.defaultVolume;
    await setPlaybackVolume(volume.replace("%", ""));
  } catch (error) {
    showNotification("输出设备切换", `切换失败: ${error.message}`);
  }
};

const getPlaybackVolume = async () => {
  const { stdout } = await execAsync(
    "powershell -Command Get-AudioDevice -PlaybackVolume"
  );
  return stdout.trim().replace("%", "");
};

const setPlaybackVolume = async (volume = "100") => {
  await execAsync(
    `powershell -Command Set-AudioDevice -PlaybackVolume ${volume}`
  );
  showNotification("音量调节", `当前音量${volume}`);
};

const toggleRecord = async () => {
  try {
    await execAsync("powershell -Command Set-AudioDevice -RecordingMuteToggle");
    const { stdout } = await execAsync(
      "powershell -Command Get-AudioDevice -RecordingMute"
    );

    const allWindows = BrowserWindow.getAllWindows();
    const recordWindow = allWindows.find((w) => w.title === "record");

    if (stdout.includes("True")) {
      if (recordWindow) {
        recordWindow.show();
      } else {
        const win = new BrowserWindow({
          width: 800,
          height: 600,
          frame: false,
          backgroundColor: "rgba(255,21,21,0.8)",
          title: "record",
          alwaysOnTop: true,
        });
        win.setIgnoreMouseEvents(true);
      }
    } else {
      recordWindow?.hide();
    }
  } catch (error) {
    showNotification("录音切换", `切换失败: ${error.message}`);
  }
};

const registerGlobalShortcut = (key = "numsub") => {
  globalShortcut.unregisterAll();
  globalShortcut.register(key, toggleAudioDevices);
  globalShortcut.register("nummult", toggleRecord);
};

const createSettingWindow = async () => {
  try {
    const volume = await getPlaybackVolume();
    const { playbackList } = await getAudioDeviceList();

    Object.assign(config, {
      PlaybackList: playbackList,
      defaultVolume: volume,
    });
    await fs.writeFile("./config.json", JSON.stringify(config));

    const allWindows = BrowserWindow.getAllWindows();
    const existingWindow = allWindows.find((w) => w.title === "快捷键设置");

    if (existingWindow) {
      existingWindow.reload();
      existingWindow.show();
      existingWindow.focus();
      return;
    }

    const win = new BrowserWindow({
      width: 800,
      height: 600,
      title: "设置",
      frame: false,
      skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, "./script/preload.js"),
      },
    });

    win.loadFile(path.join(__dirname, "./Setting.html"));

    ipcMain.on("save", async (event, message) => {
      try {
        Object.assign(config, message);
        await fs.writeFile("./config.json", JSON.stringify(config));
        registerGlobalShortcut(config?.shortcut?.Playback ?? "numsub");
        win.hide();
        showNotification("设置", "设置保存成功");
      } catch (error) {
        showNotification("设置", `设置保存失败: ${error.message}`);
      }
    });

    ipcMain.on("change-volume", async (event, { volume }) => {
      try {
        await setPlaybackVolume(volume.replace("%", ""));
      } catch (error) {
        showNotification("音量调节", `调节失败: ${error.message}`);
      }
    });

    ipcMain.on("hide-window", () => {
      win.hide();
    });
  } catch (error) {
    showNotification("设置", `获取设备信息失败: ${error.message}`);
  }
};

app.on("ready", () => {
  const { openAtLogin } = app.getLoginItemSettings();
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "设置",
      click: () => {
        createSettingWindow().catch((error) => {
          showNotification("错误", `打开设置失败: ${error.message}`);
        });
      },
    },
    {
      label: "开机自启动",
      type: "checkbox",
      checked: openAtLogin,
      click: ({ checked }) => {
        app.setLoginItemSettings({ openAtLogin: checked });
      },
    },
    {
      label: "Exit",
      click: () => app.exit(),
    },
  ]);

  const icon = nativeImage.createFromPath(path.join(__dirname, "./audio.png"));
  const tray = new Tray(icon);
  tray.setTitle("toggle");
  tray.setContextMenu(contextMenu);

  const { shortcut = { Playback: "numsub" } } = config;
  registerGlobalShortcut(shortcut.Playback);
});
