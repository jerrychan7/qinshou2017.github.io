
import path from "path";
import fs from "fs";
import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import markedKatex from "./marked-katex-ext.js";
import fsp from "fs/promises";
import { get } from "http";
import fm from "front-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.normalize(path.dirname(__filename));

const rootDirPath = __dirname;

const outputPath = ([p]) => path.join(rootDirPath, "/build", p); // 最终编译输出目录
const templatePath = ([p]) => path.join(rootDirPath, "/template", p); // 模板目录
const markdownsPath = ([p]) => path.join(rootDirPath, "/markdowns", p); // 文章库目录
const articlesInfoPath = markdownsPath`/articleInfo.json`; // 文章信息文件路径
const articlesOutputDirPath = outputPath`/articles`; // 文章输出目录

if (!fs.existsSync(articlesInfoPath))
  throw "miss config file: " + articlesInfoPath;

const githubName = "jerrychan7";
const githubPage = `${githubName}.github.io`;
const myGithubURL = `https://github.com/${githubName}`;
const githubRepoURL = `${myGithubURL}/${githubPage}`;
const githubPageURL = `https://${githubPage}`;

const links = Object.entries({
  "kokic": "https://kokic.github.io/",
  // "兔子": "https://www.rabbittu.com/",
  "兔子": "https://blog.awa.moe/",
}).map(([name, href]) => `<li><a href="${href}">${name}</a></li>`)
.join("\n            ");

marked.use({ gfm: true, }, gfmHeadingId(), markedKatex());

const date2iso = (date = new Date(), offsetHour = 8) => {
  let t = new Date(+date);
  t = new Date(+t + offsetHour * 60 * 60 * 1000);
  return t.toISOString().replace("Z", (offsetHour < 0? "-": "+") + (offsetHour < 10? "0" + offsetHour: offsetHour) + ":00");
};

const filenameWithoutExt = filename => path.basename(filename).replace(path.extname(filename), "");

let articlesInfo = JSON.parse(fs.readFileSync(articlesInfoPath), "utf-8");
const saveArticlesMetadata = () => fsp.writeFile(articlesInfoPath, JSON.stringify(articlesInfo, null, 2));

const getMD5FromStr = str => Promise.resolve(crypto.createHash("md5").update(str).digest("hex"));
const getMD5FromFile = path => new Promise((resolve, reject) => {
  const hash = crypto.createHash("md5");
  const rs = fs.createReadStream(path);
  rs.on("error", reject);
  rs.on("data", chunk => hash.update(chunk));
  rs.on("end", () => resolve(hash.digest("hex")));
});

async function ls(dirPath, options = {}) {
  const ans = (await fsp.readdir(dirPath, { ...options, withFileTypes: true }));
  return options.withFileTypes ? ans : ans.map(file => path.join(file.parentPath, file.name));
}

async function lsFiles(dirPath, options = {}) {
  const ans = (await ls(dirPath, { ...options, withFileTypes: true })).filter(file => file.isFile());
  return options.withFileTypes ? ans : ans.map(file => path.join(file.parentPath, file.name));
}

async function getAllFileMD5(dirPath = outputPath``, ignores = []) {
  if (!fs.existsSync(dirPath)) return {};
  const ans = (await lsFiles(dirPath, { recursive: true, }))
    .filter(filename => !ignores.includes(filename))
    .reduce((ans, filename) => {
      ans[filename] = getMD5FromFile(filename);
      return ans;
    }, {});
  await Promise.all(Object.values(ans));
  for (let filename in ans) ans[filename] = await ans[filename];
  return ans;
}

function diffMD5(old, now) {
  const ans = {};
  for (let filename in now)
    if (old[filename] !== now[filename]) ans[filename] = now[filename];
  return ans;
}

const _tempPath = templatePath``, _outPath = outputPath``, _mdPath = markdownsPath``;
const temp2out = tempPath => tempPath.replace(_tempPath, _outPath);
const out2temp = outPath => outPath.replace(_outPath, _tempPath);
const md2out = mdPath => mdPath.replace(_mdPath, articlesOutputDirPath);
const out2md = outPath => outPath.replace(articlesOutputDirPath, _mdPath);
const keymap = (obj, map) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [map(k), v]));
const md5map2out = md5s => keymap(md5s, temp2out);

const outputMD5s = {
  ...await getAllFileMD5(),
  ...await getAllFileMD5(markdownsPath``),
};

// npm run dev：开发模式，监听文件变化并自动生成静态页面，用于模板/框架等内容的开发，！不更新文章时间
// npm run dev:build：编译所有文章，生成静态页面，用于文章内容非实质上更新时（由于框架开发更新等事件导致的更新），！不更新文章时间
// npm run build：编译所有文章，生成静态页面
// npm run deploy：部署到 GitHub Pages

// check = true：检查文件是否有变化，如果有变化则覆盖（无论是否有变化都重新生成文件）
// check = false：生成文件后直接覆盖
// updateMD5 = true：更新 MD5 值

