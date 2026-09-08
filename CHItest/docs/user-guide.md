# CHItest

CHI 2027 实验系统。最终协议：组间对照 + 草图只作语言脚手架，不进入最终生图。

线上入口：`https://www.2027mitgo.top/chitest/` 或 `https://storyboard-skill.vercel.app/chitest/`

---

## 1. 启动

```bash
cd CHItest
npm install
npm run dev
```

| 地址 | 角色 |
| --- | --- |
| `#/` | 首页 |
| `#/participant` | 被试：7 题。奇数编号 scaffold，偶数编号 control |
| `#/participant?short=1` | 干跑：scaffold 为 T0/T1/T2/T3，control 为 T0/T1/T1′/T3 |
| `#/expert` | 四专家盲评（对照 Target Modification，不评像不像原图） |
| `#/coding` | 研究者按 active dimensions 编码；主指标 P_norm |
| `#/export` | event_log / auto_prompts / practice_control 等 |

数据仍会先写在当前浏览器（`chitest.store.v6`）。被试在最后问卷点「提交」后，整场 JSON 会上传到服务器；每完成一题也会先存一份 checkpoint。

查看：

- 本机：`CHItest/data/participants/received/`
- 线上：`#/export` 填 `CHITEST_VIEW_TOKEN`，或打开 `https://www.2027mitgo.top/api/chitest-session/?token=你的口令`

线上必须在 Vercel Production 设置 `CHITEST_GITHUB_TOKEN`（gist 权限）和 `CHITEST_VIEW_TOKEN`，然后 Redeploy。否则提交会失败，被试仍可下载备份 JSON。

---

## 2. 两组

不要告诉被试自己在哪一组。

- **scaffold（奇数 ID）**：T0×1 + T1×2 + T2×2 + T3×2
- **control（偶数 ID）**：T0×1 + T1×4 + T3×2

中间两题才是条件差异。T3 两组都没有草图，用来看撤掉脚手架后的近迁移。

---

## 3. 被试流程

**T0** 观察当前画面，写下读到的视觉信息。无 AI、无草图。

**T1** 写希望生成的画面 → Generate（当前图+文字）→ 看差异 → 改文字再生成。最多 3 轮。

**T2（仅 scaffold）** 草图始终在主界面。改草图后，左侧只读显示「AI 对你草图变化的文字描述」。右侧「你可以修改的生成描述」才是生图用的文字。最终 API 只送当前图 + 用户描述，**不送草图**。

**T3** 新图，纯文字，与 T1 相同。无草图、无自动描述。

随时可以 **满意，下一题**。

---

## 4. 生图 API

`POST /api/jimeng/`。所有生成轮次：当前图 + 用户最终描述。T2 草图只用于自动语言，不作为条件图。

---

## 5. 被试 JSON 上传

被试在 `#/participant` 做到问卷并点「提交」后，浏览器会把与下载文件相同的整场 JSON `POST` 到 `/api/chitest-session/`（含 event_log、文本版本、草图快照、问卷等）。每完成一题会先传一份 `checkpoint`。

研究者查看：

1. `#/export` → 填查看口令 → 从服务器加载
2. `https://www.2027mitgo.top/api/chitest-session/?token=口令` 打开列表，点进即是完整 JSON

本机 `npm run dev` 时文件写在 `CHItest/data/participants/received/`，不需要 token。

实验网站 `www.2027mitgo.top` 在 Vercel，不是腾讯云轻量服务器 `101.34.248.192`。要 SSH 进轻量服务器后用 `ls` 看到 JSON，按下面做。

### 5.1 登录轻量服务器

控制台「登录」里用户名填 `ubuntu` 是对的。密码栏必须填这台机的密码（或点下拉选托管密码）。空着点登录会一直停在「正在登录…」。

没有密码时：选 **免密连接 (TAT)**，或点 **忘记密码?** 在控制台重置后再 SSH。也可用 **VNC登录**。防火墙需放行 22。

### 5.2 在轻量服务器上收 JSON

SSH 进去后（把仓库克隆到这台机，或至少拷 `api/` 与 `scripts/chitest-lighthouse-receiver.js`）：

```bash
mkdir -p /home/ubuntu/chitest-sessions
export CHITEST_VIEW_TOKEN='你自己定的口令'
export CHITEST_DATA_DIR=/home/ubuntu/chitest-sessions
node scripts/chitest-lighthouse-receiver.js
```

防火墙放行 **TCP 8787**。然后在 Vercel Production 设置：

- `CHITEST_FORWARD_URL`=`http://101.34.248.192:8787`
- `CHITEST_VIEW_TOKEN`=与上面相同的口令

保存后 Redeploy。被试提交后，Vercel 把 JSON 转到这台机：

```bash
ls -l /home/ubuntu/chitest-sessions
```

没有接收进程或没开 8787 时，结束页会提示上传失败，被试仍可下载备份 JSON。也可改用 `CHITEST_GITHUB_TOKEN`（gist）作后备。
