/**
 * 个人主页后端服务
 * ------------------------------------------------------------------
 * 1) 托管静态页面（index.html 及头像图片）
 * 2) 提供 POST /api/remove-bg 接口：调用 Replicate 上的 lucataco/remove-bg 模型抠图
 *
 * ⚠️ API Key 只从「系统环境变量」REPLICATE_API_TOKEN 读取，绝不写进代码，也不落盘。
 *    本机已通过 Windows 用户级环境变量配置：
 *      setx REPLICATE_API_TOKEN "你的Token"
 *    （setx 写入的是用户级永久变量，需重开终端 / 重启服务才会生效）
 *
 *    如果不想动系统环境变量，也可以在项目根目录放一个 .env 文件（已被 .gitignore 排除）：
 *      cp .env.example .env   然后填入 Token
 *    .env 优先级低于真实环境变量，且不会提交到 Git。
 */

require("dotenv").config(); // 可选：读取 .env（若不存在则静默忽略，不影响系统环境变量）

const path = require("path");
const express = require("express");
const multer = require("multer");
const Replicate = require("replicate");

const app = express();
const PORT = process.env.PORT || 3000;

/* ============ 1. 基础配置 ============ */

// 静态资源：index.html、头像图片等直接对外访问
app.use(express.static(__dirname));

// 上传文件保存在内存中（不落磁盘），并限制 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// 从系统环境变量读取 Token，仅存在于内存中
const API_TOKEN = process.env.REPLICATE_API_TOKEN;

// OpenRouter 密钥（用于文字生成图片），同样只从环境变量读取
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Replicate 客户端。若未配置 Token，延迟到请求时再给出友好提示
const replicate = API_TOKEN ? new Replicate({ auth: API_TOKEN }) : null;

/* ============ 2. 抠图接口 ============ */

app.post("/api/remove-bg", upload.single("image"), async (req, res) => {
  // 2.1 前置校验 --------------------------------------------------
  if (!replicate) {
    return res.status(500).json({
      error:
        "服务端未读取到环境变量 REPLICATE_API_TOKEN。请在终端执行 setx REPLICATE_API_TOKEN \"你的Token\" 后，重开终端并重启服务。",
    });
  }

  if (!req.file) {
    return res.status(400).json({ error: "没有收到图片，请重新选择一张图片上传。" });
  }

  try {
    // 2.2 把图片转成 Data URI 交给 Replicate -----------------------
    // 形如：data:image/png;base64,iVBORw0KGgo...
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    console.log(
      `[抠图] 收到图片：${req.file.originalname}（${(req.file.size / 1024).toFixed(1)} KB），开始处理…`
    );

    // 2.3 调用模型（replicate.run 会自动等待任务完成）-------------
    // 官方写法：replicate.run("owner/name:版本号", { input })
    const output = await replicate.run(
      "lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
      { input: { image: dataUri } }
    );

    // 2.4 结果可能直接是 URL 字符串，也可能是带 .url() 的文件对象
    const resultUrl =
      typeof output === "string" ? output : output?.url ? output.url() : null;

    if (!resultUrl) {
      throw new Error("模型返回了空结果，请稍后重试。");
    }

    console.log(`[抠图] 处理成功：${resultUrl}`);

    // 2.5 返回给前端，由前端展示和下载 ----------------------------
    res.json({ ok: true, image: resultUrl });
  } catch (err) {
    console.error("[抠图] 处理失败：", err);

    // 尽量把可读的错误信息返回给前端
    let message = "图片处理失败，请稍后重试。";
    if (err?.response?.status === 401) {
      message = "Replicate Token 无效或已过期，请重新生成并更新环境变量后重启服务。";
    } else if (err?.response?.status === 402) {
      message = "Replicate 账户余额不足，请先充值后再试。";
    } else if (err?.response?.status === 429) {
      message = "请求过于频繁，请稍等片刻再试。";
    } else if (err?.message) {
      message = err.message;
    }

    res.status(500).json({ error: message });
  }
});

/* ============ 3. 文字生成图片接口（OpenRouter） ============ */

/**
 * 需要出图的模型 slug。
 * 默认使用 openai/gpt-5.4-image-2（gpt-5.4 推理 + GPT Image 2 出图）。
 *
 * 可以通过环境变量 OPENROUTER_IMAGE_MODEL 覆盖，方便随时换模型而不用改代码：
 *      setx OPENROUTER_IMAGE_MODEL "google/gemini-2.5-flash-image"
 *
 * 其他可选（OpenRouter 上支持图像输出的模型）：
 *      openai/gpt-5-image          openai/gpt-5-image-mini
 *      google/gemini-3-pro-image   google/gemini-3.1-flash-image
 */
const IMAGE_MODEL = process.env.OPENROUTER_IMAGE_MODEL || "openai/gpt-5.4-image-2";

// 该模型 P50 端到端延迟约 76 秒，超时给足
const IMAGE_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS) || 180000;