async function buildDir(srcDir, dstDir, {
  check = true, updateMD5 = true, recursive = true,
  ignores = [], rmIgnores = [],
} = {}) {
  let m, srcs, dsts;
  if (check) {
    m = md5map2out(await getAllFileMD5(srcDir, ignores));
    dsts = Object.keys(diffMD5(outputMD5s, m));
    srcs = dsts.map(out2temp).map(out2md);
  }
  else {
    srcs = (await lsFiles(srcDir, { recursive, })).filter(file => !ignores.includes(file));
    dsts = srcs.map(temp2out).map(md2out);
  }
  await Promise.all(srcs.map((src, i) => fsp.cp(src, dsts[i], { overwrite: true, preserveTimestamps: true })));
  let t1 = new Set(check ? await lsFiles(srcDir, { recursive, }) : srcs);
  let t2 = new Set((await lsFiles(dstDir, { recursive, })).filter(file => !rmIgnores.includes(file)));
  t1 = Array.from(t2).filter(file => !t1.has(out2temp(out2md(file))));
  await Promise.all(t1.map(file => fsp.rm(file, { force: true, recursive: true })));
  if (updateMD5) Object.assign(outputMD5s, check ? m : await getAllFileMD5(dstDir));
}

const buildAllJs = async ({ check = true, updateMD5 = true }) =>
  buildDir(templatePath`/js`, outputPath`/js`, { check, updateMD5, });
const buildAllCss = async ({ check = true, updateMD5 = true }) =>
  buildDir(templatePath`/css`, outputPath`/css`, { check, updateMD5, });

async function handleTextStr({content, attributes = {}}) {
  let matches = [...content.matchAll(/(\/\*\s*)?\{&([^%]*)%\}(\s*\*\/)?/g)];
  for (let match of matches) {
    let p1 = match[2].trim(), replace = "";
    switch (p1) {
      case "LINKS": replace = links; break;
      case "GITHUB_NAME_URL": replace = githubName; break;
      case "MY_GITHUB_URL": replace = myGithubURL; break;
      case "GITHUB_REPO_URL": replace = githubRepoURL; break;
      case "GITHUB_PAGE_URL": replace = githubPageURL; break;
      default:
        if (p1.startsWith("INCLUDE")) {
          let filename = p1.split(" ")[1];
          for (let f of [templatePath, markdownsPath])
            if (await fsp.access(f([filename])).then(() => true).catch(() => false)) {
              filename = f([filename]);
              break;
            }
          let includeContent = await fsp.readFile(filename, "utf-8");
          if (path.extname(filename) === ".md") {
            let md = fm(includeContent);
            includeContent = marked.parse(await handleTextStr({
              content: md.body,
              attributes: {
                filenameWithoutExt: filenameWithoutExt(filename),
                ...attributes,
                ...md.attributes,
              },
            }));
          }
          else includeContent = await handleTextStr({
            content: includeContent,
            attributes: {
              filenameWithoutExt: filenameWithoutExt(filename),
              ...attributes,
            },
          });
          replace = includeContent;
        }
        else if (p1.startsWith("ATTR")) {
          let key = p1.split(" ")[1];
          // 将 a.b.c\.d.e 的 key 转换为 attributes[a][b][c.d][e]
          let value = key.split(/(?<=[^\\])\./).reduce((v, k) => {
            v = v?.[k.replace("\\.", ".")];
            return v;
          }, attributes);
          replace = value;
        }
    }
    content = content.replace(match[0], () => replace);
  }
  return content;
}
async function handleTextFile(src, { attributes = {}, } = {}) {
  let content = await fsp.readFile(src, "utf-8");
  return handleTextStr({
    content,
    attributes: {
      filenameWithoutExt: filenameWithoutExt(src),
      ...attributes,
    },
  });
}
async function buildHtml(src, { dst = src, check = true, updateMD5 = true, map = s => s } = {}) {
  dst = outputPath([dst]);
  let content = await map(await handleTextFile(templatePath([src])));
  if (!check || content !== await fsp.readFile(dst, "utf-8").catch(() => ""))
    await fsp.writeFile(dst, content);
  if (updateMD5) outputMD5s[dst] = await getMD5FromStr(content);
}
async function buildIndexHtml({ check = true, updateMD5 = true } = {}) {
  return buildHtml("/index.html", { check, updateMD5, map: async content => {
    let indexPageContentsItems = [];
    for (let articleTitle in articlesInfo) {
      let info = articlesInfo[articleTitle];
      // {title: "string", time: "ISO 8601", tags: ["string",...], abstract: "string"}
      indexPageContentsItems.push({
        title: articleTitle,
        time: info.time.Post,
        tags: info.tags,
        abstract: info.abstract
      });
    }
    indexPageContentsItems.sort((a, b) => (new Date(b.time)) - (new Date(a.time)));
    content = content.replace("/*contentsItems*/", indexPageContentsItems.map(i => {
      i.tags = i.tags.map(t => t.replace(/.*:/g, "")).sort();
      return JSON.stringify(i);
    }).join(", "));
    return content;
  }, });
}
async function buildTagsHtml({ check = true, updateMD5 = true } = {}) {
  return buildHtml("/tags.html", { check, updateMD5, map: async content => {
    let tags_title = {};
    for (let articleTitle in articlesInfo) {
      let info = articlesInfo[articleTitle];
      info.tags.forEach(tag => {
        if (tags_title[tag])
          tags_title[tag].push(articleTitle);
        else tags_title[tag] = [articleTitle];
      });
    }
    content = content.replace(/\{\s*\/\*tags-title\*\/\s*\}/g, JSON.stringify(tags_title));
    return content;
  }, });
}
async function buildAllHtml({ check = true, updateMD5 = true } = {}) {
  await buildIndexHtml({ check, updateMD5 });
  await buildTagsHtml({ check, updateMD5 });
  await buildHtml("/about.html", { check, updateMD5 });
}

