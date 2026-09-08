# 20 张刺激图怎么放

这些图片是 **当前画面 / 参考视觉状态**，不是要求被试复现的标准答案。研究者用的目标修改说明在 `../target_modifications.json`，被试看不到。

网站真正读取的目录是：

```text
CHItest/public/data/tasks/images/
```

原图用 **PNG（`.png`）**，文件名必须是 `E01`–`E05`、`C01`–`C04`、`A01`–`A05`、`D01`–`D06`。`stimuli.json` 里的 `image_path` 已指向这些 `.png`。

请同时在 `CHItest/data/tasks/images/` 保留一份相同文件。

## 命名与文件夹（必须一致）

| 分组 | 文件夹 | 文件名 |
| --- | --- | --- |
| 环境 environment × 5 | `environment/` | `E01` `E02` `E03` `E04` `E05` |
| 人物与空间 character_space × 4 | `character_space/` | `C01` `C02` `C03` `C04` |
| 机位 camera × 5 | `camera/` | `A01` `A02` `A03` `A04` `A05` |
| 构图 composition × 6 | `composition/` | `D01` `D02` `D03` `D04` `D05` `D06` |

完整路径示例：

```text
CHItest/public/data/tasks/images/environment/E01.png
CHItest/public/data/tasks/images/character_space/C01.png
CHItest/public/data/tasks/images/camera/A01.png
CHItest/public/data/tasks/images/composition/D01.png
```

对应题面（方便你对照 Word 里的静帧）：

| ID | 题面 |
| --- | --- |
| E01 | 空剧院 |
| E02 | 轮渡甲板 |
| E03 | 书店门口 |
| E04 | 公园长椅 |
| E05 | 前后景 |
| C01 | 火车站窗边 |
| C02 | 咖啡馆对坐 |
| C03 | 庭院对望 |
| C04 | 街角三人 |
| A01 | 楼梯仰拍 |
| A02 | 博物馆展墙 |
| A03 | 俯视走廊 |
| A04 | 地铁来车 |
| A05 | 长椅分神 |
| D01 | 柱后半隐 |
| D02 | 门后身影 |
| D03 | 走廊走向 |
| D04 | 画廊穿过 |
| D05 | 餐桌三人 |
| D06 | 玻璃内外 |
