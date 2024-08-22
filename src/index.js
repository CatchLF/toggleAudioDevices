const { app, Notification } = require("electron");
const { exec } = require("child_process");
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
          app.exit();
        }, 2_000);
      }
    );
  });
}
const createWindow = () => {
  toggleAudioDevices();
};

app.on("ready", createWindow);
