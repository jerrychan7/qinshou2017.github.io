
const path = require("path"),
      fs = require("fs"),
      marked = require("marked"),
      crypto = require("crypto");

const rootDirPath = __dirname,
      templateDirPath = path.join(rootDirPath, "/template"),
      articlesBankDirPath = path.join(rootDirPath, "/articlesBank"),
      articlesInfoPath = path.join(articlesBankDirPath, "/articleInfo.json"),
      articlesOutputDirPath = path.join(rootDirPath, "/articles"),
      nowTime = (new Date()).toJSON();

const links = ([
    {name: "kokic", href: "https://kokic.github.io/"},
    {name: "兔子", href: "https://www.rabbittu.com/"}
]).map(({name, href}) => `<li><a href="${href}">${name}</a></li>`).join("\n               ");

marked.setOptions({
    rederer: new marked.Renderer(),
    gfm: true,
});

function mkdir(dirPath) {
    var dir = "", dps = dirPath.split(/[/\\]/g);
    if (path.isAbsolute(dirPath)) dir = dps[0];
    for (let i = dir.length? 1: 0; i < dps.length; ++i) {
        dir = path.join(dir, dps[i]);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    }
}

function rmdir(dirPath){
    if(fs.existsSync(dirPath)){
        fs.readdirSync(dirPath).forEach((file, index) => {
            let curPath = path.join(dirPath, file);
            if(fs.statSync(curPath).isDirectory())
                rmdir(curPath);
            else
                fs.unlinkSync(curPath);
        });
        fs.rmdirSync(dirPath);
    }
}

function copyFile(src, dst) {
    mkdir(path.dirname(src));
//    fs.createReadStream(src).pipe(fs.createWriteStream(dst));
    fs.copyFileSync(src, dst);
}

function copyDir(srcDir, aimDir) {
    if (!fs.existsSync(aimDir)) mkdir(aimDir);
    fs.readdirSync(srcDir).forEach(filename => {
        var filedir = path.join(srcDir, filename),
            stats = fs.statSync(filedir),
            ad = path.join(aimDir, filename);
        if (stats.isDirectory())
            return copyDir(filedir, ad);
        if (!stats.isFile()) return;
//        fs.createReadStream(filedir).pipe(fs.createWriteStream(ad));
        fs.copyFileSync(filedir, ad);
    });
}

function getMD5(fileContent) {
    return crypto.createHash("md5").update(fileContent).digest("hex");
}

if (!fs.existsSync(articlesInfoPath))
    throw "miss config file: " + articlesInfoPath;

let articlesInfo = JSON.parse(fs.readFileSync(articlesInfoPath), "utf-8");

// buildDiff

function buildSingleArticle(articleDirPath, rebuild = false) {
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
        let md5 = getMD5(article);
        if (articlesInfo[articleName]) {
            articlesInfo[articleName].tags = articleInfo.tags? articleInfo.tags: ["未分类"];
            if (articleInfo.abstract && articlesInfo[articleName].abstract != articleInfo.abstract)
                articlesInfo[articleName].abstract = articleInfo.abstract;
            if (rebuild === false && articlesInfo[articleName].md5 === md5)
                return;
            articlesInfo[articleName].md5 = md5;
            if (rebuild === false) {
                articlesInfo[articleName].time.Update = nowTime;
            }
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
        let marked_article = marked(article),
            out = fs.readFileSync(path.join(templateDirPath, "/articles/articleTitle/article.html"), "utf-8")
                    .replace("{title}", articleName)
                    .replace("{/*time*/}", JSON.stringify(articlesInfo[articleName].time))
                    .replace("{tags}", articleInfo.tags.map(t => `<a href="/tags.html#tag=${t}"><code>${t}</code></a>`).join("&#09;"))
                    .replace("{articleContent}", marked_article)
                    .replace("{links}", links);
        fs.writeFileSync(path.join(outputDirPath, articleName + ".html"), out);
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
            .replace("{/*tags-title*/}", JSON.stringify(tags_title))
            .replace("{links}", links));

    fs.writeFileSync(path.join(rootDirPath, "/about.html"),
        fs.readFileSync(path.join(templateDirPath, "/about.html"), "utf8")
            .replace("{about.md}",
                marked(fs.readFileSync(path.join(articlesBankDirPath, "/about.md"), "utf8")))
            .replace("{links}", links));

    rmdir(path.join(rootDirPath, "/css"));
    copyDir(path.join(templateDirPath, "/css"), path.join(rootDirPath, "/css"));
    rmdir(path.join(rootDirPath, "/js"));
    copyDir(path.join(templateDirPath, "/js"), path.join(rootDirPath, "/js"));

    fs.writeFileSync(path.join(rootDirPath, "/js/index.js"),
        fs.readFileSync(path.join(templateDirPath, "/js/index.js"), "utf8")
            .replace(/\/\*allTheme\*\//g,
                     fs.readdirSync(path.join(templateDirPath, "/css/theme/")).reduce((allTheme, themeName) => {
        if (themeName !== "default.css"
            && fs.statSync(path.join(templateDirPath, "/css/theme/", themeName)).isFile())
            allTheme.push(themeName.replace(path.extname(themeName), ""));
        return allTheme;
    }, ["default"]).join(",")));

    fs.writeFileSync(articlesInfoPath, JSON.stringify(articlesInfo, null, 4));
}

