
const path = require("path"),
      fs = require("fs"),
      marked = require("marked");

const rootDirPath = __dirname,
      templateDirPath = path.join(rootDirPath, "/template"),
      articlesBankDirPath = path.join(rootDirPath, "/articlesBank"),
      articlesOutputDirPath = path.join(rootDirPath, "/articles");

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
    mkdir(aimDir);
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

let articlesInfo = {};

// rebuild
// buildDiff

function buildSingleArticle(articleDirPath) {
    var files = fs.readdirSync(articleDirPath);
    const getFullPath = filename => path.join(articleDirPath, filename);
    var articleName = articleDirPath.split(/[/\\]/g);
    if (articleName[articleName.length - 1])
        articleName = articleName.pop();
    else articleName = articleName[articleName.length - 2];
    const outputDirPath = path.join(articlesOutputDirPath, articleName);
    rmdir(outputDirPath);
    mkdir(outputDirPath);
    
    files.forEach(filename => {
        if (filename.replace(path.extname(filename), "") != articleName) {
            copyFile(getFullPath(filename), path.join(outputDirPath, filename));
            return;
        }
        let article = fs.readFileSync(getFullPath(filename), "utf-8"),
            articleInfo = {};
        if (article.charAt(0) == '{') {
            let c = 0, i = 0;
            do {
                if (article.charAt(i) == '{') ++c;
                else if (article.charAt(i) == '}') --c;
                ++i;
            } while(c);
            articleInfo = JSON.parse(article.substring(0, i));
            article = article.substring(i);
        }
        let marked_article = marked(article),
            formatTime = s => s.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/g, "$1-$2-$3 $4:$5"),
            out = fs.readFileSync(path.join(templateDirPath, "/articles/articleTitle/article.html"), "utf-8")
                    .replace("{title}", articleName)
                    .replace("{Post}", formatTime(articleInfo.time.Post))
                    .replace("{Update}", formatTime(articleInfo.time.Update))
                    .replace("{tags}", articleInfo.tags.map(t => `<a href="/tags.html#tag=${t}"><code>${t}</code></a>`).join("&#09;"))
                    .replace("{articleContent}", marked_article)
                    .replace("{links}", links);
        fs.writeFileSync(path.join(outputDirPath, articleName + ".html"), out);
        
        articlesInfo[articleName] = articleInfo;
        articlesInfo[articleName].abstract = articleInfo.abstract
            ? articleInfo.abstract
            : marked_article.replace(/.*<\/h\d>\n/, "").replace(/\n.*/g, "").replace(/<[^>]+>/g,"").substring(0,101);
        articlesInfo[articleName].tags = articleInfo.tags? articleInfo.tags: ["未分类"];

        console.log("built " + articleName);
    });
}

function buildArticlesBank() {
    fs.readdirSync(articlesBankDirPath).forEach(articleDirName => {
        var filedir = path.join(articlesBankDirPath, articleDirName),
            stats = fs.statSync(filedir);
        if (stats.isDirectory())
            buildSingleArticle(filedir);
    });
    let infos = [], indexPageContentsItems = "",
        tags_title = {};
    for (let articleTitle in articlesInfo) {
        let info = articlesInfo[articleTitle];
        info.title = articleTitle;
        infos.push(info);
    }
    infos.sort((a, b) => a.time.Post - b.time.Post);
    infos.forEach(info => {
        // {title: "string", time: "yyyy-MM-dd", tags: ["string",...], abstract: "string"}
        indexPageContentsItems += JSON.stringify({
            title: info.title,
            time: info.time.Post.replace(/(\d{2})(\d{2})(\d{2})\d*/g, "$1-$2-$3"),
            tags: info.tags,
            abstract: info.abstract
        });
        info.tags.forEach(tag => {
            if (tags_title[tag])
                tags_title[tag].push(info.title);
            else tags_title[tag] = [info.title];
        });
    });
    fs.writeFileSync(path.join(rootDirPath, "/index.html"),
        fs.readFileSync(path.join(templateDirPath, "/index.html"), "utf8")
            .replace("/*contentsItems*/", indexPageContentsItems)
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
}

function buildArticlesSync() {
    let fileChangeFlag = {};
    const watcher = fs.watch(articlesBankDirPath, {recursive: true}, (e,fileName) => {
        var filePath = path.join(articlesBankDirPath, fileName);
        // rename / delete
        if (!fs.existsSync(filePath))
            return;
        var stats = fs.statSync(filePath);
        if (stats.isFile() && stats.size) {
            var dirPath = path.dirname(filePath);
            if (!fileChangeFlag[dirPath]) {
                fileChangeFlag[dirPath] = true;
                setTimeout(function() {
                    buildSingleArticle(dirPath);
                    fileChangeFlag[dirPath] = false;
                    delete fileChangeFlag[dirPath];
                }, 800);
            }
        }
    });
    console.log("start sync build, enter 'exit' to close the program.");
    const rl = require("readline").createInterface({input: process.stdin});
    rl.on("line", async line => {
        if (line.trim() === "exit") {
            watcher.close();
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
    default:
        buildArticlesBank();
        break;
}
