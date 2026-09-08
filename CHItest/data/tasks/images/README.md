# 20 张刺激图怎么放

网站真正读取的目录是：

```text
CHItest/public/data/tasks/images/
```

请把原图放到这里，覆盖现在的 SVG 占位图。建议同时在 `CHItest/data/tasks/images/` 放一份相同文件，方便仓库里对照。

## 格式

- **JPG（`.jpg`）或 PNG（`.png`）**，彩色照片即可。
- 横图更好（大约 16:9 或 3:2）。宽边 **1600–2400 px** 足够，单张最好 **< 4 MB**。
- 不要用 HEIC / WebP / PSD。文件名只用半角字母数字，不要空格。

若使用 `.jpg`，需要把 `CHItest/data/tasks/stimuli.json`（以及 `tasks.json`）里对应的 `image_path` 从 `.svg` 改成 `.jpg`。若你把文件交给我，我可以改路径并部署。

## 命名与文件夹（必须一致）

| 分组 | 文件夹 | 文件名 |
| --- | --- | --- |
| 环境 environment × 5 | `environment/` | `E01` `E02` `E03` `E04` `E05` |
| 人物与空间 character_space × 4 | `character_space/` | `C01` `C02` `C03` `C04` |
| 机位 camera × 5 | `camera/` | `A01` `A02` `A03` `A04` `A05` |
| 构图 composition × 6 | `composition/` | `D01` `D02` `D03` `D04` `D05` `D06` |

完整路径示例：

```text
CHItest/public/data/tasks/images/environment/E01.jpg
CHItest/public/data/tasks/images/character_space/C01.jpg
CHItest/public/data/tasks/images/camera/A01.jpg
CHItest/public/data/tasks/images/composition/D01.jpg
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