function buildArticlesBank(rebuild = false) {
    fs.readdirSync(articlesBankDirPath).forEach(articleDirName => {
        var filedir = path.join(articlesBankDirPath, articleDirName),
            stats = fs.statSync(filedir);
        if (stats.isDirectory())
            buildSingleArticle(filedir, rebuild);
    });
    refreshOtherFiles();
}

function buildArticlesSync() {
    let fileChangeFlag = {};
    const bankWatcher = fs.watch(articlesBankDirPath, {recursive: true}, (e, fileName) => {
            var filePath = path.join(articlesBankDirPath, fileName);
            // rename / delete
            if (filePath == articlesInfoPath || !fs.existsSync(filePath))
                return;
            var stats = fs.statSync(filePath);
            if (stats.isFile() && stats.size) {
                var dirPath = path.dirname(filePath);
                if (!fileChangeFlag[dirPath]) {
                    fileChangeFlag[dirPath] = true;
                    setTimeout(function() {
                        console.log("rebuild article: " + fileName);
                        if (path.dirname(filePath) != articlesBankDirPath)
                            buildSingleArticle(dirPath, true);
                        refreshOtherFiles();
                        fileChangeFlag[dirPath] = false;
                        delete fileChangeFlag[dirPath];
                    }, 800);
                }
            }
        }),
        templateWatch = fs.watch(templateDirPath, {recursive: true}, (e, fileName) => {
            if (fileName === null) return;
            let filePath = path.join(templateDirPath, fileName);
            // rename / delete
            if (!fs.existsSync(filePath))
                return;
            var stats = fs.statSync(filePath);
            if (stats.isFile() && stats.size) {
                if (!fileChangeFlag[templateDirPath]) {
                    fileChangeFlag[templateDirPath] = true;
                    setTimeout(function() {
                        console.log("rebuild template: " + fileName);
                        if (fileName.includes("article.html"))
                            buildArticlesBank(true);
                        refreshOtherFiles();
                        fileChangeFlag[templateDirPath] = false;
                        delete fileChangeFlag[templateDirPath];
                    }, 800);
                }
            }
        });
    console.log("start sync build, enter 'exit' to close the program.");
    const rl = require("readline").createInterface({input: process.stdin});
    rl.on("line", async line => {
        if (line.trim() === "exit") {
            bankWatcher.close();
            templateWatch.close();
            process.exitCode = 0;
            rl.close();
        }
    });
}

var cliArgv = process.argv.splice(2);
switch (cliArgv[0]) {
    case "sync":
        buildArticlesSync();
        break;
    case "rebuild":
        buildArticlesBank(true);
        break;
    default:
        buildArticlesBank();
        break;
}
