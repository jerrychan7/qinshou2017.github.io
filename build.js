
import path from "path";
import fs from "fs";
import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import markedKatex from "./marked-katex-ext.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDirPath = __dirname;
const templateDirPath = path.join(rootDirPath, "/template");
const articlesBankDirPath = path.join(rootDirPath, "/markdowns");
const articlesInfoPath = path.join(articlesBankDirPath, "/articleInfo.json");
const articlesOutputDirPath = path.join(rootDirPath, "/articles");

if (!fs.existsSync(articlesInfoPath))
  throw "miss config file: " + articlesInfoPath;

const githubName = "jerrychan7";
const githubPage = `${githubName}.github.io`;
const myGithubURL = `https://github.com/${githubName}`;
const githubRepoURL = `${myGithubURL}/${githubPage}`;
const githubPageURL = `https://${githubPage}`;

const replaceGithubVar = str =>
  str.replace(/{&GITHUB_NAME_URL%}/g, githubName)
  .replace(/{&MY_GITHUB_URL%}/g, myGithubURL)
  .replace(/{&GITHUB_REPO_URL%}/g, githubRepoURL)
  .replace(/{&GITHUB_PAGE_URL%}/g, githubPageURL);

const links = Object.entries({
  "kokic": "https://kokic.github.io/",
  // "兔子": "https://www.rabbittu.com/",
  "兔子": "https://blog.awa.moe/",
}).map(([name, href]) => `<li><a href="${href}">${name}</a></li>`)
.join("\n            ");

marked.use({
  gfm: true,
}, gfmHeadingId(), markedKatex());

function mkdir(dirPath) {
  if (!fs.existsSync(dirPath))
    fs.mkdirSync(dirPath, { recursive: true, });
}

function rmdir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  fs.rmSync(dirPath, { recursive: true, force: true, });
}

function copyFile(src, dst) {
  fs.cpSync(src, dst);
}

function copyDir(srcDir, aimDir) {
  fs.cpSync(srcDir, aimDir, { recursive: true, });
}

const getMD5 = str => crypto.createHash("md5").update(str).digest("hex");

let articlesInfo = JSON.parse(fs.readFileSync(articlesInfoPath), "utf-8");
const saveArticlesMetadata = () => fs.writeFileSync(articlesInfoPath, JSON.stringify(articlesInfo, null, 2));

// buildDiff

function buildSingleArticle(articleDirPath, rebuild = false, { notUpdateTime = false } = {}) {
  var files = fs.readdirSync(articleDirPath);
  if (files.length === 0) return;
  const getFullPath = filename => path.join(articleDirPath, filename);
  var articleName = articleDirPath.split(/[/\\]/g);
  if (articleName[articleName.length - 1])
    articleName = articleName.pop();
  else articleName = articleName[articleName.length - 2];
  const outputDirPath = path.join(articlesOutputDirPath, articleName);
  
  if (files.includes(articleName + ".md") !== -1) {
    let article = fs.readFileSync(getFullPath(articleName + ".md"), "utf-8"),
      articleInfo = {};
    if (article[0] !== '{') return;
    else {
      let c = 0, i = 0;
      do {
        if (article.charAt(i) == '{') ++c;
        else if (article.charAt(i) == '}') --c;
        ++i;
      } while(c);
      articleInfo = JSON.parse(article.substring(0, i));
      article = article.substring(i);
    }
    const nowTime = (new Date()).toJSON(), md5 = getMD5(article);
    if (articlesInfo[articleName]) {
      articlesInfo[articleName].tags = articleInfo.tags? articleInfo.tags: ["未分类"];
      if (articleInfo.abstract && articlesInfo[articleName].abstract != articleInfo.abstract)
        articlesInfo[articleName].abstract = articleInfo.abstract;
      if (notUpdateTime === false && articlesInfo[articleName].md5 !== md5)
        articlesInfo[articleName].time.Update = nowTime;
      else if (rebuild === false)
        return;
      articlesInfo[articleName].md5 = md5;
    }
    else {
      articlesInfo[articleName] = {
        time: {
          Post: nowTime,
          Update: nowTime
        },
        md5,
        tags: articleInfo.tags? articleInfo.tags: ["未分类"],
        abstract: ""
      };
    }
    rmdir(outputDirPath);
    mkdir(outputDirPath);
    let marked_article = marked.parse(replaceGithubVar(article)),
      out = fs.readFileSync(path.join(templateDirPath, "/articles/articleTitle/article.html"), "utf-8")
        .replace("{title}", () => articleName)
        .replace(/\{\s*\/\*time\*\/\s*\}/g, () => JSON.stringify(articlesInfo[articleName].time))
        .replace("{tags}", () => articleInfo.tags.map(t => `<a href="/tags.html#tag=${t}"><code>${t}</code></a>`).join("&#09;"))
        .replace("{articleContent}", () => marked_article)
        .replace("{links}", () => links);
    fs.writeFileSync(path.join(outputDirPath, articleName + ".html"), out, { flag: "w" });
    articlesInfo[articleName].abstract = articleInfo.abstract
      ? articleInfo.abstract
      : marked_article.replace(/.*<\/h\d>\n/g, "").trim().replace(/<[^>]+>/g,"").substring(0,101);
  }

  files.forEach(filename => {
    if (filename.replace(path.extname(filename), "") != articleName) {
      copyFile(getFullPath(filename), path.join(outputDirPath, filename));
    }
  });
  console.log("built " + articleName);
}

