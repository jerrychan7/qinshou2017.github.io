
# 目录结构

所有的文本将由utf-8编码。未来若出现编码问题，可以使用`iconv-lite`模块解决。

```text
+-- articles/
|   `-- articlesName/
|       +-- articleName.html    # 文章内容 自动生成
|       `-- [Other Files]
+-- markdowns/
|   +-- articlesName/
|   |   +-- articleName.md      # 文章内容 运行build.js后将变为html
|   |   `-- [Other Files]
|   +-- about.md                # about界面内容 将会翻译成/about.html
|   `-- articleInfo.json        # 文章们的信息
+-- css/                        # 网站将使用的样式们
+-- js/                         # 网站将使用的脚本们
+-- template/                   # 网站模板
|   +-- articles/               # 单篇文章的模板
|   +-- css/                    # 在build时将copy到/下
|   +-- js/                     # 同上
|   `-- [Other Files]
+-- about.html                  # 网站的about me页面
+-- build.js                    # 将文章库里的md转成html
+-- DEV.md                      # 开发说明文档
+-- index.html                  # 博客入口
+-- package.json                # nodejs所需模块
+-- package-lock.json           # 貌似因为版权？需要带上就是了
+-- README.html                 # 暂时空白
+-- server.js                   # 本机测试时使用服务端
`-- tags.html                   # 文章标签 在build时自动生成
```

# 配置文件

`/articlesBank/articleInfo.json`  
必须要有，不然build将失败。不在该json中的文章将被视为第一次上传。

```JSON
{
    "articleName": {
        // 记录时间戳 遵循ISO 8601
        "time": {
            "Post": "2019-08-13T03:23+08:00",       // 上传时间 由文章第一次build时生成
            "Update": "2019-08-13T03:23+08:00"      // 最后修改时间
        },
        "md5": "D36AA912A39FA11351DBE9CD90EFDA7D",  // 文章本身内容的md5，用来自动更新最后修改时间的
        "tags": ["杂记"]  // tags
    }
}
```

文章

* 从`/articlesBank/`自动生成到`/articles/`中。
* 文章的第一行要由JSON打头（`{`），这个JSON字符串更新不会影响文章的最后修改时间，里面放入文章的：
  * 文章的`tags`，若无该字段，则会归类为“未分类”；
  * 文章的`abstract`，若无该字段或该字段为空，则在build时会获取文章的前100个字作为摘要。

语法高亮选择了prismjs，下载时的选项：  
[https://prismjs.com/download.html#themes=prism-okaidia&languages=markup+css+clike+javascript+c+cpp+css-extras+glsl+json+latex+markup-templating+php+sql&plugins=line-highlight+line-numbers+autolinker+file-highlight+highlight-keywords+remove-initial-line-feed+inline-color+previewers+autoloader+keep-markup+command-line+data-uri-highlight+toolbar+copy-to-clipboard+filter-highlight-all]

数学公式显示使用了katex。

# 运行

`node build`进行构建。

`node build rebuild`强制全部重新构建。这个不会更新文章的上传和最后修改时间，因为一般强制全部构建都是由于模板的改变。

`node build sync`同步构建。**未经测试，运行结果未知！**

`node server`运行本地服务器。虽然浏览器控台有警告，但随它去吧，没看见啦啦啦~
