# toggleAudioDevices

![alt text](image/README/setting.png)

## 启动

1. `yarn` 或者 `npm install`
2. `yarn start`或者 `F5` 通过vscode启动

## 编译项目

`yarn make`
`yarn make`完成以后，会生成 `out` 目录和 `exe` 文件

## 使用方法

1.双击 `out\make\squirrel.windows\x64\toggleAudioDevices-1.0.0 Setup.exe`，或者 双击 `out\toggleAudioDevices-win32-x64\toggleAudioDevices.exe`,即可启动工具

    启动成功后，右下角任务栏，会有图标按钮

![alt text](src/audio.png)

2.按小键盘的 _`-`_（右上角的减号）即可切换音频

3.按小键盘上的 `*` 可以切换当前麦克风启用状态

4.如需要更改按键，更改  `config.json `文件的 `Playback`参数
[支持的快捷键和配置方式，查看这里](https://www.electronjs.org/zh/docs/latest/api/accelerator)
![alt text](image/README/shortcut.png)
然后重新进行编译