// Refresh pages other than articles
function refreshOtherFiles() {
  let infos = [], indexPageContentsItems = [],
    tags_title = {};
  for (let articleTitle in articlesInfo) {
    let info = articlesInfo[articleTitle];
    infos.push({
      title: articleTitle,
      time: info.time.Post,
      tags: info.tags,
      abstract: info.abstract
    });
  }
  infos.sort((a, b) => (new Date(b.time)) - (new Date(a.time)));
  infos.forEach(info => {
    // {title: "string", time: "ISO 8601", tags: ["string",...], abstract: "string"}
    indexPageContentsItems.push(JSON.stringify(info));
    info.tags.forEach(tag => {
      if (tags_title[tag])
        tags_title[tag].push(info.title);
      else tags_title[tag] = [info.title];
    });
  });

  fs.writeFileSync(path.join(rootDirPath, "/index.html"),
    fs.readFileSync(path.join(templateDirPath, "/index.html"), "utf8")
    .replace("/*contentsItems*/", indexPageContentsItems.map(i => {
      let o = JSON.parse(i);
      o.tags = o.tags.map(t => t.replace(/.*:/g, "")).sort();
      return JSON.stringify(o);
    }).join(", "))
    .replace("{links}", links));

  fs.writeFileSync(path.join(rootDirPath, "/tags.html"),
    fs.readFileSync(path.join(templateDirPath, "/tags.html"), "utf8")
    .replace(/\{\s*\/\*tags-title\*\/\s*\}/g, JSON.stringify(tags_title))
    .replace("{links}", links));

  fs.writeFileSync(path.join(rootDirPath, "/about.html"),
    fs.readFileSync(path.join(templateDirPath, "/about.html"), "utf8")
    .replace("{about.md}", marked(replaceGithubVar(fs.readFileSync(path.join(articlesBankDirPath, "/about.md"), "utf8"))))
    .replace("{links}", links));

  rmdir(path.join(rootDirPath, "/css"));
  copyDir(path.join(templateDirPath, "/css"), path.join(rootDirPath, "/css"));
  rmdir(path.join(rootDirPath, "/js"));
  copyDir(path.join(templateDirPath, "/js"), path.join(rootDirPath, "/js"));

  fs.writeFileSync(path.join(rootDirPath, "/js/index.js"),
    fs.readFileSync(path.join(templateDirPath, "/js/index.js"), "utf8")
    // .replace(/\/\*allTheme\*\//g,
    //   fs.readdirSync(path.join(templateDirPath, "/css/theme/"))
    //   .reduce((allTheme, themeName) => {
    //     if (themeName !== "default.css"
    //       && fs.statSync(path.join(templateDirPath, "/css/theme/", themeName)).isFile())
    //       allTheme.push(themeName.replace(path.extname(themeName), ""));
    //     return allTheme;
    //   }, ["default"]).join(","))
  );

  saveArticlesMetadata();
}

