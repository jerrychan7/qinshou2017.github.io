
function getThemeColorFromCss(sss = document.styleSheets) {
    for (var i = 0; i < sss.length; ++i) {
        var ss = sss[i], cr = ss.cssRules;
        if (!cr) continue;
        for (var j = 0; j < cr.length; ++j) {
            var csr = cr[j];
            if ("href" in csr) {
                getThemeColor([csr.styleSheet]);
                continue;
            }
            var st = csr.selectorText;
            if (st?.indexOf("meta-theme-color") > -1) {
                let color = csr.style.color;
                if (color.startsWith("var")) {
                    console.log(color);
                    color = getComputedStyle(document.documentElement).getPropertyValue(color.replace(/var\(\s*(\S+)\s*\)/, "$1"));
                }
                return color;
            }
        }
    }
}

function updateMetaThemeColor(color = getThemeColorFromCss()) {
    const meta = document.querySelector("meta[name=\"theme-color\"]");
    if (meta) meta.content = color;
    window.cookie.set("themeColor", color);
}

function retheme(theme) {
    const allTheme = ("/*allTheme*/").indexOf("/*") != -1
        ? ("/*allTheme*/").split(",")
        : ("default,darktheme").split(",");
    let currentTheme = window.cookie.get("theme", "default");
    let nextTheme = theme || allTheme[(allTheme.indexOf(currentTheme) + 1) % allTheme.length];
    window.cookie.set("theme", nextTheme);
    const link = document.querySelector("#theme");
    link.onload = () => updateMetaThemeColor();
    link.href = `/css/theme/${nextTheme}.css`;
}

window.addEventListener("load", () => {
    // image
    // todo: resize
    var imgs = document.getElementsByTagName("img");
    for (var i = 0; i < imgs.length; ++i) {
        var img = imgs[i],
            p = img.parentElement;
        if (img.width <= p.clientWidth)
            continue;
        if (img.width <= p.clientWidth + 100) {
            img.style.width = "100%";
        }
        else {
            var div = document.createElement("div");
            div.style.overflow = "auto";
            div.innerHTML = img.outerHTML;
            p.insertBefore(div, img);
            p.removeChild(img);
        }
    }

    // hyperlink
    var links = document.getElementsByTagName("a");
    for (var i = 0; i < links.length; ++i) {
        var a = links[i],
            src = a.href;
        if (src.length === 0) continue;
        if (("./#?").indexOf(src[0]) > -1)
            continue;
        if (src.indexOf(document.location.host) > -1)
            continue;
        if (src.match(/^javascript/i))
            continue;
        a.target = "_blank";
    }
});