app.post("/api/generate-image", express.json({ limit: "1mb" }), async (req, res) => {
  // 3.1 前置校验 --------------------------------------------------
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({
      error:
        '服务端未读取到环境变量 OPENROUTER_API_KEY。请在终端执行 setx OPENROUTER_API_KEY "你的Key" 后，重开终端并重启服务。',
    });
  }

  const prompt = (req.body && req.body.prompt ? String(req.body.prompt) : "").trim();
  const aspect = (req.body && req.body.aspect ? String(req.body.aspect) : "1:1").trim();

  if (!prompt) {
    return res.status(400).json({ error: "请输入图片描述（提示词）。" });
  }
  if (prompt.length > 2000) {
    return res.status(400).json({ error: "提示词太长了，请控制在 2000 个字符以内。" });
  }

  try {
    console.log(`[文生图] 模型：${IMAGE_MODEL}｜尺寸：${aspect}｜提示词：${prompt.slice(0, 60)}…`);

    // 3.2 调用 OpenRouter（OpenAI 兼容接口）-----------------------
    // 关键：必须带 modalities: ["image", "text"]，否则模型不会出图
    const payload = {
      model: IMAGE_MODEL,
      messages: [
        {
          role: "user",
          content: prompt + `\n\n(请注意画面比例：${aspect})`,
        },
      ],
      modalities: ["image", "text"],
    };

    // 超时控制
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

    let resp;
    try {
      resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          // 这两个是可选的排行榜标识头，便于在 OpenRouter 后台看到自己的应用
          "HTTP-Referer": `http://localhost:${PORT}`,
          "X-Title": "Personal Homepage",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // 3.3 解析响应 ------------------------------------------------
    const text = await resp.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (_) {
      /* 非 JSON 响应 */
    }

    if (!resp.ok) {
      const apiMsg = data?.error?.message || text.slice(0, 300) || "未知错误";

      // 把常见错误翻译成人话
      let friendly = apiMsg;
      if (resp.status === 401) {
        friendly = "OpenRouter 密钥无效或已过期，请检查环境变量 OPENROUTER_API_KEY。";
      } else if (resp.status === 402) {
        friendly = "OpenRouter 账户余额不足，请先充值。";
      } else if (resp.status === 429) {
        friendly = "请求过于频繁，请稍等片刻再试。";
      } else if (/not available in your region/i.test(apiMsg)) {
        friendly =
          "当前网络所在地区无法访问该模型（OpenRouter 地理限制）。可通过更换网络出口或使用代理后重试。";
      }

      console.warn(`[文生图] 失败 HTTP ${resp.status}：${apiMsg}`);
      return res.status(resp.status === 402 || resp.status === 429 ? resp.status : 500).json({
        error: friendly,
        detail: apiMsg,
      });
    }

    // 3.4 取出图片（OpenRouter 返回 base64 data URL）--------------
    const message = data?.choices?.[0]?.message;
    const images = message?.images || [];
    const firstImage = images[0]?.image_url?.url;

    if (!firstImage) {
      // 模型可能只回了文字而没出图，把文字一起带回去方便排查
      const textPart =
        typeof message?.content === "string"
          ? message.content
          : Array.isArray(message?.content)
            ? message.content.map((c) => c?.text || "").join(" ")
            : "";

      console.warn("[文生图] 模型未返回图片");
      return res.status(502).json({
        error: "模型没有返回图片，请换个说法再试一次。",
        detail: textPart.slice(0, 300) || "（模型只返回了文字）",
      });
    }

    console.log(`[文生图] 成功，图片数据长度：${firstImage.length} 字符`);

    // 3.5 返回给前端 ---------------------------------------------
    res.json({
      ok: true,
      model: IMAGE_MODEL,
      // base64 data URL，前端可直接放进 <img src>，也能直接下载
      image: firstImage,
      text:
        typeof message.content === "string"
          ? message.content
          : Array.isArray(message.content)
            ? message.content.map((c) => c?.text || "").join("")
            : "",
      usage: data.usage || null,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      console.warn("[文生图] 请求超时");
      return res.status(504).json({
        error: `生成超时（超过 ${Math.round(IMAGE_TIMEOUT_MS / 1000)} 秒），该模型出图较慢，请稍后重试或换用更快的模型。`,
      });
    }
    console.error("[文生图] 异常：", err);
    res.status(500).json({ error: "生成失败：" + (err?.message || "未知错误") });
  }
});

/* ============ 4. 错误兜底 ============ */

// 上传文件过大等 multer 错误
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "图片太大了，请上传 10MB 以内的图片。" });
  }
  console.error("[服务] 未捕获错误：", err);
  res.status(500).json({ error: "服务器内部错误，请稍后重试。" });
});

/* ============ 4. 启动服务 ============ */

app.listen(PORT, () => {
  console.log("\n  ✅ 个人主页已启动");
  console.log(`  🌐 打开浏览器访问：http://localhost:${PORT}`);

  // 只打印是否已配置，绝不打印 Token 本身
  if (replicate) {
    console.log("  🔑 REPLICATE_API_TOKEN：已从环境变量读取（抠图）");
  } else {
    console.log("  🔑 REPLICATE_API_TOKEN：❌ 未配置，抠图功能不可用");
    console.log('     → 在终端执行：setx REPLICATE_API_TOKEN "你的Token"，然后重开终端重启服务');
  }

  if (OPENROUTER_API_KEY) {
    console.log(`  🎨 OPENROUTER_API_KEY：已从环境变量读取（文生图模型：${IMAGE_MODEL}）`);
  } else {
    console.log("  🎨 OPENROUTER_API_KEY：❌ 未配置，文生图功能不可用");
    console.log('     → 在终端执行：setx OPENROUTER_API_KEY "你的Key"，然后重开终端重启服务');
  }
  console.log("");
});