function buildArticlesBank(rebuild = false, { notUpdateTime = false } = {}) {
  fs.readdirSync(articlesBankDirPath).forEach(articleDirName => {
    if (articleDirName.endsWith(".tmp")) return;
    var filedir = path.join(articlesBankDirPath, articleDirName),
      stats = fs.statSync(filedir);
    if (stats.isDirectory())
      buildSingleArticle(filedir, rebuild, { notUpdateTime });
  });
  refreshOtherFiles();
}

function buildArticlesSync({
  autoNotUpdateTime = false,
  notUpdateTime_article = autoNotUpdateTime,
  notUpdateTime_template = !autoNotUpdateTime,
} = {}) {
  const fileChangeFlag = {};
  const refreshFlag = (dirPath, fn, delay = 800) => {
    if (dirPath in fileChangeFlag)
      clearTimeout(fileChangeFlag[dirPath]);
    fileChangeFlag[dirPath] = setTimeout(() => {
      fn();
      delete fileChangeFlag[dirPath];
    }, delay);
  };
  const bankWatcher = fs.watch(articlesBankDirPath, {recursive: true}, (e, fileName) => {
      const filePath = path.join(articlesBankDirPath, fileName);
      // rename / delete
      if (filePath == articlesInfoPath || !fs.existsSync(filePath))
        return;
      const stats = fs.statSync(filePath);
      if (!(stats.isFile() && stats.size)) return;
      const dirPath = path.dirname(filePath);
      refreshFlag(dirPath, () => {
        console.log("rebuild article: " + fileName);
        if (path.dirname(filePath) != articlesBankDirPath)
          buildSingleArticle(dirPath, true, { notUpdateTime: notUpdateTime_article });
        refreshOtherFiles();
      });
    }),
    templateWatch = fs.watch(templateDirPath, {recursive: true}, (e, fileName) => {
      if (fileName === null) return;
      const filePath = path.join(templateDirPath, fileName);
      // rename / delete
      if (!fs.existsSync(filePath))
        return;
      const stats = fs.statSync(filePath);
      if (!(stats.isFile() && stats.size)) return;
      refreshFlag(templateDirPath, () => {
        console.log("rebuild template: " + fileName);
        if (fileName.includes("article.html"))
          buildArticlesBank(true, { notUpdateTime: notUpdateTime_template });
        else refreshOtherFiles();
      });
    });
  console.log("start sync build, enter 'exit'/'e'/'quit'/'q'/'close' to close the program.");
  const rl = createInterface({input: process.stdin});
  rl.on("line", async line => {
    switch (line.trim().toLowerCase()) {
    case "exit": case "e": case "quit": case "q": case "close":
      bankWatcher.close();
      templateWatch.close();
      process.exitCode = 0;
      rl.close();
      break;
    }
  });
}

var cliArgv = process.argv.splice(2);
switch (cliArgv[0]) {
  case "sync":
    buildArticlesSync({
      ...(cliArgv.includes("autoNotUpdateTime")? { autoNotUpdateTime: true }: {}),
      ...(cliArgv.includes("notUpdateTime_article")? { notUpdateTime_article: true }: {}),
      ...(cliArgv.includes("notUpdateTime_template")? { notUpdateTime_template: true }: {}),
    });
    break;
  case "rebuild":
    buildArticlesBank(true, { notUpdateTime: cliArgv.includes("notUpdateTime") });
    break;
  default:
    buildArticlesBank();
    break;
}
