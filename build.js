
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
        
        console.log(articleName);
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

buildArticlesBank();
