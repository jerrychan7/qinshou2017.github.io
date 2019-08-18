
const path = require("path"),
      fs = require("fs"),
      marked = require("marked");

const rootDirPath = __dirname,
      articlesBankDirPath = path.join(rootDirPath, "/articlesBank"),
      articlesOutputDirPath = path.join(rootDirPath, "/articles");

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
                delDir(curPath);
            else
                fs.unlinkSync(curPath);
        });
        fs.rmdirSync(dirPath);
    }
}

function copyFile(src, dst) {
    mkdir(path.dirname(src));
    fs.createReadStream(src).pipe(fs.createWriteStream(dst));
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
        fs.createReadStream(filedir).pipe(fs.createWriteStream(ad));
    });
}

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
        let out = marked(article);
        fs.writeFileSync(path.join(outputDirPath, articleName + ".html"), out);
        
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