// 这个check会检查整个md文件的md5，以及articleInfo.json的md5。
// articleInfo.json的md5变了，表示文章内容变了
// md文件的md5变了，表示文章内容&/mate变了，没法单独检测mate是否变了，只能重新生成
// updateMD5会更新整个md文件的md5，以及articleInfo.json的md5
async function buildArticle(articleTitle, { check = true, updateMD5 = true, updateMtime = true } = {}) {
  const articleDirPath = markdownsPath([articleTitle]);
  let files = await lsFiles(articleDirPath, { recursive: false, });
  const readmePath = path.join(articleDirPath, "README.md");
  if (!files.includes(readmePath)) {
    console.error(`miss ${readmePath}, will remove it from articlesInfo and outputDir`);
    delete articlesInfo[articleTitle];
    await fsp.rm(articlesOutputDirPath([articleTitle]), { force: true, recursive: true });
    await saveArticlesMetadata();
    return;
  }
  let mateChanged = true, contentChanged = true,
    fileContent = await fsp.readFile(readmePath, "utf-8"),
    md = fm(fileContent),
    fileMd5 = await getMD5FromStr(fileContent),
    articleMd5 = await getMD5FromStr(md.body);
  if (check) {
    if (outputMD5s[readmePath] === fileMd5) mateChanged = contentChanged = false;
    else {
      mateChanged = true;
      contentChanged = outputMD5s[readmePath] !== articleMd5;
    }
    if (!mateChanged && !contentChanged)
      return buildDir(articleDirPath, path.join(articlesOutputDirPath, articleTitle), {
        check, updateMD5, ignores: [readmePath],
        rmIgnores: [path.join(articlesOutputDirPath, articleTitle, articleTitle + ".html")],
      });
  }
  const nowTime = date2iso();
  if (articlesInfo[articleTitle]) {
    articlesInfo[articleTitle].tags = md.attributes.tags || ["未分类"];
    if (articlesInfo[articleTitle].abstract !== md.attributes.abstract)
      articlesInfo[articleTitle].abstract = md.attributes.abstract;
    if (updateMtime) articlesInfo[articleTitle].time.Update = nowTime;
    if (updateMD5) {
      articlesInfo[articleTitle].md5 = articleMd5;
      outputMD5s[readmePath] = fileMd5;
    }
  }
  else articlesInfo[articleTitle] = {
    time: {
      Post: nowTime,
      Update: nowTime,
    },
    md5: articleMd5,
    tags: md.attributes.tags || ["未分类"],
    abstract: md.attributes.abstract || "",
  };
  md.body = marked.parse(await handleTextStr({
    content: md.body,
    attributes: {
      filenameWithoutExt: articleTitle,
      ...md.attributes,
    },
  }));
  console.log(articleTitle)
  articlesInfo[articleTitle].abstract = md.attributes.abstract
    ? md.attributes.abstract
    : md.body.replace(/.*<\/h\d>\n/g, "").trim().replace(/<[^>]+>/g,"").substring(0, 101);
  const output = await handleTextFile(templatePath`/articles/articleTitle/article.html`, {
    attributes: {
      ...md.attributes,
      ...articlesInfo[articleTitle],
      "tags": articlesInfo[articleTitle].tags.map(t => `<a href="/tags.html#tag=${t}"><code>${t}</code></a>`).join("&#09;"),
      "markdowns.content": md.body,
      filenameWithoutExt: articleTitle,
    },
  });
  const ps = [
    saveArticlesMetadata(),
    buildDir(articleDirPath, path.join(articlesOutputDirPath, articleTitle), {
      check, updateMD5, ignores: [readmePath],
      rmIgnores: [path.join(articlesOutputDirPath, articleTitle, articleTitle + ".html")],
    }),
  ];
  if (contentChanged) ps.push(fsp.writeFile(
    path.join(articlesOutputDirPath, articleTitle, articleTitle + ".html"),
    output
  ));
  if (mateChanged) ps.push(
    buildIndexHtml({ check, updateMD5 }),
    buildTagsHtml({ check, updateMD5 }),
  );
  await Promise.all(ps);
}

buildArticle("第一篇Blogger", { check: false, updateMtime: false });
